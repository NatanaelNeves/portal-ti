import PDFDocument from 'pdfkit';
import { Response } from 'express';
import fs from 'fs';
import path from 'path';

interface DeliveryTermData {
  movementNumber: string;
  equipment: {
    category: string;
    type: string;
    brand: string;
    model: string;
    internalCode: string;
    serialNumber: string;
    specifications?: string;
    condition: string;
  };
  responsible: {
    name: string;
    cpf?: string;
    department: string;
    unit: string;
    phone?: string;
    email?: string;
  };
  delivery: {
    date: Date;
    reason: string;
    notes?: string;
  };
  deliveredBy: {
    name: string;
  };
  location: string;
}

interface ReturnTermData {
  movementNumber: string;
  equipment: {
    category: string;
    type: string;
    brand: string;
    model: string;
    internalCode: string;
    serialNumber: string;
    patrimonio?: string;
  };
  responsible: {
    name: string;
    cpf?: string;
    department: string;
    unit: string;
    position?: string;
  };
  history: {
    deliveryDate: Date;
    returnDate: Date;
    daysInUse: number;
    deliveryTermFile?: string;
  };
  inspection: {
    condition: string;
    checklist: Record<string, boolean>;
    notes?: string;
    damageDescription?: string;
  };
  returnedItems: string[];
  returnReason: string;
  returnDestination: string;
  receivedBy: {
    name: string;
  };
  location: string;
}

