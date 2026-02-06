import { Router, Request, Response } from "express";
import { database } from "../database/connection";

const dashboardRouter = Router();

dashboardRouter.get("/admin", async (req: Request, res: Response) => {
  try {
    // Total de chamados
    const totalResult = await database.query("SELECT COUNT(*) as count FROM tickets");
    const totalTickets = parseInt(totalResult.rows[0].count);

    // Debug: Ver todos os status dos chamados
    const debugStatus = await database.query("SELECT status, COUNT(*) as count FROM tickets GROUP BY status");
    console.log('Status dos chamados:', debugStatus.rows);

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

      console.log(`Status: ${status}, Count: ${count}`);

      if (status === 'open') openTickets = count;
      else if (status === 'in_progress') inProgressTickets = count;
      else if (status === 'resolved' || status === 'closed') resolvedTickets += count;
    });

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

    // Calcular SLA médio (tempo médio de resolução em horas)
    const slaResult = await database.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_hours
      FROM tickets
      WHERE status IN ('resolved', 'closed')
    `);

    const averageSLA = slaResult.rows[0].avg_hours 
      ? Math.round(parseFloat(slaResult.rows[0].avg_hours))
      : 0;

    res.json({
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      averageSLA,
      ticketsByStatus,
      ticketsByPriority,
    });
  } catch (error) {
    console.error("Erro ao buscar dashboard admin:", error);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

dashboardRouter.get("/gestor", async (req: Request, res: Response) => {
  try {
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
      else if (status === 'resolved' || status === 'closed') resolvedTickets += count;
    });

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