import { Router, Request, Response } from 'express';
import { database } from '../database/connection';
import { authenticate, authorize } from '../middleware/authorization';
import { EmailService } from '../services/emailService';
import { getWebSocketService } from '../services/websocketService';

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function generateReservationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await database.query(
    `SELECT COUNT(*) AS cnt FROM equipment_reservations
     WHERE reservation_number LIKE $1`,
    [`RES-${year}-%`],
  );
  const next = parseInt(result.rows[0].cnt, 10) + 1;
  return `RES-${year}-${String(next).padStart(3, '0')}`;
}

function buildConflictQuery(withLock = false): string {
  const lockClause = withLock ? ' FOR UPDATE' : '';
  return `
    SELECT COALESCE(SUM(er.quantity), 0) AS reserved_qty
    FROM equipment_reservations er
    JOIN equipment_types et ON et.id = er.equipment_type_id
    WHERE er.equipment_type_id = $1
      AND er.date = $2
      AND er.status IN ('approved', 'ready', 'in_use')
      AND er.start_time < ($4::time + (et.buffer_minutes || ' minutes')::interval)
      AND er.end_time   > ($3::time - (et.buffer_minutes || ' minutes')::interval)
    ${lockClause}
  `;
}

async function findNextAvailable(
  typeId: string,
  date: string,
  endTime: string,
  quantity: number,
  maxQty: number,
): Promise<string | null> {
  const [h, m] = endTime.split(':').map(Number);
  let slotMinutes = h * 60 + m;
  for (let i = 0; i < 48; i++) {
    slotMinutes += 15;
    if (slotMinutes >= 23 * 60) break;
    const hh = String(Math.floor(slotMinutes / 60)).padStart(2, '0');
    const mm = String(slotMinutes % 60).padStart(2, '0');
    const slotEnd = `${hh}:${String(Math.min(59, (slotMinutes % 60) + 30)).padStart(2, '0')}`;
    const r = await database.query(buildConflictQuery(), [typeId, date, `${hh}:${mm}`, slotEnd]);
    if (parseInt(r.rows[0].reserved_qty, 10) + quantity <= maxQty) {
      return `${hh}:${mm}`;
    }
  }
  return null;
}

