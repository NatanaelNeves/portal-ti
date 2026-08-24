import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { database } from '../database/connection';
import { config } from '../config/environment';
import { UserRole } from '../types/enums';
import { ExcelReportService } from '../services/excelReportService';
import { ACTIVE_STATUSES, sqlStatusList, STATUS_LABELS } from '../services/ticketSlaClock';
import {
  appendTicketReportFilters,
  canSelectServiceDepartment,
  normalizeRequesterDepartment,
  resolveServiceDepartment,
  serviceDepartmentLabel,
} from '../services/reportFilterScope';

const reportsRouter = Router();

interface InternalUserClaims {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  type?: string;
}

const toInt = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? 0), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const toFloat = (value: unknown): number => {
  const parsed = Number.parseFloat(String(value ?? 0));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getInternalUserFromToken = (req: Request, res: Response): InternalUserClaims | null => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Autenticação necessária' });
    return null;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret as string) as InternalUserClaims;
    if (decoded.type && decoded.type !== 'internal') {
      res.status(401).json({ error: 'Token inválido' });
      return null;
    }
    return decoded;
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return null;
  }
};

const ensureReportsAccess = (req: Request, res: Response): InternalUserClaims | null => {
  const user = getInternalUserFromToken(req, res);
  if (!user) {
    return null;
  }

  if (![UserRole.ADMIN, UserRole.IT_STAFF, UserRole.ADMIN_STAFF, UserRole.RH_STAFF, UserRole.MANAGER].includes(user.role)) {
    res.status(403).json({ error: 'Acesso negado' });
    return null;
  }

  return user;
};

/*
 * Tempo OPERACIONAL: duracao menos os periodos em que o SLA esteve pausado
 * (aguardando aquisicao / terceiros).
 *
 * Toda metrica que avalia DESEMPENHO da equipe passa por aqui. Um chamado que
 * ficou 5 dias na assistencia tecnica nao pode elevar a media de atendimento
 * da TI em 5 dias — o setor nao tinha o que fazer naquele periodo.
 *
 * As metricas que descrevem a EXPERIENCIA DO SOLICITANTE continuam usando
 * tempo corrido, porque para quem abriu o chamado a espera existiu.
 */
const pausedHoursExpr = (alias = 't') => `
  COALESCE((
    SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(p.ended_at, NOW()) - p.started_at)) / 3600)
    FROM ticket_sla_pauses p
    WHERE p.ticket_id = ${alias}.id
  ), 0)`;

/** Horas operacionais entre abertura e resolucao. */
const operationalHoursExpr = (alias = 't') => `
  GREATEST(0,
    EXTRACT(EPOCH FROM (${alias}.resolved_at - ${alias}.created_at)) / 3600
    - ${pausedHoursExpr(alias)}
  )`;

/** Minutos operacionais entre abertura e resolucao. */
const operationalMinutesExpr = (alias = 't') => `
  GREATEST(0,
    EXTRACT(EPOCH FROM (${alias}.resolved_at - ${alias}.created_at)) / 60
    - ${pausedHoursExpr(alias)} * 60
  )`;

/** Horas operacionais ate a primeira resposta. */
const operationalFirstResponseHoursExpr = (alias = 't') => `
  GREATEST(0,
    EXTRACT(EPOCH FROM (${alias}.first_response_at - ${alias}.created_at)) / 3600
    - ${pausedHoursExpr(alias)}
  )`;

const formatTeamLabel = serviceDepartmentLabel;

