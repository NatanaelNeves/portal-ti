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
  };
  responsible: {
    name: string;
    department: string;
    unit: string;
  };
  history: {
    deliveryDate: Date;
    returnDate: Date;
    daysInUse: number;
    deliveryTermFile?: string;
  };
  inspection: {
    condition: string;
    checklist: {
      screen?: boolean;
      keyboard?: boolean;
      touchpad?: boolean;
      charger?: boolean;
      battery?: boolean;
    };
    notes?: string;
  };
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
   * Gera termo de devolução de equipamento
   */
  static generateReturnTerm(data: ReturnTermData, res: Response): void {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Pipe para response
    doc.pipe(res);

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('PEQUENO NAZARENO', { align: 'center' });
    doc.fontSize(14).text('TERMO DE DEVOLUÇÃO', { align: 'center' });
    doc.fontSize(12).text('EQUIPAMENTO DE TI', { align: 'center' });
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
    doc.moveDown();

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Histórico
    doc.fontSize(12).font('Helvetica-Bold').text('HISTÓRICO:', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Entrega: ${data.history.deliveryDate.toLocaleDateString('pt-BR')}`);
    doc.text(`Devolução: ${data.history.returnDate.toLocaleDateString('pt-BR')}`);
    doc.text(`Tempo de uso: ${data.history.daysInUse} dias`);
    if (data.history.deliveryTermFile) {
      doc.text(`Termo entrega: ${data.history.deliveryTermFile}`);
    }
    doc.moveDown();

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Vistoria
    doc.fontSize(12).font('Helvetica-Bold').text('VISTORIA DE DEVOLUÇÃO:', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    
    const conditionEmoji = 
      data.inspection.condition === 'perfect' ? '🟢' :
      data.inspection.condition === 'good' ? '🟡' :
      data.inspection.condition === 'regular' ? '🟠' : '🔴';
    
    doc.text(`Estado Geral: ${conditionEmoji} ${data.inspection.condition.toUpperCase()}`);
    doc.moveDown(0.5);
    
    doc.text('Checklist:');
    if (data.inspection.checklist.screen !== undefined) {
      doc.text(`[${data.inspection.checklist.screen ? '✓' : ' '}] Tela sem trincas`);
    }
    if (data.inspection.checklist.keyboard !== undefined) {
      doc.text(`[${data.inspection.checklist.keyboard ? '✓' : ' '}] Teclado funcionando`);
    }
    if (data.inspection.checklist.touchpad !== undefined) {
      doc.text(`[${data.inspection.checklist.touchpad ? '✓' : ' '}] Touchpad funcionando`);
    }
    if (data.inspection.checklist.charger !== undefined) {
      doc.text(`[${data.inspection.checklist.charger ? '✓' : ' '}] Carregador incluído`);
    }
    if (data.inspection.checklist.battery !== undefined) {
      doc.text(`[${data.inspection.checklist.battery ? '✓' : ' '}] Bateria com carga`);
    }
    doc.moveDown(0.5);
    
    if (data.inspection.notes) {
      doc.text('Observações:');
      doc.text(data.inspection.notes, { width: 495 });
    }
    doc.moveDown(0.5);
    
    doc.text(`Motivo Devolução: ${data.returnReason}`);
    doc.moveDown();

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Declaração
    doc.fontSize(12).font('Helvetica-Bold').text('DECLARAÇÃO:', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    doc.text(
      `Eu, ${data.responsible.name.toUpperCase()}, declaro que devolvi o equipamento acima em perfeitas condições, conforme vistoria, e não possuo mais responsabilidade sobre o mesmo.`,
      { width: 495, align: 'justify' }
    );
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
    doc.text('Responsável que Devolveu', 50, signatureY + 30, { width: 200 });

    // Assinatura recebedor
    doc.text('_'.repeat(40), 320, signatureY);
    doc.text(data.receivedBy.name.toUpperCase(), 320, signatureY + 15, { width: 200 });
    doc.text('Responsável que Recebeu', 320, signatureY + 30, { width: 200 });

    doc.moveDown(4);
    doc.text(`${data.location}, ${data.history.returnDate.toLocaleDateString('pt-BR')}`, { align: 'center' });
    doc.moveDown(2);

    // Linha divisória
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Rodapé
    doc.fontSize(8).text(`Doc ID: ${data.movementNumber}`, { align: 'center' });
    doc.text(`Status: ${data.returnDestination} - ${data.location}`, { align: 'center' });
    doc.text('Sistema de TI - Pequeno Nazareno', { align: 'center' });

    doc.end();
  }
}