function buildICS(reservation: any): string {
  const d = reservation.date instanceof Date
    ? reservation.date.toISOString().split('T')[0].replace(/-/g, '')
    : String(reservation.date).replace(/-/g, '');
  const st = reservation.start_time.replace(':', '').substring(0, 4) + '00';
  const et = reservation.end_time.replace(':', '').substring(0, 4) + '00';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Portal TI//Reserva//PT',
    'BEGIN:VEVENT',
    `DTSTART:${d}T${st}`,
    `DTEND:${d}T${et}`,
    `SUMMARY:Reserva ${reservation.reservation_number} — ${reservation.type_name} × ${reservation.quantity}`,
    `LOCATION:${reservation.location}`,
    `DESCRIPTION:${reservation.purpose}`,
    `UID:${reservation.id}@portal-ti`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

async function logAction(
  reservationId: string,
  action: string,
  performedById: string | null,
  performedByName: string | null,
  notes?: string,
): Promise<void> {
  await database.query(
    `INSERT INTO reservation_logs (reservation_id, action, performed_by_id, performed_by_name, notes)
     VALUES ($1, $2, $3, $4, $5)`,
    [reservationId, action, performedById, performedByName, notes ?? null],
  ).catch(() => undefined);
}

// Creates reservation tables if they don't exist (fallback when migration file wasn't found)
async function ensureReservationSchema(): Promise<void> {
  await database.query(`
    CREATE TABLE IF NOT EXISTS equipment_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      max_quantity INTEGER NOT NULL,
      buffer_minutes INTEGER NOT NULL DEFAULT 30,
      icon VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS equipment_reservations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reservation_number VARCHAR(20) UNIQUE NOT NULL,
      equipment_type_id UUID NOT NULL REFERENCES equipment_types(id),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      location VARCHAR(200) NOT NULL,
      purpose TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'approved'
        CHECK (status IN ('pending','approved','rejected','ready','in_use','returned','no_show','cancelled')),
      recurrence_group_id UUID NULL,
      requester_name VARCHAR(200),
      requester_email VARCHAR(200),
      requester_phone VARCHAR(50),
      access_token UUID UNIQUE,
      internal_user_id UUID REFERENCES internal_users(id),
      approved_by_id UUID REFERENCES internal_users(id),
      approved_at TIMESTAMP,
      rejection_reason TEXT,
      notes TEXT,
      reminder_24h_sent_at TIMESTAMP,
      reminder_1h_sent_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_res_end_after_start CHECK (end_time > start_time),
      CONSTRAINT chk_res_requester CHECK (
        requester_email IS NOT NULL OR internal_user_id IS NOT NULL
      )
    )
  `);
  await database.query(`
    CREATE TABLE IF NOT EXISTS reservation_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reservation_id UUID NOT NULL REFERENCES equipment_reservations(id),
      action VARCHAR(50) NOT NULL,
      performed_by_id UUID REFERENCES internal_users(id),
      performed_by_name VARCHAR(200),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await database.query(`CREATE INDEX IF NOT EXISTS idx_reservations_date ON equipment_reservations(date)`).catch(() => {});
  await database.query(`CREATE INDEX IF NOT EXISTS idx_reservations_type_date ON equipment_reservations(equipment_type_id, date)`).catch(() => {});
  await database.query(`CREATE INDEX IF NOT EXISTS idx_reservations_token ON equipment_reservations(access_token)`).catch(() => {});
  await database.query(`CREATE INDEX IF NOT EXISTS idx_reservations_status ON equipment_reservations(status)`).catch(() => {});
  // Seed default Notebooks type
  await database.query(`
    INSERT INTO equipment_types (name, description, max_quantity, buffer_minutes, icon, is_active)
    SELECT 'Notebooks', 'Notebooks para empréstimo em aulas, treinamentos e eventos', 20, 30, '💻', true
    WHERE NOT EXISTS (SELECT 1 FROM equipment_types WHERE name = 'Notebooks')
  `);
}

// Returns first active type; creates schema automatically if tables don't exist yet
async function getDefaultType(): Promise<{ id: string; name: string; max_quantity: number; buffer_minutes: number } | null> {
  try {
    const r = await database.query(
      'SELECT id, name, max_quantity, buffer_minutes FROM equipment_types WHERE is_active = true ORDER BY name LIMIT 1',
    );
    return r.rows[0] || null;
  } catch (err: any) {
    if (err.code === '42P01') {
      await ensureReservationSchema();
      const r = await database.query(
        'SELECT id, name, max_quantity, buffer_minutes FROM equipment_types WHERE is_active = true ORDER BY name LIMIT 1',
      );
      return r.rows[0] || null;
    }
    throw err;
  }
}

// ─── Rotas estáticas devem vir ANTES de /:id ─────────────────────────────────

// GET /api/reservations/types — público
router.get('/types', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await database.query(
      `SELECT id, name, description, buffer_minutes, icon
       FROM equipment_types WHERE is_active = true ORDER BY name`,
    );
    res.json(result.rows);
  } catch (err: any) {
    if (err.code === '42P01') {
      await ensureReservationSchema();
      const result = await database.query(
        `SELECT id, name, description, buffer_minutes, icon FROM equipment_types WHERE is_active = true ORDER BY name`,
      );
      res.json(result.rows);
      return;
    }
    res.status(500).json({ error: 'Erro ao buscar tipos de equipamento' });
  }
});

// GET /api/reservations/availability — público
router.get('/availability', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type_id, date, start_time, end_time, quantity } = req.query as Record<string, string>;
    if (!date || !start_time || !end_time) {
      res.status(400).json({ error: 'Parâmetros obrigatórios: date, start_time, end_time' });
      return;
    }
    const qty = parseInt(quantity || '1', 10);

    let effectiveTypeId: string;
    let max_quantity: number;
    let buffer_minutes: number;

    if (type_id) {
      const typeResult = await database.query(
        'SELECT id, max_quantity, buffer_minutes FROM equipment_types WHERE id = $1 AND is_active = true',
        [type_id],
      );
      if (!typeResult.rows[0]) { res.status(404).json({ error: 'Tipo não encontrado' }); return; }
      effectiveTypeId = type_id;
      max_quantity = typeResult.rows[0].max_quantity;
      buffer_minutes = typeResult.rows[0].buffer_minutes;
    } else {
      const def = await getDefaultType();
      if (!def) {
        // Table doesn't exist or no types configured — return optimistic response
        res.json({ available: true, remaining: 20, capacity_status: 'available' });
        return;
      }
      effectiveTypeId = def.id;
      max_quantity = def.max_quantity;
      buffer_minutes = def.buffer_minutes;
    }

    const conflictResult = await database.query(buildConflictQuery(), [effectiveTypeId, date, start_time, end_time]);
    const reserved = parseInt(conflictResult.rows[0].reserved_qty, 10);
    const remaining = max_quantity - reserved;
    const available = remaining >= qty;

    if (available) {
      const capacityStatus = remaining / max_quantity > 0.5 ? 'available' : 'partial';
      res.json({ available: true, remaining, capacity_status: capacityStatus });
      return;
    }

    const next_available = await findNextAvailable(effectiveTypeId, date, end_time, qty, max_quantity);
    const reason = reserved < max_quantity ? 'buffer' : 'conflict';
    res.json({ available: false, remaining: Math.max(0, remaining), reason, next_available, buffer_minutes });
  } catch {
    res.status(500).json({ error: 'Erro ao verificar disponibilidade' });
  }
});

// GET /api/reservations/public/:token — público
router.get('/public/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await database.query(
      `SELECT er.*, et.name AS type_name, et.icon AS type_icon
       FROM equipment_reservations er
       JOIN equipment_types et ON et.id = er.equipment_type_id
       WHERE er.access_token = $1`,
      [req.params.token],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      reservation_number: r.reservation_number,
      type_name: r.type_name,
      type_icon: r.type_icon,
      quantity: r.quantity,
      date: r.date,
      start_time: r.start_time,
      end_time: r.end_time,
      location: r.location,
      purpose: r.purpose,
      status: r.status,
      requester_name: r.requester_name,
      rejection_reason: r.rejection_reason,
      created_at: r.created_at,
    });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar reserva' });
  }
});

// GET /api/reservations/public/:token/ics — público
router.get('/public/:token/ics', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await database.query(
      `SELECT er.*, et.name AS type_name
       FROM equipment_reservations er
       JOIN equipment_types et ON et.id = er.equipment_type_id
       WHERE er.access_token = $1`,
      [req.params.token],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }
    const r = result.rows[0];
    const ics = buildICS(r);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reserva-${r.reservation_number}.ics"`);
    res.send(ics);
  } catch {
    res.status(500).json({ error: 'Erro ao gerar ICS' });
  }
});