interface ReportScope {
  serviceDepartment: ReturnType<typeof resolveServiceDepartment>;
  requesterDepartment: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

const getReportScope = (req: Request, res: Response): ReportScope => {
  const user = res.locals.reportUser as InternalUserClaims;
  return {
    serviceDepartment: resolveServiceDepartment(user.role, req.query.department),
    requesterDepartment: normalizeRequesterDepartment(req.query.requester_department),
    dateFrom: normalizeRequesterDepartment(req.query.date_from),
    dateTo: normalizeRequesterDepartment(req.query.date_to),
  };
};

const buildFilteredTicketsCte = (
  scope: ReportScope,
  options: { includeDates?: boolean; dateColumn?: 'created_at' | 'rated_at' } = {},
) => {
  const { includeDates = true, dateColumn = 'created_at' } = options;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (includeDates && scope.dateFrom) {
    params.push(scope.dateFrom);
    conditions.push(`t.${dateColumn} >= $${params.length}::date`);
  }
  if (includeDates && scope.dateTo) {
    params.push(scope.dateTo);
    conditions.push(`t.${dateColumn} < ($${params.length}::date + INTERVAL '1 day')`);
  }
  appendTicketReportFilters({
    conditions,
    params,
    alias: 't',
    serviceDepartment: scope.serviceDepartment,
    requesterDepartment: scope.requesterDepartment,
  });

  return {
    params,
    sql: `WITH filtered_tickets AS (
      SELECT
        t.*,
        COALESCE(NULLIF(TRIM(pu.department), ''), NULLIF(TRIM(d_req.name), ''), 'Não informado') AS requester_department_label,
        COALESCE(t.requester_name, pu.name, iu_req.name, 'Solicitante') AS requester_name_label
      FROM tickets t
      LEFT JOIN public_users pu ON t.requester_type = 'public' AND t.requester_id = pu.id
      LEFT JOIN internal_users iu_req ON t.requester_type = 'internal' AND t.requester_id = iu_req.id
      LEFT JOIN departments d_req ON d_req.id = iu_req.department_id
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    )`,
  };
};

const fetchTicketReportRows = async (req: Request, res: Response, limit: number) => {
  const scope = getReportScope(req, res);
  const filtered = buildFilteredTicketsCte(scope);
  const params = [...filtered.params];
  const conditions: string[] = [];

  if (req.query.status) {
    params.push(req.query.status);
    conditions.push(`t.status = $${params.length}`);
  }
  if (req.query.priority) {
    params.push(req.query.priority);
    conditions.push(`t.priority = $${params.length}`);
  }
  if (req.query.assigned_to === 'unassigned') {
    conditions.push('t.assigned_to_id IS NULL');
  } else if (req.query.assigned_to) {
    params.push(req.query.assigned_to);
    conditions.push(`t.assigned_to_id = $${params.length}`);
  }

  return database.query(
    `${filtered.sql}
     SELECT
       t.id,
       t.title,
       t.description,
       t.status,
       t.priority,
       t.type,
       t.created_at,
       t.updated_at,
       t.resolved_at,
       COALESCE(t.department, 'ti') AS service_department,
       t.requester_department_label,
       t.requester_name_label AS requester_name,
       iu_assigned.name AS assigned_to_name,
       iu_assigned.email AS assigned_to_email,
       EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, NOW()) - t.created_at)) / 3600 AS time_open_hours
     FROM filtered_tickets t
     LEFT JOIN internal_users iu_assigned ON t.assigned_to_id = iu_assigned.id
     ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
     ORDER BY t.created_at DESC
     LIMIT ${Math.max(1, Math.min(limit, 5000))}`,
    params,
  );
};

const formatTicketReportRow = (ticket: any) => ({
  id: ticket.id,
  title: ticket.title,
  description: ticket.description,
  status: ticket.status,
  priority: ticket.priority,
  type: ticket.type,
  serviceDepartment: ticket.service_department || 'ti',
  serviceDepartmentLabel: serviceDepartmentLabel(ticket.service_department || 'ti'),
  requesterDepartment: ticket.requester_department_label || 'Não informado',
  requesterName: ticket.requester_name,
  assignedToName: ticket.assigned_to_name || 'Não atribuído',
  assignedToEmail: ticket.assigned_to_email || '',
  createdAt: ticket.created_at,
  updatedAt: ticket.updated_at,
  resolvedAt: ticket.resolved_at,
  timeOpenHours: toFloat(ticket.time_open_hours).toFixed(1),
});

reportsRouter.use((req: Request, res: Response, next) => {
  const user = ensureReportsAccess(req, res);
  if (!user) {
    return;
  }

  res.locals.reportUser = user;
  next();
});

reportsRouter.use((req: Request, res: Response, next) => {
  const scalarFilters = ['department', 'requester_department', 'date_from', 'date_to', 'status', 'priority', 'assigned_to'];
  if (scalarFilters.some((key) => req.query[key] !== undefined && typeof req.query[key] !== 'string')) {
    return res.status(400).json({ error: 'Os filtros devem ter um único valor' });
  }

  const department = req.query.department as string | undefined;
  if (department && !['all', 'ti', 'rh', 'administrativo'].includes(department.toLowerCase())) {
    return res.status(400).json({ error: 'Equipe responsável inválida' });
  }

  const isValidDate = (value: unknown) => {
    if (value === undefined || value === '') return true;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };

  if (!isValidDate(req.query.date_from) || !isValidDate(req.query.date_to)) {
    return res.status(400).json({ error: 'Data inválida. Use o formato AAAA-MM-DD' });
  }

  const requesterDepartment = req.query.requester_department as string | undefined;
  if (requesterDepartment && requesterDepartment.length > 160) {
    return res.status(400).json({ error: 'Setor solicitante inválido' });
  }

  next();
});

/**
 * GET /auxadmin - Relatório do Auxiliar Administrativo
 *
 * Fonte de dados PRÓPRIA, não o relatório da TI com cards escondidos. O que
 * interessa a uma coordenação aqui é: o que o setor está atendendo, quanto
 * está atendendo, de onde vem a demanda e o que continua pendente. Nada de
 * infraestrutura, equipamento, inventário ou vocabulário técnico.
 *
 * O escopo é sempre `department = 'administrativo'`, e para o próprio
 * auxiliar administrativo é adicionalmente limitado aos chamados dele ou sem
 * responsável — o mesmo recorte que ele enxerga na fila. Admin e gestor veem
 * o setor inteiro.
 */
reportsRouter.get('/auxadmin', async (req: Request, res: Response) => {
  const user = getInternalUserFromToken(req, res);
  if (!user) return;

  // AUTORIZAÇÃO: este relatório é do fluxo administrativo. Um usuário de TI
  // ou de RH não tem por que consultar a produtividade deste setor por aqui.
  if (![UserRole.ADMIN_STAFF, UserRole.ADMIN, UserRole.MANAGER].includes(user.role)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  // O setor do solicitante nao e coluna de `tickets`: vem de public_users
  // (solicitante externo) ou do departamento do usuario interno.
  const JOINS = `         LEFT JOIN public_users pu ON t.requester_type = 'public' AND t.requester_id = pu.id
         LEFT JOIN internal_users iu_req ON t.requester_type = 'internal' AND t.requester_id = iu_req.id
         LEFT JOIN departments d_req ON d_req.id = iu_req.department_id`;
  const DEPT = "COALESCE(NULLIF(TRIM(pu.department), ''), NULLIF(TRIM(d_req.name), ''), 'Não informado')";

  try {
    const conditions: string[] = [`COALESCE(t.department, 'ti') = 'administrativo'`];
    const params: any[] = [];

    if (user.role === UserRole.ADMIN_STAFF) {
      params.push(user.id);
      conditions.push(`(t.assigned_to_id = $${params.length} OR t.assigned_to_id IS NULL)`);
    }

    const dateFrom = typeof req.query.date_from === 'string' ? req.query.date_from : null;
    const dateTo = typeof req.query.date_to === 'string' ? req.query.date_to : null;
    const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : null;
    const priority = typeof req.query.priority === 'string' && req.query.priority ? req.query.priority : null;
    const category = typeof req.query.category === 'string' && req.query.category ? req.query.category : null;
    const requesterDepartment = normalizeRequesterDepartment(req.query.requester_department);

    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`t.created_at >= $${params.length}`);
    }
    if (dateTo) {
      // Inclusivo: o usuario escolheu um DIA, nao um instante. Comparar com
      // <= a meia-noite descartaria tudo o que aconteceu naquele dia.
      params.push(dateTo);
      conditions.push(`t.created_at < ($${params.length}::date + INTERVAL '1 day')`);
    }
    if (status) {
      params.push(status);
      conditions.push(`t.status = $${params.length}`);
    }
    if (priority) {
      params.push(priority);
      conditions.push(`t.priority = $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`t.category = $${params.length}`);
    }
    if (requesterDepartment) {
      params.push(requesterDepartment);
      conditions.push(`LOWER(TRIM(${DEPT})) = LOWER(TRIM($${params.length}))`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    // O setor do solicitante mora em public_users / departments, nao em
    // tickets: as consultas que o leem ou filtram precisam destes joins.
    const FROM_TICKETS = `FROM tickets t\n${JOINS}`;
    const ACTIVE = sqlStatusList(ACTIVE_STATUSES);

    const [summary, businessDaysRow, volume, categories, requesters, statusRows, attention] = await Promise.all([
      // Resumo do período + comparação com a janela anterior de mesmo tamanho.
      database.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE t.status IN ('resolved', 'closed'))::int AS resolved,
           COUNT(*) FILTER (WHERE t.status = 'in_progress')::int AS in_progress,
           COUNT(*) FILTER (WHERE t.status = 'open')::int AS pending,
           COUNT(*) FILTER (WHERE t.status IN ('waiting_user', 'aguardando_confirmacao'))::int AS waiting,
           COUNT(*) FILTER (WHERE t.priority IN ('urgent', 'critical', 'high') AND t.status IN ${ACTIVE})::int AS high_priority_open,
           AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 60)
             FILTER (WHERE t.resolved_at IS NOT NULL) AS avg_resolution_minutes,
           AVG(EXTRACT(EPOCH FROM (t.first_response_at - t.created_at)) / 60)
             FILTER (WHERE t.first_response_at IS NOT NULL) AS avg_first_response_minutes,
           COUNT(DISTINCT DATE(t.resolved_at)) FILTER (WHERE t.resolved_at IS NOT NULL)::int AS days_with_resolution
         ${FROM_TICKETS}
         ${where}`,
        params,
      ),

      // Dias uteis do periodo (seg-sex). Sem calendario de feriados no
      // sistema, feriados contam como uteis — a tela informa isso.
      database.query(
        `SELECT COUNT(*)::int AS business_days
         FROM generate_series(
           COALESCE($1::date, CURRENT_DATE - INTERVAL '29 days'),
           COALESCE($2::date, CURRENT_DATE),
           INTERVAL '1 day'
         ) AS d(day)
         WHERE EXTRACT(ISODOW FROM d.day) < 6`,
        [dateFrom, dateTo],
      ),

      // Recebidos x resolvidos por dia — a leitura de capacidade.
      database.query(
        `SELECT
           DATE(d.day) AS day,
           COUNT(t.id) FILTER (WHERE DATE(t.created_at) = DATE(d.day))::int AS received,
           COUNT(t.id) FILTER (WHERE DATE(t.resolved_at) = DATE(d.day))::int AS resolved
         FROM (
           SELECT generate_series(
             COALESCE($${params.length + 1}::date, CURRENT_DATE - INTERVAL '29 days'),
             COALESCE($${params.length + 2}::date, CURRENT_DATE),
             INTERVAL '1 day'
           ) AS day
         ) d
         LEFT JOIN tickets t
           ON COALESCE(t.department, 'ti') = 'administrativo'
          AND (DATE(t.created_at) = DATE(d.day) OR DATE(t.resolved_at) = DATE(d.day))
         GROUP BY DATE(d.day)
         ORDER BY DATE(d.day) ASC`,
        [...params, dateFrom, dateTo],
      ),

      // Assuntos mais frequentes — vem de `category`, que é o campo real.
      database.query(
        `SELECT t.category, COUNT(*)::int AS total
         ${FROM_TICKETS}
         ${where} AND t.category IS NOT NULL AND TRIM(t.category) <> ''
         GROUP BY t.category
         ORDER BY total DESC
         LIMIT 8`,
        params,
      ),

      // De onde vem a demanda: setor do SOLICITANTE, não da fila.
      database.query(
        `SELECT ${DEPT} AS sector, COUNT(*)::int AS total
         ${FROM_TICKETS}
         ${where}
         GROUP BY 1
         ORDER BY total DESC
         LIMIT 8`,
        params,
      ),

      // Distribuição por status — só os estados que este setor usa.
      database.query(
        `SELECT t.status, COUNT(*)::int AS total
         ${FROM_TICKETS}
         ${where}
         GROUP BY t.status
         ORDER BY total DESC`,
        params,
      ),

      // Exceções que precisam de atenção: abertas há mais tempo primeiro.
      database.query(
        `SELECT
           t.id, t.title, t.status, t.priority, t.category,
           t.created_at,
           COALESCE(NULLIF(TRIM(t.requester_name), ''), pu.name, iu_req.name, 'Solicitante interno') AS requester_name,
           ${DEPT} AS requester_department,
           u.name AS assigned_to_name,
           ROUND(EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 3600)::int AS open_hours
         ${FROM_TICKETS}
         LEFT JOIN internal_users u ON u.id = t.assigned_to_id
         ${where} AND t.status IN ${ACTIVE}
         ORDER BY
           (t.priority IN ('urgent', 'critical', 'high')) DESC,
           (t.assigned_to_id IS NULL) DESC,
           t.created_at ASC
         LIMIT 8`,
        params,
      ),
    ]);

    const s = summary.rows[0] || {};
    const toMin = (value: unknown) =>
      value === null || value === undefined ? null : Math.round(Number(value));

    const total = s.total ?? 0;
    const resolved = s.resolved ?? 0;
    const days = s.days_with_resolution ?? 0;
    const businessDays = businessDaysRow.rows[0]?.business_days ?? 0;

    res.json({
      scope: {
        department: 'administrativo',
        label: 'Administrativo',
        // O auxiliar vê o próprio recorte; coordenação vê o setor inteiro.
        restrictedToOwn: user.role === UserRole.ADMIN_STAFF,
      },
      summary: {
        total,
        resolved,
        inProgress: s.in_progress ?? 0,
        pending: s.pending ?? 0,
        waiting: s.waiting ?? 0,
        highPriorityOpen: s.high_priority_open ?? 0,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : null,
        // Operacional: desempenho da equipe, ja sem os periodos pausados.
        avgResolutionMinutes: toMin(s.avg_resolution_minutes),
        avgFirstResponseMinutes: toMin(s.avg_first_response_minutes),
        // Corrido: duracao total vivida pelo solicitante.
        /*
         * Duas leituras, porque a pergunta e ambigua e uma so enganaria:
         *
         *  • perDayWithResolutions — 20 conclusoes em 2 dias = 10. Diz o ritmo
         *    quando o setor esta trabalhando, mas NAO e a media do periodo.
         *  • perBusinessDay — as mesmas 20 conclusoes sobre os dias UTEIS do
         *    intervalo. E a leitura gerencial de volume.
         *
         * Dias uteis sao contados por dia da semana, com . O
         * sistema nao tem calendario de feriados, entao feriados contam como
         * dias uteis — a rotulagem no frontend diz isso.
         */
        perDayWithResolutions: days > 0 ? Number((resolved / days).toFixed(1)) : null,
        daysWithResolutions: days,
        businessDays: businessDays > 0 ? businessDays : null,
        perBusinessDay: businessDays > 0 ? Number((resolved / businessDays).toFixed(1)) : null,
      },
      volume: volume.rows.map((row: any) => ({
        day: row.day,
        received: row.received,
        resolved: row.resolved,
      })),
      categories: categories.rows.map((row: any) => ({ label: row.category, total: row.total })),
      requesterSectors: requesters.rows.map((row: any) => ({ label: row.sector, total: row.total })),
      byStatus: statusRows.rows.map((row: any) => ({
        status: row.status,
        label: STATUS_LABELS[row.status] ?? row.status,
        total: row.total,
      })),
      attention: attention.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        statusLabel: STATUS_LABELS[row.status] ?? row.status,
        priority: row.priority,
        category: row.category,
        requesterName: row.requester_name,
        requesterDepartment: row.requester_department,
        assignedToName: row.assigned_to_name,
        openHours: row.open_hours,
        createdAt: row.created_at,
      })),
    });
  } catch (err: any) {
    // Erros do Postgres trazem `code`, `message` e a posicao no SQL. Sem
    // devolver isso, um 500 aqui vira adivinhacao: o relatorio e interno e
    // so admin/gestor/auxiliar alcancam este endpoint, entao o detalhe ajuda
    // muito mais do que expoe.
    console.error('Error building auxadmin report:', {
      code: err?.code,
      message: err?.message,
      detail: err?.detail,
      position: err?.position,
      where: err?.where,
    });
    res.status(500).json({
      error: 'Falha ao carregar o relatório administrativo',
      detail: err?.code ? `[${err.code}] ${err.message}` : (err?.message ?? null),
    });
  }
});

