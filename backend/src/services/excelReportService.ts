import ExcelJS from 'exceljs';
import { Response } from 'express';

export class ExcelReportService {
  /**
   * Gerar relatório de tickets em Excel
   */
  static async generateTicketsReport(
    tickets: any[],
    res: Response,
    filename: string = 'relatorio-tickets'
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tickets');

    // Configurar colunas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Título', key: 'title', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Prioridade', key: 'priority', width: 12 },
      { header: 'Tipo', key: 'type', width: 15 },
      { header: 'Solicitante', key: 'requester', width: 25 },
      { header: 'Atribuído a', key: 'assigned_to', width: 25 },
      { header: 'Criado em', key: 'created_at', width: 18 },
      { header: 'Resolvido em', key: 'resolved_at', width: 18 },
      { header: 'Tempo Aberto (h)', key: 'time_open_hours', width: 16 },
    ];

    // Estilizar cabeçalho
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF007A33' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Adicionar dados
    tickets.forEach((ticket) => {
      worksheet.addRow({
        id: ticket.id.substring(0, 8),
        title: ticket.title,
        status: this.translateStatus(ticket.status),
        priority: this.translatePriority(ticket.priority),
        type: ticket.type,
        requester: ticket.requesterName || 'N/A',
        assigned_to: ticket.assignedToName || 'Não atribuído',
        created_at: ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('pt-BR') : '',
        resolved_at: ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString('pt-BR') : 'Em aberto',
        time_open_hours: ticket.timeOpenHours
      });
    });

    // Adicionar filtros automáticos
    worksheet.autoFilter = {
      from: 'A1',
      to: 'J1'
    };

    // Configurar resposta HTTP
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filename}-${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Gerar relatório de performance de técnicos
   */
  static async generateTechniciansReport(
    technicians: any[],
    res: Response
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Performance Técnicos');

    worksheet.columns = [
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 35 },
      { header: 'Total Tickets', key: 'total', width: 15 },
      { header: 'Resolvidos', key: 'resolved', width: 12 },
      { header: 'Em Progresso', key: 'in_progress', width: 15 },
      { header: 'Taxa Resolução (%)', key: 'resolution_rate', width: 18 },
      { header: 'Tempo Médio (h)', key: 'avg_hours', width: 16 },
      { header: 'Última Atividade', key: 'last_activity', width: 18 },
    ];

    // Estilizar cabeçalho
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90E2' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    technicians.forEach((tech) => {
      worksheet.addRow({
        name: tech.name,
        email: tech.email,
        total: tech.totalTickets,
        resolved: tech.resolvedTickets,
        in_progress: tech.inProgressTickets,
        resolution_rate: tech.resolutionRate,
        avg_hours: tech.avgResolutionHours,
        last_activity: tech.lastActivityDate 
          ? new Date(tech.lastActivityDate).toLocaleString('pt-BR')
          : 'N/A'
      });
    });

    worksheet.autoFilter = { from: 'A1', to: 'H1' };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=relatorio-tecnicos-${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Gerar relatório consolidado com múltiplas abas
   */
  static async generateConsolidatedReport(
    overview: any,
    tickets: any[],
    technicians: any[],
    res: Response
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    // Aba 1: Visão Geral
    const overviewSheet = workbook.addWorksheet('Visão Geral');
    overviewSheet.columns = [
      { header: 'Métrica', key: 'metric', width: 35 },
      { header: 'Valor', key: 'value', width: 20 },
    ];
    
    overviewSheet.getRow(1).font = { bold: true };
    overviewSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF007A33' }
    };
    overviewSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    overviewSheet.addRows([
      { metric: 'Total de Tickets', value: overview.total },
      { metric: 'Taxa de Resolução', value: `${overview.resolutionRate.percentage}%` },
      { metric: 'Tempo Médio 1ª Resposta (h)', value: overview.avgFirstResponseHours },
      { metric: 'Tempo Médio Resolução (h)', value: overview.avgResolutionHours },
      { metric: '', value: '' },
      { metric: 'Por Status', value: '' },
      { metric: '  - Abertos', value: overview.byStatus.open || 0 },
      { metric: '  - Em Progresso', value: overview.byStatus.in_progress || 0 },
      { metric: '  - Aguardando Usuário', value: overview.byStatus.waiting_user || 0 },
      { metric: '  - Resolvidos', value: overview.byStatus.resolved || 0 },
      { metric: '  - Fechados', value: overview.byStatus.closed || 0 },
      { metric: '', value: '' },
      { metric: 'Por Prioridade', value: '' },
      { metric: '  - Crítico', value: overview.byPriority.critical || 0 },
      { metric: '  - Alto', value: overview.byPriority.high || 0 },
      { metric: '  - Médio', value: overview.byPriority.medium || 0 },
      { metric: '  - Baixo', value: overview.byPriority.low || 0 },
    ]);

    // Aba 2: Tickets
    const ticketsSheet = workbook.addWorksheet('Tickets');
    ticketsSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Título', key: 'title', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Prioridade', key: 'priority', width: 12 },
      { header: 'Solicitante', key: 'requester', width: 25 },
      { header: 'Atribuído a', key: 'assigned_to', width: 25 },
      { header: 'Criado em', key: 'created_at', width: 18 },
    ];

    ticketsSheet.getRow(1).font = { bold: true };
    ticketsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF007A33' }
    };
    ticketsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    tickets.slice(0, 500).forEach((ticket) => {
      ticketsSheet.addRow({
        id: ticket.id.substring(0, 8),
        title: ticket.title,
        status: this.translateStatus(ticket.status),
        priority: this.translatePriority(ticket.priority),
        requester: ticket.requesterName || 'N/A',
        assigned_to: ticket.assignedToName || 'Não atribuído',
        created_at: ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('pt-BR') : '',
      });
    });

    // Aba 3: Performance Técnicos
    const techSheet = workbook.addWorksheet('Técnicos');
    techSheet.columns = [
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'Total Tickets', key: 'total', width: 15 },
      { header: 'Resolvidos', key: 'resolved', width: 12 },
      { header: 'Taxa Resolução (%)', key: 'rate', width: 18 },
      { header: 'Tempo Médio (h)', key: 'avg_hours', width: 16 },
    ];

    techSheet.getRow(1).font = { bold: true };
    techSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90E2' }
    };
    techSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    technicians.forEach((tech) => {
      techSheet.addRow({
        name: tech.name,
        total: tech.totalTickets,
        resolved: tech.resolvedTickets,
        rate: tech.resolutionRate,
        avg_hours: tech.avgResolutionHours
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=relatorio-completo-${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  // Helpers de tradução
  private static translateStatus(status: string): string {
    const translations: Record<string, string> = {
      open: 'Aberto',
      in_progress: 'Em Progresso',
      waiting_user: 'Aguardando Usuário',
      resolved: 'Resolvido',
      closed: 'Fechado'
    };
    return translations[status] || status;
  }

  private static translatePriority(priority: string): string {
    const translations: Record<string, string> = {
      critical: 'Crítico',
      high: 'Alto',
      medium: 'Médio',
      low: 'Baixo'
    };
    return translations[priority] || priority;
  }
}