// GET /api/reservations/my — autenticado
router.get('/my', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await database.query(
      `SELECT er.*, et.name AS type_name, et.icon AS type_icon
       FROM equipment_reservations er
       JOIN equipment_types et ON et.id = er.equipment_type_id
       WHERE er.internal_user_id = $1
       ORDER BY er.date DESC, er.start_time DESC`,
      [req.user!.id],
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar reservas' });
  }
});

// GET /api/reservations/active-now — TI/Admin (ANTES de /:id)
router.get('/active-now', authenticate, authorize('reservations:manage'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await database.query(
      `SELECT er.quantity, er.end_time, er.location, et.name AS type_name
       FROM equipment_reservations er
       JOIN equipment_types et ON et.id = er.equipment_type_id
       WHERE er.status IN ('ready', 'in_use')
         AND er.date = CURRENT_DATE
         AND er.start_time <= CURRENT_TIME
         AND er.end_time > CURRENT_TIME
       ORDER BY er.end_time ASC`,
    );

    const count = result.rows.reduce((sum: number, r: any) => sum + r.quantity, 0);
    const typeName = result.rows[0]?.type_name ?? 'Equipamentos';
    const next = result.rows[0];

    res.json({
      count,
      type: typeName,
      next_return: next ? { time: next.end_time, location: next.location } : null,
    });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar ativos agora' });
  }
});