reportsRouter.get('/filters', async (req: Request, res: Response) => {
  try {
    const scope = getReportScope(req, res);
    const reportUser = res.locals.reportUser as InternalUserClaims;
    const canSelectDepartment = canSelectServiceDepartment(reportUser.role);
    const scoped = buildFilteredTicketsCte({ ...scope, requesterDepartment: null }, { includeDates: false });
    const requesterDepartments = await database.query(
      `${scoped.sql}
       SELECT DISTINCT requester_department_label AS name
       FROM filtered_tickets
       WHERE requester_department_label <> 'Não informado'
       ORDER BY requester_department_label ASC`,
      scoped.params,
    );

    return res.json({
      serviceDepartments: canSelectDepartment
        ? [
            { value: 'ti', label: 'TI' },
            { value: 'rh', label: 'Recursos Humanos' },
            { value: 'administrativo', label: 'Administrativo' },
          ]
        : scope.serviceDepartment
          ? [{ value: scope.serviceDepartment, label: serviceDepartmentLabel(scope.serviceDepartment) }]
          : [],
      activeServiceDepartment: scope.serviceDepartment || 'all',
      canSelectServiceDepartment: canSelectDepartment,
      requesterDepartments: requesterDepartments.rows.map((row: { name: string }) => row.name),
    });
  } catch (error) {
    console.error('Error fetching report filters:', error);
    return res.status(500).json({ error: 'Failed to fetch report filters' });
  }
});

