import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { database } from '../database/connection';
import { config } from '../config/environment';
import { UserRole } from '../types/enums';
import { ExcelReportService } from '../services/excelReportService';

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

  if (![UserRole.ADMIN, UserRole.IT_STAFF, UserRole.ADMIN_STAFF, UserRole.MANAGER].includes(user.role)) {
    res.status(403).json({ error: 'Acesso negado' });
    return null;
  }

  return user;
};

const formatTeamLabel = (team: string): string =>
  team === 'administrativo' ? 'Assistente Administrativo' : 'TI';

reportsRouter.use((req: Request, res: Response, next) => {
  const user = ensureReportsAccess(req, res);
  if (!user) {
    return;
  }

  next();
});

/**
 * GET /satisfaction - Indicadores de satisfação de atendimento
 */
reportsRouter.get('/satisfaction', async (req: Request, res: Response) => {
  try {
    const { date_from, date_to, department } = req.query as {
      date_from?: string;
      date_to?: string;
      department?: string;
    };

    const baseConditions: string[] = ['t.rating IS NOT NULL'];
    const params: any[] = [];
    let paramCount = 1;

    if (date_from) {
      baseConditions.push(`t.rated_at >= $${paramCount}`);
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      baseConditions.push(`t.rated_at <= $${paramCount}`);
      params.push(date_to);
      paramCount++;
    }

    if (department && department !== 'all') {
      baseConditions.push(`COALESCE(t.department, 'ti') = $${paramCount}`);
      params.push(department);
      paramCount++;
    }

    const whereClause = `WHERE ${baseConditions.join(' AND ')}`;

    const [overallResult, byStaffResult, byDepartmentResult, feedbackEntriesResult] = await Promise.all([
      database.query(
        `SELECT
           COALESCE(AVG(rating), 0) AS avg_rating,
           COUNT(*) FILTER (WHERE rating IS NOT NULL) AS total_ratings,
           COUNT(*) FILTER (WHERE rating >= 4) AS positive_ratings
         FROM tickets t
         ${whereClause}`,
        params,
      ),
      database.query(
        `SELECT
           iu.id AS staff_id,
           iu.name AS staff_name,
           COUNT(*) FILTER (WHERE t.rating IS NOT NULL) AS total_ratings,
           COALESCE(AVG(t.rating), 0) AS avg_rating,
           COUNT(*) FILTER (WHERE t.rating >= 4) AS positive_ratings
         FROM internal_users iu
         JOIN tickets t ON t.assigned_to_id = iu.id
         WHERE iu.role IN ('it_staff', 'admin_staff', 'admin')
           AND ${baseConditions.join(' AND ')}
         GROUP BY iu.id, iu.name
         HAVING COUNT(*) FILTER (WHERE t.rating IS NOT NULL) > 0
         ORDER BY avg_rating DESC, total_ratings DESC`,
        params,
      ),
      database.query(
        `SELECT
           COALESCE(t.department, 'ti') AS department,
           COUNT(*) FILTER (WHERE t.rating IS NOT NULL) AS total_ratings,
           COALESCE(AVG(t.rating), 0) AS avg_rating,
           COUNT(*) FILTER (WHERE t.rating >= 4) AS positive_ratings
         FROM tickets t
         ${whereClause}
         GROUP BY COALESCE(t.department, 'ti')
         ORDER BY avg_rating DESC, total_ratings DESC`,
        params,
      ),
      database.query(
        `SELECT
           t.id AS ticket_id,
           t.title AS ticket_title,
           t.rating,
           t.feedback,
           t.rated_at,
           COALESCE(t.department, 'ti') AS department,
           iu.name AS assignee_name,
           pu.name AS requester_name
         FROM tickets t
         LEFT JOIN internal_users iu ON iu.id = t.assigned_to_id
         LEFT JOIN public_users pu ON pu.id = t.requester_id AND t.requester_type = 'public'
         ${whereClause}
           AND t.feedback IS NOT NULL
           AND LENGTH(TRIM(t.feedback)) > 0
         ORDER BY t.rated_at DESC
         LIMIT 100`,
        params,
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
          departmentLabel: row.department === 'administrativo' ? 'Administrativo' : 'TI',
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
        departmentLabel: row.department === 'administrativo' ? 'Administrativo' : 'TI',
        assigneeName: row.assignee_name || 'Não atribuído',
        requesterName: row.requester_name || 'Solicitante',
      })),
      filters: {
        date_from: date_from || null,
        date_to: date_to || null,
        department: department || 'all',
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
    const { date_from, date_to } = req.query;
    
    // Construir condição de data
    let dateCondition = '';
    const params: any[] = [];
    
    if (date_from && date_to) {
      dateCondition = 'WHERE created_at BETWEEN $1 AND $2';
      params.push(date_from, date_to);
    } else if (date_from) {
      dateCondition = 'WHERE created_at >= $1';
      params.push(date_from);
    } else if (date_to) {
      dateCondition = 'WHERE created_at <= $1';
      params.push(date_to);
    }

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
        `SELECT COUNT(*) as total FROM tickets ${dateCondition}`,
        params
      ),
      database.query(
        `SELECT status, COUNT(*) as count 
         FROM tickets ${dateCondition}
         GROUP BY status`,
        params
      ),
      database.query(
        `SELECT priority, COUNT(*) as count 
         FROM tickets ${dateCondition}
         GROUP BY priority`,
        params
      ),
      database.query(
        `SELECT
           COALESCE(department, 'ti') as team,
           COUNT(*) as total_tickets,
           COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_tickets,
           COUNT(*) FILTER (WHERE status IN ('open', 'in_progress', 'waiting_user', 'aguardando_confirmacao')) as pending_tickets,
           COALESCE(
             AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, updated_at) - created_at)) / 3600)
             FILTER (WHERE status IN ('resolved', 'closed')),
             0
           ) as avg_resolution_hours
         FROM tickets
         ${dateCondition}
         GROUP BY COALESCE(department, 'ti')
         ORDER BY CASE COALESCE(department, 'ti')
           WHEN 'ti' THEN 1
           ELSE 2
         END`,
        params
      ),
      database.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (t.first_response_at - t.created_at)) / 3600) as avg_hours
         FROM tickets t
         ${dateCondition ? dateCondition + ' AND t.first_response_at IS NOT NULL' : 'WHERE t.first_response_at IS NOT NULL'}`,
        params
      ),
      database.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, updated_at) - created_at)) / 3600) as avg_hours
         FROM tickets
         WHERE status IN ('resolved', 'closed') ${dateCondition ? 'AND ' + dateCondition.replace('WHERE ', '') : ''}`,
        params
      ),
      database.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM tickets
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY DATE(created_at)
         ORDER BY date DESC`
      ),
      database.query(
        `SELECT 
           COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved,
           COUNT(*) as total
         FROM tickets ${dateCondition}`,
        params
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
      }
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
    const { date_from, date_to } = req.query;
    
    let dateCondition = '';
    const params: any[] = [];
    
    if (date_from && date_to) {
      dateCondition = 'AND t.created_at BETWEEN $1 AND $2';
      params.push(date_from, date_to);
    } else if (date_from) {
      dateCondition = 'AND t.created_at >= $1';
      params.push(date_from);
    } else if (date_to) {
      dateCondition = 'AND t.created_at <= $1';
      params.push(date_to);
    }

    const technicianStats = await database.query(
      `SELECT 
         iu.id,
         iu.name,
         iu.email,
         iu.role,
         CASE WHEN iu.role = 'admin_staff' THEN 'administrativo' ELSE 'ti' END as team,
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
       LEFT JOIN tickets t ON t.assigned_to_id = iu.id ${dateCondition}
       WHERE iu.role IN ('it_staff', 'admin_staff', 'admin') AND iu.is_active = true
       GROUP BY iu.id, iu.name, iu.email, iu.role
       ORDER BY CASE WHEN iu.role = 'admin_staff' THEN 2 ELSE 1 END, total_tickets DESC, iu.name ASC`,
      params
    );

    const formattedStats = technicianStats.rows.map((tech: any) => {
      const totalTickets = toInt(tech.total_tickets);
      const resolvedTickets = toInt(tech.resolved_tickets);
      const resolutionRate = totalTickets > 0
        ? parseFloat(((resolvedTickets / totalTickets) * 100).toFixed(1))
        : 0;

      return {
        id: tech.id,
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
    const { date_from, date_to } = req.query;
    
    let dateFilter = '';
    const params: any[] = [];
    
    if (date_from && date_to) {
      dateFilter = 'AND t.created_at BETWEEN $1 AND $2';
      params.push(date_from, date_to);
    }

    // Analisar cumprimento de SLA com todas as prioridades
    const slaCompliance = await database.query(
      `WITH priorities AS (
         SELECT unnest(ARRAY['critical', 'high', 'medium', 'low']) AS priority
       )
       SELECT 
         p.priority,
         COUNT(t.id) as total,
         COUNT(CASE 
           WHEN t.first_response_at IS NOT NULL AND EXTRACT(EPOCH FROM (t.first_response_at - t.created_at)) / 3600 <= 
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
                EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600 <= 
             CASE p.priority
               WHEN 'critical' THEN 4
               WHEN 'high' THEN 24
               WHEN 'medium' THEN 72
               WHEN 'low' THEN 168
             END
           THEN 1 
         END) as within_sla_resolution,
         AVG(EXTRACT(EPOCH FROM (t.first_response_at - t.created_at)) / 3600) as avg_response_hours,
         AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600) as avg_resolution_hours
       FROM priorities p
       LEFT JOIN tickets t ON t.priority = p.priority ${dateFilter}
       GROUP BY p.priority
       ORDER BY CASE p.priority
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'low' THEN 4
       END`,
      params
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
      `SELECT TO_CHAR(${groupBy}, '${dateFormat}') as date, COUNT(*) as count
       FROM tickets
       WHERE created_at >= CURRENT_DATE - INTERVAL '${interval}'
       GROUP BY ${groupBy}
       ORDER BY ${groupBy} ASC`
    );

    // Tickets resolvidos por período
    const ticketsResolved = await database.query(
      `SELECT TO_CHAR(${groupBy.replace('created_at', 'resolved_at')}, '${dateFormat}') as date, COUNT(*) as count
       FROM tickets
       WHERE resolved_at >= CURRENT_DATE - INTERVAL '${interval}'
       GROUP BY ${groupBy.replace('created_at', 'resolved_at')}
       ORDER BY ${groupBy.replace('created_at', 'resolved_at')} ASC`
    );

    // Distribuição por status (total atual)
    const byStatus = await database.query(
      `SELECT 
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
       FROM tickets
       GROUP BY status
       ORDER BY value DESC`
    );

    // Distribuição por prioridade (total atual)
    const byPriority = await database.query(
      `SELECT 
         CASE 
           WHEN priority = 'low' THEN 'Baixa'
           WHEN priority = 'medium' THEN 'Média'
           WHEN priority = 'high' THEN 'Alta'
           WHEN priority = 'critical' THEN 'Crítica'
           ELSE priority
         END as name,
         COUNT(*) as value
       FROM tickets
       GROUP BY priority
       ORDER BY 
         CASE priority
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END`
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
    const { status, priority, date_from, date_to, assigned_to } = req.query;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`t.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (priority) {
      conditions.push(`t.priority = $${paramCount}`);
      params.push(priority);
      paramCount++;
    }

    if (date_from) {
      conditions.push(`t.created_at >= $${paramCount}`);
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      conditions.push(`t.created_at <= $${paramCount}`);
      params.push(date_to);
      paramCount++;
    }

    if (assigned_to) {
      conditions.push(`t.assigned_to_id = $${paramCount}`);
      params.push(assigned_to);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const tickets = await database.query(
      `SELECT 
         t.id,
         t.title,
         t.description,
         t.status,
         t.priority,
         t.type,
         t.created_at,
         t.updated_at,
         t.resolved_at,
         COALESCE(pu.name, iu_req.name) as requester_name,
         COALESCE(pu.email, iu_req.email) as requester_email,
         iu_assigned.name as assigned_to_name,
         iu_assigned.email as assigned_to_email,
         EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, NOW()) - t.created_at)) / 3600 as time_open_hours
       FROM tickets t
       LEFT JOIN public_users pu ON t.requester_type = 'public' AND t.requester_id = pu.id
       LEFT JOIN internal_users iu_req ON t.requester_type = 'internal' AND t.requester_id = iu_req.id
       LEFT JOIN internal_users iu_assigned ON t.assigned_to_id = iu_assigned.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT 1000`,
      params
    );

    res.json({
      tickets: tickets.rows.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        type: t.type,
        requesterName: t.requester_name,
        requesterEmail: t.requester_email,
        assignedToName: t.assigned_to_name || 'Não atribuído',
        assignedToEmail: t.assigned_to_email || '',
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        resolvedAt: t.resolved_at,
        timeOpenHours: parseFloat(t.time_open_hours || 0).toFixed(1)
      }))
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
    const { status, priority, date_from, date_to, assigned_to } = req.query;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`t.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (priority) {
      conditions.push(`t.priority = $${paramCount}`);
      params.push(priority);
      paramCount++;
    }

    if (date_from) {
      conditions.push(`t.created_at >= $${paramCount}`);
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      conditions.push(`t.created_at <= $${paramCount}`);
      params.push(date_to);
      paramCount++;
    }

    if (assigned_to && assigned_to !== 'unassigned') {
      conditions.push(`t.assigned_to_id = $${paramCount}`);
      params.push(assigned_to);
      paramCount++;
    } else if (assigned_to === 'unassigned') {
      conditions.push('t.assigned_to_id IS NULL');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const tickets = await database.query(
      `SELECT 
         t.id,
         t.title,
         t.description,
         t.status,
         t.priority,
         t.type,
         t.created_at,
         t.updated_at,
         t.resolved_at,
         COALESCE(pu.name, iu_req.name) as requester_name,
         COALESCE(pu.email, iu_req.email) as requester_email,
         iu_assigned.name as assigned_to_name,
         iu_assigned.email as assigned_to_email,
         EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, NOW()) - t.created_at)) / 3600 as time_open_hours
       FROM tickets t
       LEFT JOIN public_users pu ON t.requester_type = 'public' AND t.requester_id = pu.id
       LEFT JOIN internal_users iu_req ON t.requester_type = 'internal' AND t.requester_id = iu_req.id
       LEFT JOIN internal_users iu_assigned ON t.assigned_to_id = iu_assigned.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT 5000`,
      params
    );

    const formattedTickets = tickets.rows.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      type: t.type,
      requesterName: t.requester_name,
      requesterEmail: t.requester_email,
      assignedToName: t.assigned_to_name || 'Não atribuído',
      assignedToEmail: t.assigned_to_email || '',
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      resolvedAt: t.resolved_at,
      timeOpenHours: parseFloat(t.time_open_hours || 0).toFixed(1)
    }));

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
    const { date_from, date_to } = req.query;
    
    let dateCondition = '';
    const params: any[] = [];
    
    if (date_from && date_to) {
      dateCondition = 'AND t.created_at BETWEEN $1 AND $2';
      params.push(date_from, date_to);
    } else if (date_from) {
      dateCondition = 'AND t.created_at >= $1';
      params.push(date_from);
    } else if (date_to) {
      dateCondition = 'AND t.created_at <= $1';
      params.push(date_to);
    }

    const technicianStats = await database.query(
      `SELECT 
         iu.id,
         iu.name,
         iu.email,
         iu.role,
         CASE WHEN iu.role = 'admin_staff' THEN 'administrativo' ELSE 'ti' END as team,
         COUNT(t.id) as total_tickets,
         COUNT(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 END) as resolved_tickets,
         COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tickets,
         COUNT(CASE WHEN DATE(t.updated_at) = CURRENT_DATE THEN 1 END) as handled_today,
         AVG(EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, t.updated_at) - t.created_at)) / 3600)
           FILTER (WHERE t.status IN ('resolved', 'closed')) as avg_resolution_hours,
         MAX(t.updated_at) as last_activity_date
       FROM internal_users iu
       LEFT JOIN tickets t ON t.assigned_to_id = iu.id ${dateCondition}
       WHERE iu.role IN ('it_staff', 'admin_staff', 'admin') AND iu.is_active = true
       GROUP BY iu.id, iu.name, iu.email, iu.role
       ORDER BY CASE WHEN iu.role = 'admin_staff' THEN 2 ELSE 1 END, total_tickets DESC, iu.name ASC`,
      params
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

    await ExcelReportService.generateTechniciansReport(formattedStats, res);
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
    // Buscar visão geral
    const totalTickets = await database.query('SELECT COUNT(*) as total FROM tickets');
    const ticketsByStatus = await database.query(
      'SELECT status, COUNT(*) as count FROM tickets GROUP BY status'
    );
    const ticketsByPriority = await database.query(
      'SELECT priority, COUNT(*) as count FROM tickets GROUP BY priority'
    );
    const avgFirstResponse = await database.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600) as avg_hours
       FROM tickets
       WHERE first_response_at IS NOT NULL`
    );
    const avgResolution = await database.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_hours
       FROM tickets WHERE resolved_at IS NOT NULL`
    );
    const resolutionRate = await database.query(
      `SELECT 
         COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved,
         COUNT(*) as total
       FROM tickets`
    );

    const overview = {
      total: parseInt(totalTickets.rows[0].total),
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
        resolved: parseInt(resolutionRate.rows[0].resolved),
        total: parseInt(resolutionRate.rows[0].total),
        percentage: parseFloat(((parseInt(resolutionRate.rows[0].resolved) / parseInt(resolutionRate.rows[0].total)) * 100).toFixed(1))
      }
    };

    // Buscar tickets recentes
    const tickets = await database.query(
      `SELECT 
         t.id, t.title, t.status, t.priority, t.type, t.created_at,
         COALESCE(pu.name, iu_req.name) as requester_name,
         iu_assigned.name as assigned_to_name
       FROM tickets t
       LEFT JOIN public_users pu ON t.requester_type = 'public' AND t.requester_id = pu.id
       LEFT JOIN internal_users iu_req ON t.requester_type = 'internal' AND t.requester_id = iu_req.id
       LEFT JOIN internal_users iu_assigned ON t.assigned_to_id = iu_assigned.id
       ORDER BY t.created_at DESC
       LIMIT 500`
    );

    // Buscar técnicos
    const technicians = await database.query(
      `SELECT 
         iu.name,
         CASE WHEN iu.role = 'admin_staff' THEN 'administrativo' ELSE 'ti' END as team,
         COUNT(t.id) as total_tickets,
         COUNT(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 END) as resolved_tickets,
         AVG(EXTRACT(EPOCH FROM (COALESCE(t.resolved_at, t.updated_at) - t.created_at)) / 3600)
           FILTER (WHERE t.status IN ('resolved', 'closed')) as avg_resolution_hours
       FROM internal_users iu
       LEFT JOIN tickets t ON t.assigned_to_id = iu.id
       WHERE iu.role IN ('it_staff', 'admin_staff', 'admin') AND iu.is_active = true
       GROUP BY iu.id, iu.name, iu.role
       ORDER BY CASE WHEN iu.role = 'admin_staff' THEN 2 ELSE 1 END, total_tickets DESC, iu.name ASC`
    );

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
      tickets.rows,
      formattedTechnicians,
      res
    );
  } catch (error) {
    console.error('Error generating consolidated report:', error);
    res.status(500).json({ error: 'Failed to generate consolidated report' });
  }
});

export default reportsRouter;
