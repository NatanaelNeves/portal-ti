import cron from 'node-cron';
import { database } from '../database/connection';
import { EmailService } from './emailService';
import { getWebSocketService } from './websocketService';

// ─── Configuração ────────────────────────────────────────────────────────────
const DAYS_TO_AUTO_CLOSE = 2;
const WARNING_HOURS_BEFORE_CLOSE = 24;

// ─── Job: Avisar usuário 24h antes do encerramento automático ────────────────
async function notifyTicketsNearAutoClose(): Promise<void> {
  try {
    console.log('[SCHEDULER] Verificando tickets aguardando confirmação com fechamento em < 24h...');

    const result = await database.query(
      `SELECT t.id, t.title, pu.email AS requester_email, pu.name AS requester_name, pu.user_token AS requester_token
       FROM tickets t
       JOIN public_users pu ON t.requester_type = 'public' AND pu.id = t.requester_id
       WHERE t.status = 'aguardando_confirmacao'
         AND t.confirmation_requested_at IS NOT NULL
         AND t.auto_close_warning_sent_at IS NULL
         AND t.confirmation_requested_at <= NOW() - INTERVAL '1 day'
         AND t.confirmation_requested_at > NOW() - INTERVAL '2 days'`,
    );

    for (const row of result.rows) {
      await EmailService.notifyAutoCloseWarning(
        row.id,
        row.title,
        row.requester_email,
        row.requester_name || 'Usuário',
        row.requester_token,
      );

      await database.query(
        `UPDATE tickets
         SET auto_close_warning_sent_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [row.id],
      );

      await database.query(
        `INSERT INTO ticket_history (
          ticket_id, action, changed_by_type, changed_by_id, old_value, new_value, metadata
        ) VALUES ($1, 'auto_close_warning_sent', 'system', NULL, NULL, NULL, $2::jsonb)`,
        [row.id, JSON.stringify({ hours_remaining: WARNING_HOURS_BEFORE_CLOSE })],
      ).catch(() => undefined);

      const ws = getWebSocketService();
      ws?.getIO().emit('ticket:auto_close_warning', {
        ticketId: row.id,
        title: row.title,
        action: 'auto_close_warning',
        hoursRemaining: WARNING_HOURS_BEFORE_CLOSE,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[SCHEDULER] Avisos enviados: ${result.rows.length}`);
  } catch (err) {
    console.error('[SCHEDULER] Erro ao enviar avisos de auto fechamento:', err);
  }
}

// ─── Job: Fechar automaticamente tickets sem confirmação em 2 dias ───────────
async function autoCloseAwaitingConfirmationTickets(): Promise<void> {
  try {
    console.log(`[SCHEDULER] Verificando tickets aguardando confirmação há mais de ${DAYS_TO_AUTO_CLOSE} dias...`);

    const result = await database.query(
      `UPDATE tickets
       SET status = 'closed',
           resolved_at = COALESCE(resolved_at, NOW()),
           auto_closed = true,
           closed_at = NOW(),
           confirmation_response_at = COALESCE(confirmation_response_at, NOW()),
           updated_at = NOW()
       WHERE status = 'aguardando_confirmacao'
         AND confirmation_requested_at <= NOW() - INTERVAL '${DAYS_TO_AUTO_CLOSE} days'
       RETURNING id, title, updated_at`,
    );

    for (const row of result.rows) {
      await database.query(
        `INSERT INTO ticket_history (
          ticket_id, action, changed_by_type, changed_by_id, old_value, new_value, metadata
        ) VALUES ($1, 'auto_closed_after_confirmation_timeout', 'system', NULL, 'aguardando_confirmacao', 'closed', $2::jsonb)`,
        [row.id, JSON.stringify({ auto_closed: true, reason: 'timeout_2_days' })],
      ).catch(() => undefined);

      const ws = getWebSocketService();
      ws?.getIO().emit('ticket:updated', {
        ticketId: row.id,
        action: 'auto_closed',
        oldStatus: 'aguardando_confirmacao',
        status: 'closed',
        auto_closed: true,
        timestamp: new Date().toISOString(),
      });
    }

    if (result.rows.length === 0) {
      console.log('[SCHEDULER] Nenhum ticket fechado automaticamente.');
    } else {
      console.log(`[SCHEDULER] ${result.rows.length} ticket(s) fechado(s) automaticamente:`);
      result.rows.forEach((t: { id: string; title: string }) => {
        console.log(`  - #${t.id}: "${t.title}"`);
      });
    }
  } catch (err) {
    console.error('[SCHEDULER] Erro ao fechar tickets automaticamente:', err);
  }
}

// ─── Job: Lembrete 24h para reservas do dia seguinte ─────────────────────────
async function sendReservation24hReminders(): Promise<void> {
  try {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const result = await database.query(
      `SELECT er.*, et.name AS type_name,
              COALESCE(er.requester_email, iu.email) AS email,
              COALESCE(er.requester_name, iu.name) AS name
       FROM equipment_reservations er
       JOIN equipment_types et ON et.id = er.equipment_type_id
       LEFT JOIN internal_users iu ON iu.id = er.internal_user_id
       WHERE er.date = $1
         AND er.status IN ('approved', 'ready')
         AND er.reminder_24h_sent_at IS NULL`,
      [tomorrow],
    );
    for (const r of result.rows) {
      if (!r.email) continue;
      await EmailService.sendReservationReminder(
        r.email, r.name, r.reservation_number, r.type_name,
        r.quantity, r.date, r.start_time, r.end_time, r.location, 24,
      );
      await database.query(
        'UPDATE equipment_reservations SET reminder_24h_sent_at = NOW() WHERE id = $1',
        [r.id],
      );
    }
    console.log(`[SCHEDULER] Lembretes 24h de reservas enviados: ${result.rows.length}`);
  } catch (err) {
    console.error('[SCHEDULER] Erro ao enviar lembretes 24h de reservas:', err);
  }
}

// ─── Job: Lembrete 1h + auto no-show ─────────────────────────────────────────
async function sendReservation1hRemindersAndAutoNoShow(): Promise<void> {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Lembrete 1h
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const h1 = `${String(in1h.getHours()).padStart(2, '0')}:${String(in1h.getMinutes()).padStart(2, '0')}`;
    const remResult = await database.query(
      `SELECT er.*, et.name AS type_name,
              COALESCE(er.requester_email, iu.email) AS email,
              COALESCE(er.requester_name, iu.name) AS name
       FROM equipment_reservations er
       JOIN equipment_types et ON et.id = er.equipment_type_id
       LEFT JOIN internal_users iu ON iu.id = er.internal_user_id
       WHERE er.date = $1
         AND er.start_time BETWEEN $2::time AND ($2::time + interval '15 minutes')
         AND er.status IN ('approved', 'ready')
         AND er.reminder_1h_sent_at IS NULL`,
      [today, h1],
    );
    for (const r of remResult.rows) {
      if (!r.email) continue;
      await EmailService.sendReservationReminder(
        r.email, r.name, r.reservation_number, r.type_name,
        r.quantity, r.date, r.start_time, r.end_time, r.location, 1,
      );
      await database.query(
        'UPDATE equipment_reservations SET reminder_1h_sent_at = NOW() WHERE id = $1',
        [r.id],
      );
    }

    // Auto no-show: approved/ready com start_time + 1h no passado sem virar ready/in_use
    const noShowResult = await database.query(
      `UPDATE equipment_reservations
       SET status = 'no_show', updated_at = NOW()
       WHERE date = $1
         AND status = 'approved'
         AND (start_time + interval '1 hour') < $2::time
       RETURNING id, reservation_number`,
      [today, `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`],
    );
    if (noShowResult.rows.length > 0) {
      console.log(`[SCHEDULER] Auto no-show: ${noShowResult.rows.length} reserva(s) marcadas`);
      for (const r of noShowResult.rows) {
        await database.query(
          `INSERT INTO reservation_logs (reservation_id, action, performed_by_name)
           VALUES ($1, 'auto_no_show', 'Sistema')`,
          [r.id],
        ).catch(() => undefined);
      }
    }
  } catch (err) {
    console.error('[SCHEDULER] Erro no job de reservas horário:', err);
  }
}

// ─── Registrar jobs ──────────────────────────────────────────────────────────
export function initializeScheduler(): void {
  // Tickets: todo dia às 03:00 UTC
  cron.schedule('0 3 * * *', () => {
    notifyTicketsNearAutoClose();
    autoCloseAwaitingConfirmationTickets();
  });

  // Reservas: lembrete 24h todo dia às 08:00 UTC
  cron.schedule('0 8 * * *', () => {
    sendReservation24hReminders();
  });

  // Reservas: lembrete 1h + auto no-show a cada hora
  cron.schedule('0 * * * *', () => {
    sendReservation1hRemindersAndAutoNoShow();
  });

  console.log(
    `✓ Scheduler iniciado: tickets (03:00), lembretes reserva 24h (08:00), lembretes 1h + auto-noshow (horário)`,
  );
}