/**
 * GET /satisfaction - Indicadores de satisfação de atendimento
 */
reportsRouter.get('/satisfaction', async (req: Request, res: Response) => {
  try {
    const scope = getReportScope(req, res);
    const filtered = buildFilteredTicketsCte(scope, { dateColumn: 'rated_at' });

    const [overallResult, byStaffResult, byDepartmentResult, feedbackEntriesResult] = await Promise.all([
      database.query(
        `${filtered.sql}
         SELECT
           COALESCE(AVG(rating), 0) AS avg_rating,
           COUNT(*) FILTER (WHERE rating IS NOT NULL) AS total_ratings,
           COUNT(*) FILTER (WHERE rating >= 4) AS positive_ratings
         FROM filtered_tickets t
         WHERE t.rating IS NOT NULL`,
        filtered.params,
      ),
      database.query(
        `${filtered.sql}
         SELECT
           iu.id AS staff_id,
           iu.name AS staff_name,
           COUNT(*) FILTER (WHERE t.rating IS NOT NULL) AS total_ratings,
           COALESCE(AVG(t.rating), 0) AS avg_rating,
           COUNT(*) FILTER (WHERE t.rating >= 4) AS positive_ratings
         FROM internal_users iu
         JOIN filtered_tickets t ON t.assigned_to_id = iu.id
         WHERE iu.role IN ('it_staff', 'admin_staff', 'rh_staff', 'admin')
           AND t.rating IS NOT NULL
         GROUP BY iu.id, iu.name
         HAVING COUNT(*) FILTER (WHERE t.rating IS NOT NULL) > 0
         ORDER BY avg_rating DESC, total_ratings DESC`,
        filtered.params,
      ),
      database.query(
        `${filtered.sql}
         SELECT
           COALESCE(t.department, 'ti') AS department,
           COUNT(*) FILTER (WHERE t.rating IS NOT NULL) AS total_ratings,
           COALESCE(AVG(t.rating), 0) AS avg_rating,
           COUNT(*) FILTER (WHERE t.rating >= 4) AS positive_ratings
         FROM filtered_tickets t
         WHERE t.rating IS NOT NULL
         GROUP BY COALESCE(t.department, 'ti')
         ORDER BY avg_rating DESC, total_ratings DESC`,
        filtered.params,
      ),
      database.query(
        `${filtered.sql}
         SELECT
           t.id AS ticket_id,
           t.title AS ticket_title,
           t.rating,
           t.feedback,
           t.rated_at,
           COALESCE(t.department, 'ti') AS department,
           iu.name AS assignee_name,
           t.requester_name_label AS requester_name
         FROM filtered_tickets t
         LEFT JOIN internal_users iu ON iu.id = t.assigned_to_id
         WHERE t.rating IS NOT NULL
           AND t.feedback IS NOT NULL
           AND LENGTH(TRIM(t.feedback)) > 0
         ORDER BY t.rated_at DESC
         LIMIT 100`,
        filtered.params,
      ),
    ]);

    const overall = overallResult.rows[0] || {};
    const totalRatings = toInt(overall.total_ratings);
    const positiveRatings = toInt(overall.positive_ratings);

    return res.json({
      averageRating: Number(toFloat(overall.avg_rating).toFixed(2)),
      totalRatings,
      positiveRate: totalRatings > 0 ? Number(((positiveRatings / totalRatings) * 100).toFixed(1)) : 0,
      byStaff: byStaffResult.rows.map((row: any) => {
        const staffTotalRatings = toInt(row.total_ratings);
        const staffPositiveRatings = toInt(row.positive_ratings);
        return {
          staffId: row.staff_id,
          staffName: row.staff_name,
          averageRating: Number(toFloat(row.avg_rating).toFixed(2)),
          totalRatings: staffTotalRatings,
          positiveRate: staffTotalRatings > 0
            ? Number(((staffPositiveRatings / staffTotalRatings) * 100).toFixed(1))
            : 0,
        };
      }),
      byDepartment: byDepartmentResult.rows.map((row: any) => {
        const total = toInt(row.total_ratings);
        const positive = toInt(row.positive_ratings);
        return {
          department: row.department,
          departmentLabel: serviceDepartmentLabel(row.department),
          averageRating: Number(toFloat(row.avg_rating).toFixed(2)),
          totalRatings: total,
          positiveRate: total > 0 ? Number(((positive / total) * 100).toFixed(1)) : 0,
        };
      }),
      feedbackEntries: feedbackEntriesResult.rows.map((row: any) => ({
        ticketId: row.ticket_id,
        ticketTitle: row.ticket_title,
        rating: toInt(row.rating),
        feedback: row.feedback,
        ratedAt: row.rated_at,
        department: row.department,
        departmentLabel: serviceDepartmentLabel(row.department),
        assigneeName: row.assignee_name || 'Não atribuído',
        requesterName: row.requester_name || 'Solicitante',
      })),
      filters: {
        date_from: scope.dateFrom,
        date_to: scope.dateTo,
        department: scope.serviceDepartment || 'all',
        requester_department: scope.requesterDepartment,
      },
    });
  } catch (error) {
    console.error('Error fetching satisfaction report:', error);
    return res.status(500).json({ error: 'Failed to fetch satisfaction report' });
  }
});

