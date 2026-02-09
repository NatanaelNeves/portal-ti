import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  field: string;
  width?: number;
  format?: (value: any) => any;
}

export class ExcelExportService {
  /**
   * Exporta dados para arquivo Excel
   * @param data - Array de objetos com os dados
   * @param columns - Configuração das colunas
   * @param filename - Nome do arquivo (sem extensão)
   * @param sheetName - Nome da planilha
   */
  static exportToExcel(
    data: any[],
    columns: ExportColumn[],
    filename: string,
    sheetName: string = 'Dados'
  ): void {
    if (data.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    // Preparar dados formatados
    const formattedData = data.map(item => {
      const row: any = {};
      columns.forEach(col => {
        const value = item[col.field];
        row[col.header] = col.format ? col.format(value) : value;
      });
      return row;
    });

    // Criar workbook e worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedData);

    // Configurar larguras das colunas
    const colWidths = columns.map(col => ({
      wch: col.width || 15
    }));
    ws['!cols'] = colWidths;

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Gerar arquivo
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
  }

  /**
   * Exporta equipamentos
   */
  static exportEquipments(equipments: any[]): void {
    const columns: ExportColumn[] = [
      { header: 'Código Interno', field: 'internal_code', width: 15 },
      { header: 'Categoria', field: 'category', width: 12 },
      { header: 'Tipo', field: 'type', width: 15 },
      { header: 'Marca', field: 'brand', width: 15 },
      { header: 'Modelo', field: 'model', width: 20 },
      { header: 'Número de Série', field: 'serial_number', width: 20 },
      { header: 'Status', field: 'current_status', width: 15, format: (v) => this.formatStatus(v) },
      { header: 'Unidade', field: 'current_unit', width: 20 },
      { header: 'Valor', field: 'acquisition_value', width: 12, format: (v) => v ? `R$ ${parseFloat(v).toFixed(2)}` : '' },
      { header: 'Data Aquisição', field: 'acquisition_date', width: 15, format: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
      { header: 'Responsável', field: 'responsible_name', width: 25 }
    ];

    this.exportToExcel(equipments, columns, 'equipamentos', 'Equipamentos');
  }

  /**
   * Exporta notebooks
   */
  static exportNotebooks(notebooks: any[]): void {
    const columns: ExportColumn[] = [
      { header: 'Código', field: 'internal_code', width: 12 },
      { header: 'Marca', field: 'brand', width: 15 },
      { header: 'Modelo', field: 'model', width: 20 },
      { header: 'Processador', field: 'processor', width: 25 },
      { header: 'RAM (GB)', field: 'ram', width: 10 },
      { header: 'Armazenamento', field: 'storage', width: 15 },
      { header: 'Tela', field: 'screen_size', width: 10 },
      { header: 'Sistema Op.', field: 'operating_system', width: 15 },
      { header: 'Número de Série', field: 'serial_number', width: 20 },
      { header: 'Status', field: 'current_status', width: 15, format: (v) => this.formatStatus(v) },
      { header: 'Unidade', field: 'current_unit', width: 20 },
      { header: 'Responsável', field: 'responsible_name', width: 25 },
      { header: 'Em Uso Desde', field: 'in_use_since', width: 15, format: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' }
    ];

    this.exportToExcel(notebooks, columns, 'notebooks', 'Notebooks');
  }

  /**
   * Exporta periféricos
   */
  static exportPeripherals(peripherals: any[]): void {
    const columns: ExportColumn[] = [
      { header: 'Código', field: 'internal_code', width: 12 },
      { header: 'Tipo', field: 'type', width: 15 },
      { header: 'Marca', field: 'brand', width: 15 },
      { header: 'Modelo', field: 'model', width: 20 },
      { header: 'Número de Série', field: 'serial_number', width: 20 },
      { header: 'Status', field: 'current_status', width: 15, format: (v) => this.formatStatus(v) },
      { header: 'Unidade', field: 'current_unit', width: 20 },
      { header: 'Responsável', field: 'responsible_name', width: 25 }
    ];

    this.exportToExcel(peripherals, columns, 'perifericos', 'Periféricos');
  }

  /**
   * Exporta movimentações
   */
  static exportMovements(movements: any[]): void {
    const columns: ExportColumn[] = [
      { header: 'Número', field: 'movement_number', width: 20 },
      { header: 'Tipo', field: 'movement_type', width: 12, format: (v) => v === 'delivery' ? 'Entrega' : 'Devolução' },
      { header: 'Data', field: 'movement_date', width: 15, format: (v) => new Date(v).toLocaleDateString('pt-BR') },
      { header: 'Equipamento', field: 'equipment_code', width: 12 },
      { header: 'Responsável', field: 'responsible_name', width: 25 },
      { header: 'Unidade', field: 'to_unit', width: 20 },
      { header: 'Departamento', field: 'to_department', width: 15 },
      { header: 'Motivo', field: 'reason', width: 30 },
      { header: 'Registrado Por', field: 'registered_by_name', width: 25 }
    ];

    this.exportToExcel(movements, columns, 'movimentacoes', 'Movimentações');
  }

  /**
   * Exporta responsabilidades (quem está com o quê)
   */
  static exportResponsibilities(people: any[]): void {
    // Expandir dados para ter uma linha por equipamento
    const expandedData: any[] = [];
    people.forEach(person => {
      person.equipments.forEach((eq: any) => {
        expandedData.push({
          responsible_name: person.responsible_name,
          responsible_unit: person.responsible_unit,
          responsible_department: person.responsible_department,
          equipment_code: eq.internal_code,
          equipment_type: eq.type,
          equipment_brand: eq.brand,
          equipment_model: eq.model,
          issued_date: eq.issued_date,
          days_in_use: eq.days_in_use
        });
      });
    });

    const columns: ExportColumn[] = [
      { header: 'Responsável', field: 'responsible_name', width: 25 },
      { header: 'Unidade', field: 'responsible_unit', width: 20 },
      { header: 'Departamento', field: 'responsible_department', width: 15 },
      { header: 'Código Equipamento', field: 'equipment_code', width: 15 },
      { header: 'Tipo', field: 'equipment_type', width: 15 },
      { header: 'Marca', field: 'equipment_brand', width: 15 },
      { header: 'Modelo', field: 'equipment_model', width: 20 },
      { header: 'Data Entrega', field: 'issued_date', width: 15, format: (v) => new Date(v).toLocaleDateString('pt-BR') },
      { header: 'Dias em Uso', field: 'days_in_use', width: 12 }
    ];

    this.exportToExcel(expandedData, columns, 'responsabilidades', 'Quem Está com o Quê');
  }

  /**
   * Exporta requisições de compra
   */
  static exportPurchaseRequisitions(requisitions: any[]): void {
    const columns: ExportColumn[] = [
      { header: 'Número', field: 'request_number', width: 15 },
      { header: 'Solicitante', field: 'requester_name', width: 25 },
      { header: 'Unidade', field: 'unit', width: 20 },
      { header: 'Data Solicitação', field: 'request_date', width: 15, format: (v) => new Date(v).toLocaleDateString('pt-BR') },
      { header: 'Status', field: 'status', width: 15, format: (v) => this.formatRequisitionStatus(v) },
      { header: 'Prioridade', field: 'priority', width: 12, format: (v) => this.formatPriority(v) },
      { header: 'Justificativa', field: 'justification', width: 40 },
      { header: 'Valor Total', field: 'total_value', width: 15, format: (v) => v ? `R$ ${parseFloat(v).toFixed(2)}` : '' }
    ];

    this.exportToExcel(requisitions, columns, 'requisicoes_compra', 'Requisições de Compra');
  }

  // Helper: formatar status
  private static formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      available: 'Disponível',
      in_use: 'Em Uso',
      maintenance: 'Manutenção',
      storage: 'Estoque',
      disposed: 'Descartado'
    };
    return statusMap[status] || status;
  }

  // Helper: formatar status de requisição
  private static formatRequisitionStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'Pendente',
      approved: 'Aprovado',
      in_purchase: 'Em Compra',
      completed: 'Concluído',
      rejected: 'Rejeitado'
    };
    return statusMap[status] || status;
  }

  // Helper: formatar prioridade
  private static formatPriority(priority: string): string {
    const priorityMap: { [key: string]: string } = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return priorityMap[priority] || priority;
  }
}

export default ExcelExportService;
