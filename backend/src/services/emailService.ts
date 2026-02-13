import nodemailer from 'nodemailer';
import { config } from '../config/environment';

// Configuração do transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure, // true para 465, false para outras portas
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

// Verificar conexão (opcional, para desenvolvimento)
// Desabilitado para evitar warnings em uso interno
// transporter.verify((error, success) => {
//   if (error) {
//     console.log('⚠️ Email service not configured:', error.message);
//   } else {
//     console.log('✓ Email service ready');
//   }
// });

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  /**
   * Enviar email genérico
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!config.email.enabled) {
        console.log('📧 Email disabled - Would send:', options.subject);
        return true;
      }

      await transporter.sendMail({
        from: `"${config.email.fromName}" <${config.email.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log(`✓ Email sent to ${options.to}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  /**
   * Notificar novo chamado aberto (para TI)
   */
  static async notifyNewTicket(
    ticketId: string,
    title: string,
    requesterName: string,
    priority: string,
    itEmails: string[]
  ): Promise<void> {
    const priorityLabel = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      critical: 'Urgente',
    }[priority] || 'Média';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007A33; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .ticket-info { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #007A33; }
          .priority { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
          .priority-low { background: #e3f2fd; color: #1976d2; }
          .priority-medium { background: #fff3e0; color: #f57c00; }
          .priority-high { background: #ffebee; color: #c62828; }
          .priority-critical { background: #b71c1c; color: white; }
          .button { display: inline-block; background: #007A33; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Novo Chamado Aberto</h1>
          </div>
          <div class="content">
            <p>Olá equipe de TI,</p>
            <p>Um novo chamado foi aberto e requer atenção:</p>
            
            <div class="ticket-info">
              <h3>${title}</h3>
              <p><strong>Solicitante:</strong> ${requesterName}</p>
              <p><strong>Prioridade:</strong> <span class="priority priority-${priority}">${priorityLabel}</span></p>
              <p><strong>ID:</strong> #${ticketId.substring(0, 8)}</p>
            </div>

            <a href="${config.frontend.url}/admin/chamados/${ticketId}" class="button">
              Ver Chamado
            </a>

            <p style="color: #666; font-size: 14px;">
              Acesse o sistema para assumir este chamado e iniciar o atendimento.
            </p>
          </div>
          
          <div class="footer">
            <p>Portal de TI - O Pequeno Nazareno</p>
            <p>Esta é uma mensagem automática, não responda este email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Novo Chamado Aberto
      
      Título: ${title}
      Solicitante: ${requesterName}
      Prioridade: ${priorityLabel}
      ID: #${ticketId.substring(0, 8)}
      
      Acesse: ${config.frontend.url}/admin/chamados/${ticketId}
    `;

    for (const email of itEmails) {
      await this.sendEmail({
        to: email,
        subject: `🎫 Novo Chamado: ${title}`,
        html,
        text,
      });
    }
  }

  /**
   * Notificar chamado atribuído (para o técnico)
   */
  static async notifyTicketAssigned(
    ticketId: string,
    title: string,
    requesterName: string,
    assignedToEmail: string,
    assignedToName: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4A90E2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .ticket-info { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #4A90E2; }
          .button { display: inline-block; background: #4A90E2; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Chamado Atribuído a Você</h1>
          </div>
          <div class="content">
            <p>Olá ${assignedToName},</p>
            <p>Um chamado foi atribuído para você:</p>
            
            <div class="ticket-info">
              <h3>${title}</h3>
              <p><strong>Solicitante:</strong> ${requesterName}</p>
              <p><strong>ID:</strong> #${ticketId.substring(0, 8)}</p>
            </div>

            <a href="${config.frontend.url}/admin/chamados/${ticketId}" class="button">
              Ver Chamado
            </a>

            <p style="color: #666; font-size: 14px;">
              Por favor, inicie o atendimento o mais breve possível.
            </p>
          </div>
          
          <div class="footer">
            <p>Portal de TI - O Pequeno Nazareno</p>
            <p>Esta é uma mensagem automática, não responda este email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: assignedToEmail,
      subject: `🎯 Chamado atribuído: ${title}`,
      html,
      text: `Chamado atribuído para você\n\nTítulo: ${title}\nSolicitante: ${requesterName}\n\nAcesse: ${config.frontend.url}/admin/chamados/${ticketId}`,
    });
  }

  /**
   * Notificar atualização de status (para o solicitante)
   */
  static async notifyStatusUpdate(
    ticketId: string,
    title: string,
    requesterEmail: string,
    requesterName: string,
    oldStatus: string,
    newStatus: string,
    message?: string
  ): Promise<void> {
    const statusLabels: Record<string, string> = {
      open: 'Aberto',
      in_progress: 'Em Atendimento',
      waiting_user: 'Aguardando Resposta',
      resolved: 'Resolvido',
      closed: 'Fechado',
    };

    const statusColors: Record<string, string> = {
      open: '#9e9e9e',
      in_progress: '#4A90E2',
      waiting_user: '#F28C38',
      resolved: '#007A33',
      closed: '#666',
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007A33; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .ticket-info { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #007A33; }
          .status { display: inline-block; padding: 5px 15px; border-radius: 20px; color: white; font-weight: bold; }
          .message-box { background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; background: #007A33; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 Atualização do Chamado</h1>
          </div>
          <div class="content">
            <p>Olá ${requesterName},</p>
            <p>Houve uma atualização no seu chamado:</p>
            
            <div class="ticket-info">
              <h3>${title}</h3>
              <p><strong>Status:</strong> 
                <span class="status" style="background: ${statusColors[oldStatus]};">${statusLabels[oldStatus]}</span>
                → 
                <span class="status" style="background: ${statusColors[newStatus]};">${statusLabels[newStatus]}</span>
              </p>
              ${message ? `<div class="message-box"><strong>Mensagem da equipe:</strong><br>${message}</div>` : ''}
            </div>

            <a href="${config.frontend.url}/chamado/${ticketId}" class="button">
              Ver Chamado
            </a>

            ${newStatus === 'waiting_user' ? '<p style="color: #F28C38; font-weight: bold;">⏳ A equipe de TI aguarda sua resposta.</p>' : ''}
            ${newStatus === 'resolved' ? '<p style="color: #007A33; font-weight: bold;">✅ Seu chamado foi marcado como resolvido. Se o problema persistir, responda no chamado.</p>' : ''}
          </div>
          
          <div class="footer">
            <p>Portal de TI - O Pequeno Nazareno</p>
            <p>Esta é uma mensagem automática, não responda este email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: requesterEmail,
      subject: `📢 Atualização: ${title} - ${statusLabels[newStatus]}`,
      html,
      text: `Atualização do Chamado\n\nTítulo: ${title}\nStatus: ${statusLabels[oldStatus]} → ${statusLabels[newStatus]}\n\nAcesse: ${config.frontend.url}/chamado/${ticketId}`,
    });
  }

  /**
   * Notificar nova mensagem no chamado
   */
  static async notifyNewMessage(
    ticketId: string,
    title: string,
    recipientEmail: string,
    recipientName: string,
    authorName: string,
    message: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007A33; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .message-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #4A90E2; }
          .button { display: inline-block; background: #007A33; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 Nova Mensagem</h1>
          </div>
          <div class="content">
            <p>Olá ${recipientName},</p>
            <p><strong>${authorName}</strong> enviou uma mensagem no chamado <strong>${title}</strong>:</p>
            
            <div class="message-box">
              <p>${message}</p>
            </div>

            <a href="${config.frontend.url}/chamado/${ticketId}" class="button">
              Ver Chamado
            </a>
          </div>
          
          <div class="footer">
            <p>Portal de TI - O Pequeno Nazareno</p>
            <p>Esta é uma mensagem automática, não responda este email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: recipientEmail,
      subject: `💬 Nova mensagem: ${title}`,
      html,
      text: `Nova mensagem de ${authorName}\n\nChamado: ${title}\n\n${message}\n\nAcesse: ${config.frontend.url}/chamado/${ticketId}`,
    });
  }
}