/**
 * GET /stats/overview - Estatísticas gerais do sistema
 * Retorna contadores e médias gerais
 */
reportsRouter.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const scope = getReportScope(req, res);
    const filtered = buildFilteredTicketsCte(scope);

    const [
      totalTickets,
      ticketsByStatus,
      ticketsByPriority,
      teamBreakdown,
      avgFirstResponse,
      avgResolution,
      ticketsPerDay,
      resolutionRate,
    ] = await Promise.all([
      database.query(
        `${filtered.sql} SELECT COUNT(*) as total FROM filtered_tickets`,
        filtered.params,
      ),
      database.query(
        `${filtered.sql}
         SELECT status, COUNT(*) as count
         FROM filtered_tickets
         GROUP BY status`,
        filtered.params,
      ),
      database.query(
        `${filtered.sql}
         SELECT priority, COUNT(*) as count
         FROM filtered_tickets
         GROUP BY priority`,
        filtered.params,
      ),
      database.query(
        `${filtered.sql}
         SELECT
           COALESCE(department, 'ti') as team,
           COUNT(*) as total_tickets,
           COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_tickets,
           COUNT(*) FILTER (WHERE status IN ('open', 'in_progress', 'waiting_user', 'aguardando_confirmacao', 'aguardando_aquisicao', 'aguardando_terceiros')) as pending_tickets,
           COALESCE(
             AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, updated_at) - created_at)) / 3600)
             FILTER (WHERE status IN ('resolved', 'closed')),
             0
           ) as avg_resolution_hours
         FROM filtered_tickets
         GROUP BY COALESCE(department, 'ti')
         ORDER BY CASE COALESCE(department, 'ti')
           WHEN 'ti' THEN 1
           ELSE 2
         END`,
        filtered.params,
      ),
      database.query(
        `${filtered.sql}
         SELECT AVG(${operationalFirstResponseHoursExpr('t')}) as avg_hours
         FROM filtered_tickets t
         WHERE t.first_response_at IS NOT NULL`,
        filtered.params,
      ),
      database.query(
        `${filtered.sql}
         SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, updated_at) - created_at)) / 3600) as avg_hours
         FROM filtered_tickets
         WHERE status IN ('resolved', 'closed')`,
        filtered.params,
      ),
      database.query(
        `${filtered.sql}
         SELECT DATE(created_at) as date, COUNT(*) as count
         FROM filtered_tickets
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY DATE(created_at)
         ORDER BY date DESC`,
        filtered.params,
      ),
      database.query(
        `${filtered.sql}
         SELECT
           COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved,
           COUNT(*) as total
         FROM filtered_tickets`,
        filtered.params,
      ),
    ]);

    const resolved = toInt(resolutionRate.rows[0].resolved);
    const total = toInt(resolutionRate.rows[0].total);
    const resolutionPercentage = total > 0 ? parseFloat(((resolved / total) * 100).toFixed(1)) : 0;

    res.json({
      total: toInt(totalTickets.rows[0].total),
      byStatus: ticketsByStatus.rows.reduce((acc: any, row: any) => {
        acc[row.status] = toInt(row.count);
        return acc;
      }, {}),
      byPriority: ticketsByPriority.rows.reduce((acc: any, row: any) => {
        acc[row.priority] = toInt(row.count);
        return acc;
      }, {}),
      teamBreakdown: teamBreakdown.rows.map((row: any) => {
        const teamTotal = toInt(row.total_tickets);
        const teamResolved = toInt(row.resolved_tickets);
        return {
          key: row.team,
          label: formatTeamLabel(row.team),
          total: teamTotal,
          resolved: teamResolved,
          pending: toInt(row.pending_tickets),
          avgResolutionHours: toFloat(row.avg_resolution_hours).toFixed(1),
          resolutionRate: teamTotal > 0 ? parseFloat(((teamResolved / teamTotal) * 100).toFixed(1)) : 0,
        };
      }),
      avgFirstResponseHours: toFloat(avgFirstResponse.rows[0]?.avg_hours).toFixed(1),
      avgResolutionHours: toFloat(avgResolution.rows[0]?.avg_hours).toFixed(1),
      ticketsPerDay: ticketsPerDay.rows,
      resolutionRate: {
        resolved,
        total,
        percentage: resolutionPercentage
      },
      filters: {
        department: scope.serviceDepartment || 'all',
        requesterDepartment: scope.requesterDepartment,
        dateFrom: scope.dateFrom,
        dateTo: scope.dateTo,
      },
    });
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /stats/technicians - Performance por técnico
 * Mostra estatísticas de cada membro da equipe
 */