// GET /api/reservations/export/csv — TI/Admin (ANTES de /:id)
router.get('/export/csv', authenticate, authorize('reservations:manage'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { date_filter, status, type_id } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: any[] = [];
    let p = 1;

    if (status) { conditions.push(`er.status = $${p++}`); params.push(status); }
    if (type_id) { conditions.push(`er.equipment_type_id = $${p++}`); params.push(type_id); }

    const today = new Date().toISOString().split('T')[0];
    if (date_filter === 'today') { conditions.push(`er.date = $${p++}`); params.push(today); }
    else if (date_filter === 'tomorrow') {
      const t = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      conditions.push(`er.date = $${p++}`); params.push(t);
    } else if (date_filter === 'week') {
      const we = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      conditions.push(`er.date BETWEEN $${p++} AND $${p++}`); params.push(today, we);
    } else if (date_filter === 'month') {
      const me = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      conditions.push(`er.date BETWEEN $${p++} AND $${p++}`); params.push(today, me);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await database.query(
      `SELECT er.reservation_number, et.name AS tipo, er.quantity AS quantidade,
              er.date AS data, er.start_time AS inicio, er.end_time AS fim,
              er.location AS local, er.purpose AS finalidade,
              COALESCE(er.requester_name, iu.name) AS solicitante,
              COALESCE(er.requester_email, iu.email) AS email,
              er.status, er.created_at AS criado_em
       FROM equipment_reservations er
       JOIN equipment_types et ON et.id = er.equipment_type_id
       LEFT JOIN internal_users iu ON iu.id = er.internal_user_id
       ${where}
       ORDER BY er.date DESC, er.start_time DESC`,
      params,
    );

    const headers = ['Número', 'Tipo', 'Quantidade', 'Data', 'Início', 'Fim', 'Local', 'Finalidade', 'Solicitante', 'Email', 'Status', 'Criado em'];
    const rows = result.rows.map((r: any) => [
      r.reservation_number, r.tipo, r.quantidade,
      r.data instanceof Date ? r.data.toISOString().split('T')[0] : r.data,
      r.inicio, r.fim, r.local, r.finalidade,
      r.solicitante, r.email, r.status,
      r.criado_em instanceof Date ? r.criado_em.toISOString() : r.criado_em,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reservas-${today}.csv"`);
    res.send('﻿' + csv);
  } catch {
    res.status(500).json({ error: 'Erro ao exportar CSV' });
  }
});

// GET /api/reservations/equipment-types — TI/Admin (ANTES de /:id)
router.get('/equipment-types', authenticate, authorize('reservations:manage'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await database.query(
      `SELECT et.*,
              (SELECT COUNT(*) FROM equipment_reservations er
               WHERE er.equipment_type_id = et.id AND er.status IN ('approved','ready','in_use')) AS active_reservations
       FROM equipment_types et ORDER BY et.name`,
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Erro ao listar tipos' });
  }
});

// GET /api/reservations — TI/Admin (ANTES de /:id, mas após as rotas exatas)
router.get('/', authenticate, authorize('reservations:manage'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { date_filter, status, type_id, page = '1', limit = '20', sort = 'date_desc' } = req.query as Record<string, string>;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const conditions: string[] = [];
    const params: any[] = [];
    let p = 1;

    if (status) { conditions.push(`er.status = $${p++}`); params.push(status); }
    if (type_id) { conditions.push(`er.equipment_type_id = $${p++}`); params.push(type_id); }

    const today = new Date().toISOString().split('T')[0];
    if (date_filter === 'today') { conditions.push(`er.date = $${p++}`); params.push(today); }
    else if (date_filter === 'tomorrow') {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      conditions.push(`er.date = $${p++}`); params.push(tomorrow);
    } else if (date_filter === 'week') {
      const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      conditions.push(`er.date BETWEEN $${p++} AND $${p++}`); params.push(today, weekEnd);
    } else if (date_filter === 'month') {
      const monthEnd = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      conditions.push(`er.date BETWEEN $${p++} AND $${p++}`); params.push(today, monthEnd);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = sort === 'date_asc' ? 'er.date ASC, er.start_time ASC' : 'er.date DESC, er.start_time DESC';

    const countResult = await database.query(
      `SELECT COUNT(*) AS total FROM equipment_reservations er ${whereClause}`,
      params,
    );

    const dataResult = await database.query(
      `SELECT er.*, et.name AS type_name, et.icon AS type_icon,
              iu.name AS internal_user_name,
              ab.name AS approved_by_name
       FROM equipment_reservations er
       JOIN equipment_types et ON et.id = er.equipment_type_id
       LEFT JOIN internal_users iu ON iu.id = er.internal_user_id
       LEFT JOIN internal_users ab ON ab.id = er.approved_by_id
       ${whereClause}
       ORDER BY ${orderClause}
       LIMIT $${p++} OFFSET $${p++}`,
      [...params, parseInt(limit, 10), offset],
    );

    res.json({
      reservations: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch {
    res.status(500).json({ error: 'Erro ao listar reservas' });
  }
});

// ─── POST /api/reservations — criar reserva ───────────────────────────────────
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const {
    equipment_type_id, quantity, date, start_time, end_time,
    location, purpose,
    requester_name, requester_email, requester_phone,
  } = req.body;

  if (!quantity || !date || !start_time || !end_time || !location || !purpose) {
    res.status(400).json({ error: 'Campos obrigatórios faltando' });
    return;
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty < 1) {
    res.status(400).json({ error: 'Quantidade deve ser no mínimo 1' });
    return;
  }

  // Detectar usuário interno via token (opcional)
  let internalUserId: string | null = null;
  let internalUserName: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const { config } = require('../config/environment');
      const decoded = jwt.verify(authHeader.substring(7), config.jwt.secret) as any;
      internalUserId = decoded.id;
      internalUserName = decoded.name;
    } catch { /* token inválido = usuário público */ }
  }

  if (!internalUserId && !requester_email) {
    res.status(400).json({ error: 'E-mail obrigatório para reservas sem login' });
    return;
  }

  const reservationStart = new Date(`${date}T${start_time}`);
  const minStart = new Date(Date.now() + 30 * 60 * 1000);
  if (reservationStart < minStart) {
    res.status(400).json({ error: 'Reservas devem ser criadas com no mínimo 30 minutos de antecedência' });
    return;
  }

  try {
    let effectiveTypeId: string;
    let max_quantity: number;
    let typeName: string;

    if (equipment_type_id) {
      const typeResult = await database.query(
        'SELECT id, name, max_quantity FROM equipment_types WHERE id = $1 AND is_active = true',
        [equipment_type_id],
      );
      if (!typeResult.rows[0]) { res.status(404).json({ error: 'Tipo de equipamento não encontrado' }); return; }
      effectiveTypeId = equipment_type_id;
      max_quantity = typeResult.rows[0].max_quantity;
      typeName = typeResult.rows[0].name;
    } else {
      const def = await getDefaultType();
      if (!def) { res.status(503).json({ error: 'Nenhum equipamento disponível para reserva no momento.' }); return; }
      effectiveTypeId = def.id;
      max_quantity = def.max_quantity;
      typeName = def.name;
    }

    await database.query('BEGIN');
    try {
      const conflictResult = await database.query(buildConflictQuery(true), [
        effectiveTypeId, date, start_time, end_time,
      ]);
      const reserved = parseInt(conflictResult.rows[0].reserved_qty, 10);
      const remaining = max_quantity - reserved;

      if (reserved + qty > max_quantity) {
        await database.query('ROLLBACK');
        const next_available = await findNextAvailable(effectiveTypeId, date, end_time, qty, max_quantity);
        const reason = remaining > 0 ? 'buffer' : 'conflict';
        res.status(409).json({
          available: false,
          reason,
          remaining: Math.max(0, remaining),
          next_available,
          message: remaining > 0
            ? `Apenas ${remaining} equipamento(s) disponível(is) para este horário.`
            : 'Sem disponibilidade para este horário.',
        });
        return;
      }

      const reservationNumber = await generateReservationNumber();
      const crypto = require('crypto');
      const accessToken = internalUserId ? null : crypto.randomUUID();

      const insertResult = await database.query(
        `INSERT INTO equipment_reservations (
          reservation_number, equipment_type_id, quantity, date, start_time, end_time,
          location, purpose, status,
          requester_name, requester_email, requester_phone, access_token,
          internal_user_id, approved_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'approved',$9,$10,$11,$12,$13,NOW())
        RETURNING *`,
        [
          reservationNumber, effectiveTypeId, qty, date, start_time, end_time,
          location, purpose,
          requester_name ?? internalUserName, requester_email ?? null, requester_phone ?? null,
          accessToken, internalUserId,
        ],
      );

      await database.query('COMMIT');

      const reservation = insertResult.rows[0];
      await logAction(reservation.id, 'created', internalUserId, internalUserName ?? requester_name);

      const recipientEmail = requester_email ?? (internalUserId
        ? (await database.query('SELECT email FROM internal_users WHERE id = $1', [internalUserId])).rows[0]?.email
        : null);

      if (recipientEmail) {
        const trackingUrl = accessToken
          ? `${process.env.FRONTEND_URL || ''}/reservar/acompanhar/${accessToken}`
          : `${process.env.FRONTEND_URL || ''}/reservas`;
        await EmailService.sendReservationConfirmation(
          reservation.id,
          reservationNumber,
          recipientEmail,
          reservation.requester_name ?? internalUserName ?? 'Solicitante',
          typeName,
          qty,
          date,
          start_time,
          end_time,
          location,
          purpose,
          trackingUrl,
        );
      }

      const ws = getWebSocketService();
      ws?.getIO().emit('reservation:created', {
        id: reservation.id,
        reservation_number: reservationNumber,
        type_name: typeName,
        quantity: qty,
        date,
        start_time,
        end_time,
        location,
        status: 'approved',
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        id: reservation.id,
        reservation_number: reservationNumber,
        status: 'approved',
        access_token: accessToken,
        tracking_url: accessToken ? `/reservar/acompanhar/${accessToken}` : '/reservas',
      });
    } catch (err) {
      await database.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('[RESERVATIONS] Erro ao criar reserva:', err);
    res.status(500).json({ error: 'Erro ao criar reserva' });
  }
});

// ─── Rotas com /:id (autenticado) ────────────────────────────────────────────

// GET /api/reservations/:id
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await database.query(
      `SELECT er.*, et.name AS type_name, et.icon AS type_icon,
              iu.name AS internal_user_name,
              ab.name AS approved_by_name
       FROM equipment_reservations er
       JOIN equipment_types et ON et.id = er.equipment_type_id
       LEFT JOIN internal_users iu ON iu.id = er.internal_user_id
       LEFT JOIN internal_users ab ON ab.id = er.approved_by_id
       WHERE er.id = $1`,
      [req.params.id],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar reserva' });
  }
});

