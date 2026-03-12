import { Router, Request, Response } from "express";
import jwt from 'jsonwebtoken';
import { database } from "../database/connection";
import { config } from '../config/environment';
import { UserRole } from '../types/enums';

const dashboardRouter = Router();

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

const calculateDeltaPercent = (current: number, previous: number): number => {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
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

dashboardRouter.get("/admin", async (req: Request, res: Response) => {
  try {
    const user = getInternalUserFromToken(req, res);
    if (!user) {
      return;
    }

    if (![UserRole.ADMIN, UserRole.IT_STAFF].includes(user.role)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    const isITStaffDashboard = user.role === UserRole.IT_STAFF;
    const ticketScopeCondition = isITStaffDashboard
      ? "COALESCE(department, 'ti') = 'ti'"
      : '1=1';
    const ticketScopeConditionWithAlias = isITStaffDashboard
      ? "COALESCE(t.department, 'ti') = 'ti'"
      : '1=1';

    const [
      totalResult,
      statusResult,
      resolvedTodayResult,
      resolvedYesterdayResult,
      openTodayResult,
      inProgressTodayResult,
      totalTicketsTodayResult,
      priorityResult,
      slaAllTimeResult,
      slaTrendResult,
      assetsSummaryResult,
      pendingPurchasesResult,
      assetsMovementTodayResult,
      assetsMaintenanceTodayResult,
      assetsCreatedThisMonthResult,
      recentActivityResult,
    ] = await Promise.all([
      database.query(`SELECT COUNT(*) as count FROM tickets WHERE ${ticketScopeCondition}`),
      database.query(`
        SELECT status, COUNT(*) as count 
        FROM tickets 
        WHERE ${ticketScopeCondition}
        GROUP BY status
      `),
      database.query(`
        SELECT COUNT(*) as count 
        FROM tickets 
        WHERE status IN ('resolved', 'closed')
          AND ${ticketScopeCondition}
          AND DATE(updated_at) = CURRENT_DATE
      `),
      database.query(`
        SELECT COUNT(*) as count
        FROM tickets
        WHERE status IN ('resolved', 'closed')
          AND ${ticketScopeCondition}
          AND DATE(updated_at) = CURRENT_DATE - INTERVAL '1 day'
      `),
      database.query(`
        SELECT COUNT(*) as count
        FROM tickets
        WHERE status = 'open'
          AND ${ticketScopeCondition}
          AND DATE(created_at) = CURRENT_DATE
      `),
      database.query(`
        SELECT COUNT(*) as count
        FROM tickets
        WHERE status = 'in_progress'
          AND ${ticketScopeCondition}
          AND DATE(updated_at) = CURRENT_DATE
      `),
      database.query(`
        SELECT COUNT(*) as count
        FROM tickets
        WHERE ${ticketScopeCondition}
          AND DATE(created_at) = CURRENT_DATE
      `),
      database.query(`
        SELECT priority, COUNT(*) as count 
        FROM tickets 
        WHERE ${ticketScopeCondition}
        GROUP BY priority
      `),
      database.query(`
        SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600), 0) as avg_hours
        FROM tickets
        WHERE status IN ('resolved', 'closed')
          AND ${ticketScopeCondition}
      `),
      database.query(`
        SELECT
          COALESCE(
            AVG(
              CASE
                WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days'
                THEN EXTRACT(EPOCH FROM (updated_at - created_at))/3600
              END
            ),
            0
          ) AS current_week_sla,
          COALESCE(
            AVG(
              CASE
                WHEN updated_at >= CURRENT_DATE - INTERVAL '14 days'
                  AND updated_at < CURRENT_DATE - INTERVAL '7 days'
                THEN EXTRACT(EPOCH FROM (updated_at - created_at))/3600
              END
            ),
            0
          ) AS previous_week_sla
        FROM tickets
        WHERE status IN ('resolved', 'closed')
          AND ${ticketScopeCondition}
      `),
      database.query(`
        SELECT
          COUNT(*) FILTER (WHERE current_status IN ('available', 'in_stock')) AS assets_in_stock,
          COUNT(*) FILTER (WHERE current_status = 'in_use') AS assets_assigned,
          COUNT(*) FILTER (WHERE current_status = 'maintenance') AS assets_in_maintenance,
          COUNT(*) AS total_assets
        FROM inventory_equipment
      `),
      database.query(`
        SELECT COUNT(*) as count
        FROM purchase_requisitions
        WHERE status = 'pending'
      `),
      database.query(`
        SELECT
          COUNT(*) FILTER (WHERE movement_type IN ('delivery', 'transfer') AND DATE(movement_date) = CURRENT_DATE) AS assigned_today,
          COUNT(*) FILTER (WHERE movement_type = 'return' AND DATE(movement_date) = CURRENT_DATE) AS returned_today
        FROM equipment_movements
      `),
      database.query(`
        SELECT COUNT(*) AS maintenance_today
        FROM responsibility_terms
        WHERE return_destination = 'maintenance'
          AND DATE(updated_at) = CURRENT_DATE
      `),
      database.query(`
        SELECT COUNT(*) as count
        FROM inventory_equipment
        WHERE DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
      `),
      database.query(`
        SELECT *
        FROM (
          SELECT
            CONCAT('ticket-created-', t.id::text) AS id,
            'ticket_created' AS event_type,
            COALESCE(t.title, 'Chamado sem título') AS title,
            COALESCE(t.priority, 'medium') AS detail,
            t.created_at AS event_time,
            '/admin/chamados' AS route
          FROM tickets t
          WHERE ${ticketScopeConditionWithAlias}

          UNION ALL

          SELECT
            CONCAT('ticket-resolved-', t.id::text) AS id,
            'ticket_resolved' AS event_type,
            COALESCE(t.title, 'Chamado sem título') AS title,
            COALESCE(t.status, 'resolved') AS detail,
            t.updated_at AS event_time,
            '/admin/chamados?status=resolved' AS route
          FROM tickets t
          WHERE t.status IN ('resolved', 'closed')
            AND ${ticketScopeConditionWithAlias}

          UNION ALL

          SELECT
            CONCAT('asset-movement-', em.id::text) AS id,
            CASE
              WHEN em.movement_type IN ('delivery', 'transfer') THEN 'asset_assigned'
              WHEN em.movement_type = 'return' THEN 'asset_returned'
              ELSE 'asset_returned'
            END AS event_type,
            CONCAT(COALESCE(ie.internal_code, 'EQ'), ' • ', COALESCE(ie.type, 'Equipamento')) AS title,
            COALESCE(em.to_user_name, em.from_user_name, em.to_location, em.from_location, 'Sem responsável') AS detail,
            em.movement_date AS event_time,
            '/admin/estoque' AS route
          FROM equipment_movements em
          JOIN inventory_equipment ie ON ie.id = em.equipment_id
          WHERE em.movement_type IN ('delivery', 'transfer', 'return')

          UNION ALL

          SELECT
            CONCAT('asset-maintenance-', rt.id::text) AS id,
            'asset_maintenance' AS event_type,
            CONCAT(COALESCE(ie.internal_code, 'EQ'), ' • ', COALESCE(ie.type, 'Equipamento')) AS title,
            COALESCE(NULLIF(rt.return_problems, ''), 'Encaminhado para manutenção') AS detail,
            rt.updated_at AS event_time,
            '/admin/estoque?status=maintenance' AS route
          FROM responsibility_terms rt
          JOIN inventory_equipment ie ON ie.id = rt.equipment_id
          WHERE rt.return_destination = 'maintenance'
        ) AS events
        ORDER BY event_time DESC
        LIMIT 12
      `),
    ]);

    const totalTickets = toInt(totalResult.rows[0]?.count);

    const ticketsByStatus: Record<string, number> = {};
    let openTickets = 0;
    let inProgressTickets = 0;

    statusResult.rows.forEach((row: { status: string; count: string }) => {
      const status = row.status;
      const count = toInt(row.count);
      ticketsByStatus[status] = count;

      if (status === 'open') {
        openTickets = count;
      } else if (status === 'in_progress') {
        inProgressTickets = count;
      }
    });

    const resolvedTickets = toInt(resolvedTodayResult.rows[0]?.count);
    const resolvedYesterday = toInt(resolvedYesterdayResult.rows[0]?.count);
    const openToday = toInt(openTodayResult.rows[0]?.count);
    const inProgressToday = toInt(inProgressTodayResult.rows[0]?.count);
    const totalCreatedToday = toInt(totalTicketsTodayResult.rows[0]?.count);
    const resolvedChangePercent = calculateDeltaPercent(resolvedTickets, resolvedYesterday);

    const ticketsByPriority: Record<string, number> = {};
    priorityResult.rows.forEach((row: { priority: string; count: string }) => {
      ticketsByPriority[row.priority] = toInt(row.count);
    });

    const allTimeSla = toFloat(slaAllTimeResult.rows[0]?.avg_hours);
    const currentWeekSla = toFloat(slaTrendResult.rows[0]?.current_week_sla);
    const previousWeekSla = toFloat(slaTrendResult.rows[0]?.previous_week_sla);

    const averageSLA = Number((currentWeekSla > 0 ? currentWeekSla : allTimeSla).toFixed(1));
    const previousAverageSLA = Number((previousWeekSla > 0 ? previousWeekSla : allTimeSla).toFixed(1));

    const assetsInStock = toInt(assetsSummaryResult.rows[0]?.assets_in_stock);
    const assetsAssigned = toInt(assetsSummaryResult.rows[0]?.assets_assigned);
    const assetsInMaintenance = toInt(assetsSummaryResult.rows[0]?.assets_in_maintenance);
    const totalAssets = toInt(assetsSummaryResult.rows[0]?.total_assets);
    const pendingPurchases = toInt(pendingPurchasesResult.rows[0]?.count);

    const assetsAssignedToday = toInt(assetsMovementTodayResult.rows[0]?.assigned_today);
    const assetsReturnedToday = toInt(assetsMovementTodayResult.rows[0]?.returned_today);
    const assetsMaintenanceToday = toInt(assetsMaintenanceTodayResult.rows[0]?.maintenance_today);
    const assetsAddedThisMonth = toInt(assetsCreatedThisMonthResult.rows[0]?.count);

    const recentActivity = recentActivityResult.rows.map((row: {
      id: string;
      event_type: string;
      title: string;
      detail: string;
      event_time: string | Date;
      route: string;
    }) => ({
      id: row.id,
      type: row.event_type,
      title: row.title,
      detail: row.detail,
      timestamp: new Date(row.event_time).toISOString(),
      route: row.route,
    }));

    res.json({
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      averageSLA,
      previousAverageSLA,
      ticketsByStatus,
      ticketsByPriority,
      ticketIndicators: {
        openToday,
        inProgressToday,
        totalCreatedToday,
        resolvedChangePercent,
      },
      assets: {
        inStock: assetsInStock,
        assigned: assetsAssigned,
        inMaintenance: assetsInMaintenance,
        total: totalAssets,
        assignedToday: assetsAssignedToday,
        returnedToday: assetsReturnedToday,
        maintenanceToday: assetsMaintenanceToday,
        addedThisMonth: assetsAddedThisMonth,
      },
      pendingPurchases,
      recentActivity,
    });
  } catch (error) {
    console.error("Erro ao buscar dashboard admin:", error);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

dashboardRouter.get('/admin-staff', async (req: Request, res: Response) => {
  try {
    const user = getInternalUserFromToken(req, res);
    if (!user) {
      return;
    }

    if (user.role !== UserRole.ADMIN_STAFF) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    const [myTicketsResult, myStatusResult, pendingDeptResult, recentTicketsResult] = await Promise.all([
      database.query(
        `SELECT COUNT(*) AS count
         FROM tickets
         WHERE assigned_to_id = $1`,
        [user.id]
      ),
      database.query(
        `SELECT status, COUNT(*) AS count
         FROM tickets
         WHERE assigned_to_id = $1
         GROUP BY status`,
        [user.id]
      ),
      database.query(
        `SELECT COUNT(*) AS count
         FROM tickets
         WHERE COALESCE(department, 'ti') = 'administrativo'
           AND status IN ('open', 'in_progress', 'waiting_user')`,
      ),
      database.query(
        `SELECT id, title, status, priority, created_at, updated_at
         FROM tickets
         WHERE assigned_to_id = $1
         ORDER BY updated_at DESC
         LIMIT 8`,
        [user.id]
      ),
    ]);

    const myTicketsByStatus: Record<string, number> = {};
    myStatusResult.rows.forEach((row: { status: string; count: string }) => {
      myTicketsByStatus[row.status] = toInt(row.count);
    });

    const myTicketsTotal = toInt(myTicketsResult.rows[0]?.count);
    const myOpenTickets = myTicketsByStatus.open ?? 0;
    const myInProgressTickets = myTicketsByStatus.in_progress ?? 0;
    const myWaitingTickets = myTicketsByStatus.waiting_user ?? 0;
    const myResolvedTickets = (myTicketsByStatus.resolved ?? 0) + (myTicketsByStatus.closed ?? 0);

    res.json({
      myTicketsTotal,
      myOpenTickets,
      myInProgressTickets,
      myWaitingTickets,
      myResolvedTickets,
      administrativePendingTotal: toInt(pendingDeptResult.rows[0]?.count),
      recentTickets: recentTicketsResult.rows,
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard do auxiliar administrativo:', error);
    res.status(500).json({ error: 'Failed to load admin staff dashboard data' });
  }
});

dashboardRouter.get("/gestor", async (req: Request, res: Response) => {
  try {
    const user = getInternalUserFromToken(req, res);
    if (!user) {
      return;
    }

    if (![UserRole.MANAGER, UserRole.ADMIN].includes(user.role)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    // Total de chamados
    const totalResult = await database.query("SELECT COUNT(*) as count FROM tickets");
    const totalTickets = parseInt(totalResult.rows[0].count);

    // Chamados por status
    const statusResult = await database.query(`
      SELECT status, COUNT(*) as count 
      FROM tickets 
      GROUP BY status
    `);

    const ticketsByStatus: Record<string, number> = {};
    let openTickets = 0;
    let inProgressTickets = 0;
    let resolvedTickets = 0;

    statusResult.rows.forEach((row: any) => {
      const status = row.status;
      const count = parseInt(row.count);
      ticketsByStatus[status] = count;

      if (status === 'open') openTickets = count;
      else if (status === 'in_progress') inProgressTickets = count;
      // NÃO mais contar resolved/closed aqui - será contado abaixo apenas os de HOJE
    });

    // Contar tickets resolvidos HOJE (não todos)
    const resolvedTodayResult = await database.query(`
      SELECT COUNT(*) as count 
      FROM tickets 
      WHERE (status = 'resolved' OR status = 'closed')
        AND DATE(updated_at) = CURRENT_DATE
    `);
    resolvedTickets = parseInt(resolvedTodayResult.rows[0].count || 0);

    // Chamados por prioridade
    const priorityResult = await database.query(`
      SELECT priority, COUNT(*) as count 
      FROM tickets 
      GROUP BY priority
    `);

    const ticketsByPriority: Record<string, number> = {};
    priorityResult.rows.forEach((row: any) => {
      ticketsByPriority[row.priority] = parseInt(row.count);
    });

    // Calcular tempo médio de resolução em horas
    const slaResult = await database.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours
      FROM tickets
      WHERE status IN ('resolved', 'closed')
    `);

    const averageResolutionTime = slaResult.rows[0].avg_hours 
      ? Math.round(parseFloat(slaResult.rows[0].avg_hours))
      : 0;

    // Tendência mensal (últimos 6 meses)
    const monthlyTrendResult = await database.query(`
      SELECT 
        TO_CHAR(created_at, 'Mon') as month,
        COUNT(*) as tickets
      FROM tickets
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
      ORDER BY EXTRACT(MONTH FROM created_at) DESC
      LIMIT 6
    `);

    const monthlyTrend = monthlyTrendResult.rows.map((row: any) => ({
      month: row.month,
      tickets: parseInt(row.tickets)
    }));

    // Top issues (tipos de chamados mais comuns)
    const topIssuesResult = await database.query(`
      SELECT type as title, COUNT(*) as count
      FROM tickets
      WHERE created_at >= NOW() - INTERVAL '3 months'
      GROUP BY type
      ORDER BY count DESC
      LIMIT 5
    `);

    const topIssues = topIssuesResult.rows.map((row: any) => ({
      title: row.title,
      count: parseInt(row.count)
    }));

    // Estatísticas por departamento (mock - adaptável conforme estrutura)
    const departmentStats = {
      'TI': { tickets: openTickets + inProgressTickets, resolved: resolvedTickets },
      'Suporte': { tickets: Math.floor(totalTickets * 0.3), resolved: Math.floor(resolvedTickets * 0.4) }
    };

    // Satisfação do usuário (mock - implementar com pesquisas reais)
    const userSatisfaction = 87;

    res.json({
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      averageResolutionTime,
      userSatisfaction,
      ticketsByStatus,
      ticketsByPriority,
      monthlyTrend,
      topIssues,
      departmentStats,
    });
  } catch (error) {
    console.error("Erro ao buscar dashboard gestor:", error);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

export default dashboardRouter;