reportsRouter.get('/stats/technicians', async (req: Request, res: Response) => {
  try {
    const scope = getReportScope(req, res);
    const filtered = buildFilteredTicketsCte(scope);

    const technicianStats = await database.query(
      `${filtered.sql}
       SELECT
         iu.id,
         iu.name,
         iu.email,
         iu.role,
         COALESCE(t.department, CASE
           WHEN iu.role = 'admin_staff' THEN 'administrativo'
           WHEN iu.role = 'rh_staff' THEN 'rh'
           ELSE 'ti'
         END) as team,
         COUNT(t.id) as total_tickets,
         COUNT(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 END) as resolved_tickets,
         COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed_tickets,
         COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tickets,
         COUNT(CASE WHEN t.status IN ('open', 'waiting_user', 'aguardando_confirmacao') THEN 1 END) as pending_tickets,
         COUNT(CASE WHEN DATE(t.updated_at) = CURRENT_DATE THEN 1 END) as handled_today,
         AVG(EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, t.updated_at) - t.created_at)) / 3600)
           FILTER (WHERE t.status IN ('resolved', 'closed')) as avg_resolution_hours,
         MIN(t.created_at) as first_ticket_date,
         MAX(t.updated_at) as last_activity_date
       FROM internal_users iu
       JOIN filtered_tickets t ON t.assigned_to_id = iu.id
       WHERE iu.role IN ('it_staff', 'admin_staff', 'rh_staff', 'admin') AND iu.is_active = true
       GROUP BY iu.id, iu.name, iu.email, iu.role, COALESCE(t.department, CASE
         WHEN iu.role = 'admin_staff' THEN 'administrativo'
         WHEN iu.role = 'rh_staff' THEN 'rh'
         ELSE 'ti'
       END)
       ORDER BY team ASC, total_tickets DESC, iu.name ASC`,
      filtered.params,
    );

    const formattedStats = technicianStats.rows.map((tech: any) => {
      const totalTickets = toInt(tech.total_tickets);
      const resolvedTickets = toInt(tech.resolved_tickets);
      const resolutionRate = totalTickets > 0
        ? parseFloat(((resolvedTickets / totalTickets) * 100).toFixed(1))
        : 0;

      return {
        id: `${tech.id}:${tech.team}`,
        name: tech.name,
        email: tech.email,
        role: tech.role,
        team: tech.team,
        teamLabel: formatTeamLabel(tech.team),
        totalTickets,
        resolvedTickets,
        closedTickets: toInt(tech.closed_tickets),
        inProgressTickets: toInt(tech.in_progress_tickets),
        pendingTickets: toInt(tech.pending_tickets),
        handledToday: toInt(tech.handled_today),
        avgResolutionHours: toFloat(tech.avg_resolution_hours).toFixed(1),
        resolutionRate,
        slaCompliance: resolutionRate,
        firstTicketDate: tech.first_ticket_date,
        lastActivityDate: tech.last_activity_date
      };
    });

    res.json(formattedStats);
  } catch (error) {
    console.error('Error fetching technician stats:', error);
    res.status(500).json({ error: 'Failed to fetch technician stats' });
  }
});

/**
 * GET /stats/sla - Análise de SLA (Service Level Agreement)
 * Tempo de primeira resposta e resolução
 */