// GET /api/reservations/:id/ics
router.get('/:id/ics', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await database.query(
      `SELECT er.*, et.name AS type_name
       FROM equipment_reservations er
       JOIN equipment_types et ON et.id = er.equipment_type_id
       WHERE er.id = $1`,
      [req.params.id],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }
    const r = result.rows[0];
    const ics = buildICS(r);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reserva-${r.reservation_number}.ics"`);
    res.send(ics);
  } catch {
    res.status(500).json({ error: 'Erro ao gerar ICS' });
  }
});

// PATCH /api/reservations/:id/cancel
router.patch('/:id/cancel', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await database.query(
      `UPDATE equipment_reservations
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
         AND internal_user_id = $2
         AND status IN ('approved', 'ready')
       RETURNING *`,
      [req.params.id, req.user!.id],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Reserva não encontrada ou não pode ser cancelada' });
      return;
    }
    await logAction(req.params.id, 'cancelled', req.user!.id, req.user!.name, 'Cancelado pelo solicitante');
    res.json({ message: 'Reserva cancelada com sucesso' });
  } catch {
    res.status(500).json({ error: 'Erro ao cancelar reserva' });
  }
});

// PATCH /api/reservations/:id/approve — TI/Admin
router.patch('/:id/approve', authenticate, authorize('reservations:manage'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await database.query(
      `UPDATE equipment_reservations
       SET status = 'approved', approved_by_id = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [req.user!.id, req.params.id],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Reserva não encontrada ou já processada' });
      return;
    }
    await logAction(req.params.id, 'approved', req.user!.id, req.user!.name);
    getWebSocketService()?.notifyUser?.(result.rows[0].internal_user_id, 'reservation:approved', { id: req.params.id });
    res.json({ message: 'Reserva aprovada' });
  } catch {
    res.status(500).json({ error: 'Erro ao aprovar reserva' });
  }
});

// PATCH /api/reservations/:id/reject — TI/Admin
router.patch('/:id/reject', authenticate, authorize('reservations:manage'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    const result = await database.query(
      `UPDATE equipment_reservations
       SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
       WHERE id = $2 AND status IN ('pending', 'approved')
       RETURNING *`,
      [reason ?? null, req.params.id],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }
    await logAction(req.params.id, 'rejected', req.user!.id, req.user!.name, reason);
    getWebSocketService()?.notifyUser?.(result.rows[0].internal_user_id, 'reservation:rejected', { id: req.params.id, reason });
    res.json({ message: 'Reserva recusada' });
  } catch {
    res.status(500).json({ error: 'Erro ao recusar reserva' });
  }
});

// PATCH /api/reservations/:id/ready — TI/Admin
router.patch('/:id/ready', authenticate, authorize('reservations:manage'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await database.query(
      `UPDATE equipment_reservations SET status = 'ready', updated_at = NOW()
       WHERE id = $1 AND status = 'approved'
       RETURNING *, (SELECT name FROM equipment_types WHERE id = equipment_type_id) AS type_name`,
      [req.params.id],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }
    await logAction(req.params.id, 'ready', req.user!.id, req.user!.name, 'Equipamentos separados');

    const r = result.rows[0];
    const recipientEmail = r.requester_email
      ?? (r.internal_user_id
        ? (await database.query('SELECT email FROM internal_users WHERE id = $1', [r.internal_user_id])).rows[0]?.email
        : null);

    if (recipientEmail) {
      await EmailService.sendReservationReady(
        recipientEmail,
        r.requester_name ?? 'Solicitante',
        r.reservation_number,
        r.type_name,
        r.quantity,
        r.location,
        r.start_time,
      );
    }

    getWebSocketService()?.notifyUser?.(r.internal_user_id, 'reservation:ready', { id: req.params.id, location: r.location });
    res.json({ message: 'Equipamentos marcados como prontos' });
  } catch {
    res.status(500).json({ error: 'Erro ao marcar como pronto' });
  }
});

// PATCH /api/reservations/:id/no-show — TI/Admin
router.patch('/:id/no-show', authenticate, authorize('reservations:manage'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await database.query(
      `UPDATE equipment_reservations SET status = 'no_show', updated_at = NOW()
       WHERE id = $1 AND status IN ('approved', 'ready')
       RETURNING *`,
      [req.params.id],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Reserva não encontrada' });
      return;
    }
    await logAction(req.params.id, 'no_show', req.user!.id, req.user!.name, 'Solicitante não apareceu');
    res.json({ message: 'No-show registrado' });
  } catch {
    res.status(500).json({ error: 'Erro ao registrar no-show' });
  }
});

// ─── Admin — Tipos de equipamento ────────────────────────────────────────────

// POST /api/reservations/equipment-types
router.post('/equipment-types', authenticate, authorize('reservations:types:manage'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, max_quantity, buffer_minutes = 30, icon } = req.body;
    if (!name || !max_quantity) {
      res.status(400).json({ error: 'name e max_quantity são obrigatórios' });
      return;
    }
    const result = await database.query(
      `INSERT INTO equipment_types (name, description, max_quantity, buffer_minutes, icon)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description ?? null, parseInt(max_quantity, 10), parseInt(buffer_minutes, 10), icon ?? null],
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao criar tipo' });
  }
});

// PATCH /api/reservations/equipment-types/:id
router.patch('/equipment-types/:id', authenticate, authorize('reservations:types:manage'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, max_quantity, buffer_minutes, icon, is_active } = req.body;
    const result = await database.query(
      `UPDATE equipment_types
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           max_quantity = COALESCE($3, max_quantity),
           buffer_minutes = COALESCE($4, buffer_minutes),
           icon = COALESCE($5, icon),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name ?? null, description ?? null,
        max_quantity ? parseInt(max_quantity, 10) : null,
        buffer_minutes ? parseInt(buffer_minutes, 10) : null,
        icon ?? null, is_active !== undefined ? is_active : null,
        req.params.id],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Tipo não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar tipo' });
  }
});

// DELETE /api/reservations/equipment-types/:id — desativa
router.delete('/equipment-types/:id', authenticate, authorize('reservations:types:manage'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await database.query(
      `UPDATE equipment_types SET is_active = false, updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [req.params.id],
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Tipo não encontrado' });
      return;
    }
    res.json({ message: 'Tipo desativado' });
  } catch {
    res.status(500).json({ error: 'Erro ao desativar tipo' });
  }
});

export default router;