export class PDFService {
  /**
   * Gera termo de entrega de equipamento
   */
  static generateDeliveryTerm(data: DeliveryTermData, res: Response): void {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Pipe para response
    doc.pipe(res);

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('PEQUENO NAZARENO', { align: 'center' });
    doc.fontSize(14).text('TERMO DE RESPONSABILIDADE', { align: 'center' });
    doc.fontSize(12).text('ENTREGA DE EQUIPAMENTO', { align: 'center' });
    doc.moveDown();
    
    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Equipamento
    doc.fontSize(12).font('Helvetica-Bold').text('EQUIPAMENTO:', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Tipo: ${data.equipment.type}`);
    doc.text(`Marca/Modelo: ${data.equipment.brand} ${data.equipment.model}`);
    doc.text(`ID: ${data.equipment.internalCode}`);
    doc.text(`Série: ${data.equipment.serialNumber}`);
    if (data.equipment.specifications) {
      doc.text(`Especificações: ${data.equipment.specifications}`);
    }
    doc.text(`Estado: ${data.equipment.condition}`);
    doc.moveDown();

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Responsável
    doc.fontSize(12).font('Helvetica-Bold').text('RESPONSÁVEL:', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Nome: ${data.responsible.name.toUpperCase()}`);
    doc.text(`Setor: ${data.responsible.department}`);
    doc.text(`Unidade: ${data.responsible.unit}`);
    if (data.responsible.phone) {
      doc.text(`Tel: ${data.responsible.phone}`);
    }
    if (data.responsible.email) {
      doc.text(`Email: ${data.responsible.email}`);
    }
    doc.moveDown();

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Condições de uso
    doc.fontSize(12).font('Helvetica-Bold').text('CONDIÇÕES DE USO:', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    doc.list([
      'Equipamento é propriedade institucional',
      'Uso exclusivo para fins institucionais',
      'Responsável deve zelar pela conservação',
      'Comunicar imediatamente danos/furtos',
      'Devolver quando solicitado ou ao término do vínculo'
    ]);
    doc.moveDown();

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Detalhes da entrega
    doc.fontSize(10).font('Helvetica');
    doc.text(`Data Entrega: ${data.delivery.date.toLocaleDateString('pt-BR')}`);
    doc.text(`Motivo: ${data.delivery.reason}`);
    if (data.delivery.notes) {
      doc.text(`Obs: ${data.delivery.notes}`);
    }
    doc.moveDown();

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Assinaturas
    doc.fontSize(12).font('Helvetica-Bold').text('ASSINATURAS:', { underline: true });
    doc.moveDown(2);

    const signatureY = doc.y;
    doc.fontSize(10).font('Helvetica');
    
    // Assinatura responsável
    doc.text('_'.repeat(40), 50, signatureY);
    doc.text(data.responsible.name.toUpperCase(), 50, signatureY + 15, { width: 200 });
    doc.text('Responsável pelo Equipamento', 50, signatureY + 30, { width: 200 });

    // Assinatura entregador
    doc.text('_'.repeat(40), 320, signatureY);
    doc.text(data.deliveredBy.name.toUpperCase(), 320, signatureY + 15, { width: 200 });
    doc.text('Responsável pela Entrega', 320, signatureY + 30, { width: 200 });

    doc.moveDown(4);
    doc.text(`${data.location}, ${data.delivery.date.toLocaleDateString('pt-BR')}`, { align: 'center' });
    doc.moveDown(2);

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Rodapé
    doc.fontSize(8).text(`Doc ID: ${data.movementNumber}`, { align: 'center' });
    doc.text('Sistema de TI - Pequeno Nazareno', { align: 'center' });

    doc.end();
  }

  /**
   * Gera termo de devolução de equipamento - Versão profissional completa
   */
  static generateReturnTerm(data: ReturnTermData, res: Response): void {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Pipe para response
    doc.pipe(res);

    // ═══════════════════════════════════════════════════════════
    // HEADER INSTITUCIONAL
    // ═══════════════════════════════════════════════════════════
    doc.fontSize(18).font('Helvetica-Bold').text('PEQUENO NAZARENO', { align: 'center' });
    doc.fontSize(14).text('TERMO DE DEVOLUÇÃO DE EQUIPAMENTO', { align: 'center' });
    doc.fontSize(10).text(`Nº ${data.movementNumber}`, { align: 'center' });
    doc.moveDown(0.5);

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(2).stroke();
    doc.moveDown(0.5);

    // ═══════════════════════════════════════════════════════════
    // SEÇÃO 1: DADOS DO COLABORADOR
    // ═══════════════════════════════════════════════════════════
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a8a').text('1. DADOS DO COLABORADOR', { underline: true });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    
    const respName = (data.responsible.name || 'N/A').toUpperCase();
    const respDept = data.responsible.department || 'N/A';
    const respUnit = data.responsible.unit || 'N/A';
    const respPosition = data.responsible.position || 'N/A';
    const respCPF = data.responsible.cpf || 'N/A';

    doc.text(`Nome: ${respName}`, { continued: true });
    doc.text(`CPF: ${respCPF}`);
    doc.text(`Cargo: ${respPosition}`, { continued: true });
    doc.text(`Setor: ${respDept}`);
    doc.text(`Unidade: ${respUnit}`);
    doc.moveDown(0.5);

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke();
    doc.moveDown(0.5);

    // ═══════════════════════════════════════════════════════════
    // SEÇÃO 2: DADOS DO EQUIPAMENTO
    // ═══════════════════════════════════════════════════════════
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a8a').text('2. DADOS DO EQUIPAMENTO', { underline: true });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    
    doc.text(`Tipo: ${data.equipment.type}`, { continued: true });
    doc.text(`Categoria: ${data.equipment.category}`);
    doc.text(`Marca: ${data.equipment.brand}`, { continued: true });
    doc.text(`Modelo: ${data.equipment.model}`);
    doc.text(`Patrimônio: ${data.equipment.patrimonio || data.equipment.internalCode}`, { continued: true });
    doc.text(`Nº Série: ${data.equipment.serialNumber}`);
    doc.moveDown(0.5);

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke();
    doc.moveDown(0.5);

    // ═══════════════════════════════════════════════════════════
    // SEÇÃO 3: HISTÓRICO
    // ═══════════════════════════════════════════════════════════
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a8a').text('3. HISTÓRICO DE USO', { underline: true });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    
    const fmtDelivery = data.history.deliveryDate instanceof Date && !isNaN(data.history.deliveryDate.getTime())
      ? data.history.deliveryDate.toLocaleDateString('pt-BR') : 'N/A';
    const fmtReturn = data.history.returnDate instanceof Date && !isNaN(data.history.returnDate.getTime())
      ? data.history.returnDate.toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
    
    doc.text(`Data de Entrega: ${fmtDelivery}`, { continued: true });
    doc.text(`Data de Devolução: ${fmtReturn}`);
    doc.text(`Tempo de Uso: ${data.history.daysInUse} dias`);
    doc.moveDown(0.5);

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke();
    doc.moveDown(0.5);

    // ═══════════════════════════════════════════════════════════
    // SEÇÃO 4: ESTADO DO EQUIPAMENTO
    // ═══════════════════════════════════════════════════════════
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a8a').text('4. ESTADO DO EQUIPAMENTO', { underline: true });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor('#000000');

    const conditionLabel =
      data.inspection.condition === 'perfect' || data.inspection.condition === 'excellent' ? 'EXCELENTE' :
      data.inspection.condition === 'good' ? 'BOM' :
      data.inspection.condition === 'fair' || data.inspection.condition === 'regular' ? 'REGULAR' :
      data.inspection.condition === 'poor' ? 'RUIM' :
      data.inspection.condition === 'damaged' ? 'DANIFICADO' : 'N/A';

    doc.text(`Estado Geral: `, { continued: true });
    doc.font('Helvetica-Bold');
    doc.text(conditionLabel);
    doc.font('Helvetica');
    doc.moveDown(0.3);

    // Checklist
    doc.font('Helvetica-Bold');
    doc.text('Checklist de Verificação:');
    doc.font('Helvetica');
    doc.moveDown(0.2);
    
    const cl = data.inspection.checklist || {};
    const checkItems: Array<{key: string, label: string}> = [
      { key: 'physicalIntegrity', label: 'Integridade física sem danos' },
      { key: 'accessories', label: 'Acessórios completos' },
      { key: 'powerCable', label: 'Cabo de energia/carregador' },
      { key: 'functionalTest', label: 'Teste funcional OK' },
      { key: 'cleaningDone', label: 'Limpeza realizada' },
      { key: 'screen', label: 'Tela sem trincas/danos' },
      { key: 'keyboard', label: 'Teclado funcional' },
      { key: 'touchpad', label: 'Touchpad funcional' },
      { key: 'charger', label: 'Carregador incluso' },
      { key: 'battery', label: 'Bateria com carga' },
    ];
    
    let hasCheckItems = false;
    for (const item of checkItems) {
      if (cl[item.key] !== undefined) {
        const mark = cl[item.key] ? '✓' : '✗';
        doc.text(`  [${mark}] ${item.label}`);
        hasCheckItems = true;
      }
    }
    if (!hasCheckItems) {
      doc.text('  Nenhum item verificado');
    }
    doc.moveDown(0.3);

    // Descrição de danos (se houver)
    if (data.inspection.damageDescription) {
      doc.font('Helvetica-Bold');
      doc.text('Descrição de Danos/Observações:');
      doc.font('Helvetica');
      doc.text(data.inspection.damageDescription, { width: 495, align: 'justify' });
      doc.moveDown(0.3);
    }

    if (data.inspection.notes) {
      doc.font('Helvetica-Bold');
      doc.text('Observações Adicionais:');
      doc.font('Helvetica');
      doc.text(data.inspection.notes, { width: 495, align: 'justify' });
      doc.moveDown(0.3);
    }

    doc.text(`Motivo da Devolução: ${data.returnReason}`);
    doc.moveDown(0.5);

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke();
    doc.moveDown(0.5);

    // ═══════════════════════════════════════════════════════════
    // SEÇÃO 5: ITENS DEVOLVIDOS
    // ═══════════════════════════════════════════════════════════
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a8a').text('5. ITENS DEVOLVIDOS', { underline: true });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    
    if (data.returnedItems && data.returnedItems.length > 0) {
      doc.font('Helvetica-Bold');
      doc.text('Os seguintes itens foram devolvidos:');
      doc.font('Helvetica');
      doc.moveDown(0.2);
      data.returnedItems.forEach((item, index) => {
        doc.text(`  ${index + 1}. ${item}`);
      });
    } else {
      doc.text('Nenhum item adicional listado');
    }
    doc.moveDown(0.5);

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke();
    doc.moveDown(0.5);

    // ═══════════════════════════════════════════════════════════
    // SEÇÃO 6: DECLARAÇÃO
    // ═══════════════════════════════════════════════════════════
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a8a').text('6. DECLARAÇÃO', { underline: true });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    
    doc.text(
      `Declaro que estou devolvendo o equipamento acima descrito nas condições informadas, ciente de que as informações prestadas refletem o estado real do equipamento no momento da devolução.`,
      { width: 495, align: 'justify', lineGap: 2 }
    );
    doc.moveDown(0.5);

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke();
    doc.moveDown(0.5);

    // ═══════════════════════════════════════════════════════════
    // SEÇÃO 7: ASSINATURAS
    // ═══════════════════════════════════════════════════════════
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a8a').text('7. ASSINATURAS', { underline: true });
    doc.moveDown(1.5);

    const signatureY = doc.y;
    doc.fontSize(9).font('Helvetica').fillColor('#000000');

    // Assinatura do colaborador (esquerda)
    const leftX = 60;
    const rightX = 320;
    const lineWidth = 220;
    
    // Linha de assinatura esquerda
    doc.moveTo(leftX, signatureY).lineTo(leftX + lineWidth, signatureY).lineWidth(1).stroke();
    doc.text(respName, leftX, signatureY + 10, { width: lineWidth, align: 'center' });
    doc.text('Colaborador que Devolveu', leftX, signatureY + 22, { width: lineWidth, align: 'center' });
    if (respPosition !== 'N/A') {
      doc.fontSize(8);
      doc.text(respPosition, leftX, signatureY + 32, { width: lineWidth, align: 'center' });
      doc.fontSize(9);
    }

    // Assinatura do responsável TI (direita)
    doc.moveTo(rightX, signatureY).lineTo(rightX + lineWidth, signatureY).lineWidth(1).stroke();
    doc.text((data.receivedBy.name || 'N/A').toUpperCase(), rightX, signatureY + 10, { width: lineWidth, align: 'center' });
    doc.text('Responsável TI que Recebeu', rightX, signatureY + 22, { width: lineWidth, align: 'center' });

    doc.moveDown(3.5);

    // Data e local
    doc.fontSize(10).text(`${data.location}, ${fmtReturn}`, { align: 'center' });
    doc.moveDown(1);

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke();
    doc.moveDown(0.3);

    // ═══════════════════════════════════════════════════════════
    // RODAPÉ
    // ═══════════════════════════════════════════════════════════
    doc.fontSize(7).fillColor('#64748b');
    doc.text(`Documento gerado automaticamente pelo Sistema de TI - Pequeno Nazareno`, { align: 'center' });
    doc.text(`ID: ${data.movementNumber} | Destino: ${data.returnDestination}`, { align: 'center' });
    doc.text(`Data de geração: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });

    doc.end();
  }
}