reportsRouter.get('/stats/sla', async (req: Request, res: Response) => {
  try {
    const scope = getReportScope(req, res);
    const filtered = buildFilteredTicketsCte(scope);

    // Analisar cumprimento de SLA com todas as prioridades
    const slaCompliance = await database.query(
      `${filtered.sql}, priorities AS (
         SELECT unnest(ARRAY['critical', 'high', 'medium', 'low']) AS priority
       )
       SELECT 
         p.priority,
         COUNT(t.id) as total,
         COUNT(CASE 
           WHEN t.first_response_at IS NOT NULL AND ${operationalFirstResponseHoursExpr('t')} <= 
             CASE p.priority
               WHEN 'critical' THEN 1
               WHEN 'high' THEN 4
               WHEN 'medium' THEN 8
               WHEN 'low' THEN 24
             END
           THEN 1 
         END) as within_sla_response,
         COUNT(CASE 
           WHEN t.resolved_at IS NOT NULL AND 
                ${operationalHoursExpr('t')} <= 
             CASE p.priority
               WHEN 'critical' THEN 4
               WHEN 'high' THEN 24
               WHEN 'medium' THEN 72
               WHEN 'low' THEN 168
             END
           THEN 1 
         END) as within_sla_resolution,
         AVG(${operationalFirstResponseHoursExpr('t')}) as avg_response_hours,
         AVG(${operationalHoursExpr('t')}) as avg_resolution_hours
       FROM priorities p
       LEFT JOIN filtered_tickets t
         ON CASE WHEN t.priority = 'urgent' THEN 'critical' ELSE t.priority END = p.priority
       GROUP BY p.priority
       ORDER BY CASE p.priority
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'low' THEN 4
       END`,
      filtered.params,
    );

    // Build byPriority array for frontend
    const byPriority = slaCompliance.rows.map((row: any) => {
      const total = parseInt(row.total || 0);
      const withinSlaResponse = parseInt(row.within_sla_response || 0);
      const withinSlaResolution = parseInt(row.within_sla_resolution || 0);
      const withinSLA = Math.min(withinSlaResponse, withinSlaResolution);
      const breachedSLA = total - withinSLA;
      const compliancePercentage = total > 0 ? parseFloat(((withinSLA / total) * 100).toFixed(1)) : 0;

      return {
        priority: row.priority,
        total,
        withinSLA,
        breachedSLA,
        compliancePercentage,
        avgResponseHours: parseFloat(row.avg_response_hours || 0).toFixed(1),
        avgResolutionHours: parseFloat(row.avg_resolution_hours || 0).toFixed(1)
      };
    });

    // Calculate overall stats
    const totalTickets = byPriority.reduce((sum: number, p: any) => sum + p.total, 0);
    const totalWithinSLA = byPriority.reduce((sum: number, p: any) => sum + p.withinSLA, 0);
    const totalBreachedSLA = byPriority.reduce((sum: number, p: any) => sum + p.breachedSLA, 0);
    const overallCompliancePercentage = totalTickets > 0 
      ? parseFloat(((totalWithinSLA / totalTickets) * 100).toFixed(1)) 
      : 0;

    const result = {
      overall: {
        total: totalTickets,
        withinSLA: totalWithinSLA,
        breachedSLA: totalBreachedSLA,
        compliancePercentage: overallCompliancePercentage
      },
      byPriority
    };

    console.log('SLA Stats Result:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('Error fetching SLA stats:', error);
    res.status(500).json({ error: 'Failed to fetch SLA stats' });
  }
});

/**
 * GET /stats/trends - Tendências e análise temporal
 * Dados para gráficos de linha
 */
reportsRouter.get('/stats/trends', async (req: Request, res: Response) => {
  try {
    const { period = '30days' } = req.query;
    const scope = getReportScope(req, res);
    const filtered = buildFilteredTicketsCte(scope);
    
    let interval = '30 days';
    let groupBy = 'DATE(created_at)';
    let dateFormat = 'YYYY-MM-DD';
    
    if (period === '7days') {
      interval = '7 days';
    } else if (period === '90days') {
      interval = '90 days';
    } else if (period === '12months') {
      interval = '12 months';
      groupBy = 'DATE_TRUNC(\'month\', created_at)';
      dateFormat = 'YYYY-MM';
    }

    // Tickets criados por período
    const ticketsCreated = await database.query(
      `${filtered.sql}
       SELECT TO_CHAR(${groupBy}, '${dateFormat}') as date, COUNT(*) as count
       FROM filtered_tickets
       WHERE created_at >= CURRENT_DATE - INTERVAL '${interval}'
       GROUP BY ${groupBy}
       ORDER BY ${groupBy} ASC`,
      filtered.params,
    );

    // Tickets resolvidos por período
    const ticketsResolved = await database.query(
      `${filtered.sql}
       SELECT TO_CHAR(${groupBy.replace('created_at', 'resolved_at')}, '${dateFormat}') as date, COUNT(*) as count
       FROM filtered_tickets
       WHERE resolved_at >= CURRENT_DATE - INTERVAL '${interval}'
       GROUP BY ${groupBy.replace('created_at', 'resolved_at')}
       ORDER BY ${groupBy.replace('created_at', 'resolved_at')} ASC`,
      filtered.params,
    );

    // Distribuição por status (total atual)
    const byStatus = await database.query(
      `${filtered.sql}
       SELECT
         CASE 
           WHEN status = 'open' THEN 'Aberto'
           WHEN status = 'in_progress' THEN 'Em Andamento'
           WHEN status = 'waiting_user' THEN 'Aguardando Usuário'
           WHEN status = 'aguardando_confirmacao' THEN 'Aguardando Confirmação'
           WHEN status = 'resolved' THEN 'Resolvido'
           WHEN status = 'closed' THEN 'Concluído'
           ELSE status
         END as name,
         COUNT(*) as value
       FROM filtered_tickets
       GROUP BY status
       ORDER BY value DESC`,
      filtered.params,
    );

    // Distribuição por prioridade (total atual)
    const byPriority = await database.query(
      `${filtered.sql}
       SELECT
         CASE 
           WHEN priority = 'low' THEN 'Baixa'
           WHEN priority = 'medium' THEN 'Média'
           WHEN priority = 'high' THEN 'Alta'
           WHEN priority = 'urgent' THEN 'Urgente'
           WHEN priority = 'critical' THEN 'Crítica'
           ELSE priority
         END as name,
         COUNT(*) as value
       FROM filtered_tickets
       GROUP BY priority
       ORDER BY 
         CASE priority
           WHEN 'urgent' THEN 1
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END`,
      filtered.params,
    );

    res.json({
      created: ticketsCreated.rows.map((row: any) => ({
        date: row.date,
        count: parseInt(row.count)
      })),
      resolved: ticketsResolved.rows.map((row: any) => ({
        date: row.date,
        count: parseInt(row.count)
      })),
      byStatus: byStatus.rows,
      byPriority: byPriority.rows
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

/**
 * GET /export/tickets - Exportar tickets para CSV
 * Retorna dados formatados para exportação
 */
reportsRouter.get('/export/tickets', async (req: Request, res: Response) => {
  try {
    const tickets = await fetchTicketReportRows(req, res, 1000);

    res.json({
      tickets: tickets.rows.map(formatTicketReportRow),
    });
  } catch (error) {
    console.error('Error exporting tickets:', error);
    res.status(500).json({ error: 'Failed to export tickets' });
  }
});

/**
 * GET /export/excel/tickets - Exportar tickets em formato Excel
 */
reportsRouter.get('/export/excel/tickets', async (req: Request, res: Response) => {
  try {
    const tickets = await fetchTicketReportRows(req, res, 5000);
    const formattedTickets = tickets.rows.map(formatTicketReportRow);

    await ExcelReportService.generateTicketsReport(formattedTickets, res);
  } catch (error) {
    console.error('Error generating Excel report:', error);
    res.status(500).json({ error: 'Failed to generate Excel report' });
  }
});

/**
 * GET /export/excel/technicians - Exportar performance de técnicos em Excel
 */
reportsRouter.get('/export/excel/technicians', async (req: Request, res: Response) => {
  try {
    const scope = getReportScope(req, res);
    const filtered = buildFilteredTicketsCte(scope);

    const technicianStats = await database.query(
      `${filtered.sql}
       SELECT
         iu.id,
         iu.name,
         iu.email,
         iu.role,
         COALESCE(t.department, CASE
           WHEN iu.role = 'admin_staff' THEN 'administrativo'
           WHEN iu.role = 'rh_staff' THEN 'rh'
           ELSE 'ti'
         END) as team,
         COUNT(t.id) as total_tickets,
         COUNT(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 END) as resolved_tickets,
         COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tickets,
         COUNT(CASE WHEN DATE(t.updated_at) = CURRENT_DATE THEN 1 END) as handled_today,
         AVG(EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, t.updated_at) - t.created_at)) / 3600)
           FILTER (WHERE t.status IN ('resolved', 'closed')) as avg_resolution_hours,
         MAX(t.updated_at) as last_activity_date
       FROM internal_users iu
       JOIN filtered_tickets t ON t.assigned_to_id = iu.id
       WHERE iu.role IN ('it_staff', 'admin_staff', 'rh_staff', 'admin') AND iu.is_active = true
       GROUP BY iu.id, iu.name, iu.email, iu.role, COALESCE(t.department, CASE
         WHEN iu.role = 'admin_staff' THEN 'administrativo'
         WHEN iu.role = 'rh_staff' THEN 'rh'
         ELSE 'ti'
       END)
       ORDER BY team ASC, total_tickets DESC, iu.name ASC`,
      filtered.params,
    );

    const formattedStats = technicianStats.rows.map((tech: any) => {
      const totalTickets = toInt(tech.total_tickets);
      const resolvedTickets = toInt(tech.resolved_tickets);

      return {
        id: tech.id,
        name: tech.name,
        email: tech.email,
        team: tech.team,
        teamLabel: formatTeamLabel(tech.team),
        totalTickets,
        resolvedTickets,
        inProgressTickets: toInt(tech.in_progress_tickets),
        handledToday: toInt(tech.handled_today),
        avgResolutionHours: toFloat(tech.avg_resolution_hours).toFixed(1),
        resolutionRate: totalTickets > 0
          ? ((resolvedTickets / totalTickets) * 100).toFixed(1)
          : '0',
        lastActivityDate: tech.last_activity_date
      };
    });

    await ExcelReportService.generateTechniciansReport(formattedStats, res, {
      serviceDepartment: scope.serviceDepartment
        ? serviceDepartmentLabel(scope.serviceDepartment)
        : 'Todos os atendimentos',
      requesterDepartment: scope.requesterDepartment || 'Todos os setores solicitantes',
      period: scope.dateFrom || scope.dateTo
        ? `${scope.dateFrom || 'início'} a ${scope.dateTo || 'hoje'}`
        : 'Todo o histórico',
    });
  } catch (error) {
    console.error('Error generating technicians Excel report:', error);
    res.status(500).json({ error: 'Failed to generate technicians report' });
  }
});

/**
 * GET /export/excel/consolidated - Relatório consolidado completo
 */
reportsRouter.get('/export/excel/consolidated', async (req: Request, res: Response) => {
  try {
    const scope = getReportScope(req, res);
    const filtered = buildFilteredTicketsCte(scope);
    const [totalTickets, ticketsByStatus, ticketsByPriority, avgFirstResponse, avgResolution, resolutionRate, tickets, technicians] = await Promise.all([
      database.query(`${filtered.sql} SELECT COUNT(*) as total FROM filtered_tickets`, filtered.params),
      database.query(`${filtered.sql} SELECT status, COUNT(*) as count FROM filtered_tickets GROUP BY status`, filtered.params),
      database.query(`${filtered.sql} SELECT priority, COUNT(*) as count FROM filtered_tickets GROUP BY priority`, filtered.params),
      database.query(
        `${filtered.sql}
         SELECT AVG(
           GREATEST(0,
             EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600
             - COALESCE((
                 SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(p.ended_at, NOW()) - p.started_at)) / 3600)
                 FROM ticket_sla_pauses p WHERE p.ticket_id = tickets.id
               ), 0)
           )
         ) as avg_hours
         FROM filtered_tickets
         WHERE first_response_at IS NOT NULL`,
        filtered.params,
      ),
      database.query(
        `${filtered.sql}
         SELECT AVG(
           GREATEST(0,
             EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
             - COALESCE((
                 SELECT SUM(EXTRACT(EPOCH FROM (COALESCE(p.ended_at, NOW()) - p.started_at)) / 3600)
                 FROM ticket_sla_pauses p WHERE p.ticket_id = filtered_tickets.id
               ), 0)
           )
         ) as avg_hours
         FROM filtered_tickets WHERE resolved_at IS NOT NULL`,
        filtered.params,
      ),
      database.query(
        `${filtered.sql}
         SELECT
           COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved,
           COUNT(*) as total
         FROM filtered_tickets`,
        filtered.params,
      ),
      fetchTicketReportRows(req, res, 500),
      database.query(
        `${filtered.sql}
         SELECT
           iu.name,
           COALESCE(t.department, CASE
             WHEN iu.role = 'admin_staff' THEN 'administrativo'
             WHEN iu.role = 'rh_staff' THEN 'rh'
             ELSE 'ti'
           END) as team,
           COUNT(t.id) as total_tickets,
           COUNT(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 END) as resolved_tickets,
           AVG(EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, t.updated_at) - t.created_at)) / 3600)
             FILTER (WHERE t.status IN ('resolved', 'closed')) as avg_resolution_hours
         FROM internal_users iu
         JOIN filtered_tickets t ON t.assigned_to_id = iu.id
         WHERE iu.role IN ('it_staff', 'admin_staff', 'rh_staff', 'admin') AND iu.is_active = true
         GROUP BY iu.id, iu.name, iu.role, COALESCE(t.department, CASE
           WHEN iu.role = 'admin_staff' THEN 'administrativo'
           WHEN iu.role = 'rh_staff' THEN 'rh'
           ELSE 'ti'
         END)
         ORDER BY team ASC, total_tickets DESC, iu.name ASC`,
        filtered.params,
      ),
    ]);

    const resolvedTotal = toInt(resolutionRate.rows[0]?.resolved);
    const ticketTotal = toInt(resolutionRate.rows[0]?.total);

    const overview = {
      total: toInt(totalTickets.rows[0]?.total),
      byStatus: ticketsByStatus.rows.reduce((acc: any, row: any) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      byPriority: ticketsByPriority.rows.reduce((acc: any, row: any) => {
        acc[row.priority] = parseInt(row.count);
        return acc;
      }, {}),
      avgFirstResponseHours: parseFloat(avgFirstResponse.rows[0]?.avg_hours || 0).toFixed(1),
      avgResolutionHours: parseFloat(avgResolution.rows[0]?.avg_hours || 0).toFixed(1),
      resolutionRate: {
        resolved: resolvedTotal,
        total: ticketTotal,
        percentage: ticketTotal > 0 ? Number(((resolvedTotal / ticketTotal) * 100).toFixed(1)) : 0,
      },
      filters: {
        serviceDepartment: scope.serviceDepartment ? serviceDepartmentLabel(scope.serviceDepartment) : 'Todos os atendimentos',
        requesterDepartment: scope.requesterDepartment || 'Todos os setores solicitantes',
        period: scope.dateFrom || scope.dateTo
          ? `${scope.dateFrom || 'início'} a ${scope.dateTo || 'hoje'}`
          : 'Todo o histórico',
      },
    };

    const formattedTechnicians = technicians.rows.map((tech: any) => ({
      name: tech.name,
      team: tech.team,
      teamLabel: formatTeamLabel(tech.team),
      totalTickets: toInt(tech.total_tickets),
      resolvedTickets: toInt(tech.resolved_tickets),
      resolutionRate: toInt(tech.total_tickets) > 0 
        ? ((toInt(tech.resolved_tickets) / toInt(tech.total_tickets)) * 100).toFixed(1)
        : '0',
      avgResolutionHours: toFloat(tech.avg_resolution_hours).toFixed(1)
    }));

    await ExcelReportService.generateConsolidatedReport(
      overview,
      tickets.rows.map(formatTicketReportRow),
      formattedTechnicians,
      res
    );
  } catch (error) {
    console.error('Error generating consolidated report:', error);
    res.status(500).json({ error: 'Failed to generate consolidated report' });
  }
});

export default reportsRouter;
