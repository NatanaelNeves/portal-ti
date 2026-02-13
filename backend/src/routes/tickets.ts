import { Router, Request, Response } from 'express';
import { database } from '../database/connection';
import { authenticate, authorize } from '../middleware/authorization';
import { UserRole } from '../types/enums';
import { EmailService } from '../services/emailService';
import { uploadTicketAttachment, deleteFile } from '../services/uploadService';
import { validate, createTicketSchema, updateTicketSchema, addMessageSchema } from '../middleware/validation';
import path from 'path';

const ticketsRouter = Router();

/**
 * GET / - Listar chamados com filtros e paginação
 * 
 * Query params:
 * - status: string | string[] (open, in_progress, waiting_user, resolved, closed)
 * - priority: string | string[] (low, medium, high, critical)
 * - assigned_to: string (user id)
 * - search: string (busca em título e descrição)
 * - date_from: string (ISO date)
 * - date_to: string (ISO date)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - sort: string (created_at, updated_at, priority) (default: created_at)
 * - order: string (asc, desc) (default: desc)
 * 
 * Regras:
 * - Usuário público (token): apenas seus próprios chamados
 * - TI/Coordenador/Admin: todos os chamados
 */
ticketsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userToken = req.headers['x-user-token'] as string;
    const authHeader = req.headers['authorization'] as string;

    // Parâmetros de filtro
    const status = req.query.status ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) : null;
    const priority = req.query.priority ? (Array.isArray(req.query.priority) ? req.query.priority : [req.query.priority]) : null;
    const assigned_to = req.query.assigned_to as string;
    const search = req.query.search as string;
    const date_from = req.query.date_from as string;
    const date_to = req.query.date_to as string;
    
    // Parâmetros de paginação
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    
    // Parâmetros de ordenação
    const sortField = req.query.sort as string || 'created_at';
    const sortOrder = (req.query.order as string || 'desc').toUpperCase();
    
    // Validar campos de ordenação
    const allowedSortFields = ['created_at', 'updated_at', 'priority', 'status'];
    const finalSortField = allowedSortFields.includes(sortField) ? sortField : 'created_at';
    const finalSortOrder = ['ASC', 'DESC'].includes(sortOrder) ? sortOrder : 'DESC';

    // FLUXO 1: Usuário público com token
    if (userToken) {
      const publicUser = await database.query(
        'SELECT id, email FROM public_users WHERE user_token = $1',
        [userToken]
      );

      if (!publicUser.rows.length) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      // Construir query com filtros
      const conditions = ['t.requester_type = \'public\'', 't.requester_id = $1'];
      const params: any[] = [publicUser.rows[0].id];
      let paramCount = 2;

      if (status && status.length > 0) {
        conditions.push(`t.status = ANY($${paramCount})`);
        params.push(status);
        paramCount++;
      }

      if (priority && priority.length > 0) {
        conditions.push(`t.priority = ANY($${paramCount})`);
        params.push(priority);
        paramCount++;
      }

      if (search) {
        conditions.push(`(t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`);
        params.push(`%${search}%`);
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

      // Query para total de registros
      const countQuery = `SELECT COUNT(*) FROM tickets t WHERE ${conditions.join(' AND ')}`;
      const countResult = await database.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Query para dados paginados
      params.push(limit, offset);
      const dataQuery = `
        SELECT t.*, 
               t.assigned_to_id as assigned_to,
               (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count,
               (SELECT COUNT(*) FROM ticket_attachments WHERE ticket_id = t.id) as attachment_count
        FROM tickets t
        WHERE ${conditions.join(' AND ')}
        ORDER BY t.${finalSortField} ${finalSortOrder}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;
      
      const tickets = await database.query(dataQuery, params);

      return res.json({
        data: tickets.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    // FLUXO 2: Usuário interno autenticado
    if (authHeader) {
      // Validar token e extrair usuário
      const token = authHeader.substring(7);
      const jwt = require('jsonwebtoken');
      const { config } = require('../config/environment');
      
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        
        // Validar permissão para ver todos os chamados
        const allowedRoles = [UserRole.IT_STAFF, UserRole.MANAGER, UserRole.ADMIN];
        if (!allowedRoles.includes(decoded.role)) {
          return res.status(403).json({ 
            error: 'Acesso negado',
            message: 'Você não tem permissão para ver todos os chamados'
          });
        }

        // Construir query com filtros
        const conditions: string[] = [];
        const params: any[] = [];
        let paramCount = 1;

        if (status && status.length > 0) {
          conditions.push(`t.status = ANY($${paramCount})`);
          params.push(status);
          paramCount++;
        }

        if (priority && priority.length > 0) {
          conditions.push(`t.priority = ANY($${paramCount})`);
          params.push(priority);
          paramCount++;
        }

        if (assigned_to) {
          if (assigned_to === 'unassigned') {
            conditions.push('t.assigned_to_id IS NULL');
          } else {
            conditions.push(`t.assigned_to_id = $${paramCount}`);
            params.push(assigned_to);
            paramCount++;
          }
        }

        if (search) {
          conditions.push(`(t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`);
          params.push(`%${search}%`);
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

        // Query para total de registros
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countQuery = `SELECT COUNT(*) FROM tickets t ${whereClause}`;
        const countResult = await database.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        // Query para dados paginados
        params.push(limit, offset);
        const dataQuery = `
          SELECT t.*, 
                 t.assigned_to_id as assigned_to,
                 (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count,
                 (SELECT COUNT(*) FROM ticket_attachments WHERE ticket_id = t.id) as attachment_count,
                 iu.name as assigned_to_name,
                 pu.name as requester_name,
                 pu.email as requester_email,
                 pu.department as requester_department,
                 pu.unit as requester_unit
          FROM tickets t
          LEFT JOIN internal_users iu ON t.assigned_to_id = iu.id
          LEFT JOIN public_users pu ON t.requester_type = 'public' AND t.requester_id = pu.id
          ${whereClause}
          ORDER BY t.${finalSortField} ${finalSortOrder}
          LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;
        
        const tickets = await database.query(dataQuery, params);

        return res.json({
          data: tickets.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        });
      } catch (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
      }
    }

    // Sem autenticação
    return res.status(401).json({ error: 'Autenticação necessária' });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

/**
 * GET /:id - Ver detalhes de um chamado
 * 
 * Regras:
 * - Usuário público: apenas seu próprio chamado (validação por token)
 * - TI/Coordenador/Admin: qualquer chamado
 */
ticketsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userToken = req.headers['x-user-token'] as string;
    const authHeader = req.headers['authorization'] as string;

    // Buscar ticket com dados do solicitante (se for público)
    const ticket = await database.query(
      `SELECT t.*, 
              t.assigned_to_id as assigned_to,
              pu.name as requester_name,
              pu.email as requester_email,
              pu.department as requester_department,
              pu.unit as requester_unit
       FROM tickets t
       LEFT JOIN public_users pu ON t.requester_type = 'public' AND t.requester_id = pu.id
       WHERE t.id = $1`,
      [id]
    );

    if (!ticket.rows.length) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // FLUXO 1: Usuário público com token
    if (userToken) {
      const publicUser = await database.query(
        'SELECT id FROM public_users WHERE user_token = $1',
        [userToken]
      );

      // ISOLAMENTO: Validar propriedade do chamado
      if (!publicUser.rows.length) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      if (ticket.rows[0].requester_id !== publicUser.rows[0].id) {
        return res.status(403).json({ 
          error: 'Acesso negado',
          message: 'Você só pode acessar seus próprios chamados'
        });
      }

      // Retornar chamado com mensagens
      const messages = await database.query(
        `SELECT * FROM ticket_messages 
         WHERE ticket_id = $1 
         ORDER BY created_at ASC`,
        [id]
      );

      return res.json({
        ...ticket.rows[0],
        messages: messages.rows
      });
    }

    // FLUXO 2: Usuário interno autenticado
    if (authHeader) {
      const token = authHeader.substring(7);
      const jwt = require('jsonwebtoken');
      const { config } = require('../config/environment');
      
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        
        // TI, Coordenador e Admin podem ver qualquer chamado
        const allowedRoles = [UserRole.IT_STAFF, UserRole.MANAGER, UserRole.ADMIN];
        if (!allowedRoles.includes(decoded.role)) {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        // Retornar chamado com mensagens
        const messages = await database.query(
          `SELECT * FROM ticket_messages 
           WHERE ticket_id = $1 
           ORDER BY created_at ASC`,
          [id]
        );

        return res.json({
          ...ticket.rows[0],
          messages: messages.rows
        });
      } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
      }
    }

    return res.status(401).json({ error: 'Autenticação necessária' });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Create ticket (public user)
ticketsRouter.post('/', validate(createTicketSchema), async (req: Request, res: Response) => {
  try {
    const userToken = req.headers['x-user-token'] as string;
    const { title, description, type, priority } = req.body;

    console.log('POST /tickets - Token:', userToken ? 'present' : 'missing');
    console.log('POST /tickets - Body:', { title, description, type, priority });

    if (!userToken) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Get public user
    const publicUser = await database.query(
      'SELECT id, email, name FROM public_users WHERE user_token = $1',
      [userToken]
    );

    if (!publicUser.rows.length) {
      console.log('POST /tickets - User not found for token:', userToken);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('POST /tickets - User found:', publicUser.rows[0].id);

    // Create ticket
    const ticket = await database.query(
      `INSERT INTO tickets (
        requester_type, requester_id, title, description, 
        type, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      ['public', publicUser.rows[0].id, title, description, type || 'support', priority || 'medium', 'open']
    );

    console.log('POST /tickets - Ticket created:', ticket.rows[0].id);

    // 📧 NOTIFICAÇÃO: Novo chamado para equipe de TI
    try {
      const itUsers = await database.query(
        `SELECT email FROM internal_users 
         WHERE role IN ('it_staff', 'admin') AND is_active = true`
      );
      
      const itEmails = itUsers.rows.map((u: any) => u.email);
      
      if (itEmails.length > 0) {
        await EmailService.notifyNewTicket(
          ticket.rows[0].id,
          title,
          publicUser.rows[0].name,
          priority || 'medium',
          itEmails
        );
      }
    } catch (emailError) {
      console.error('Error sending notification email:', emailError);
      // Não falhar a requisição por erro de email
    }

    res.status(201).json(ticket.rows[0]);
  } catch (error: any) {
    console.error('Error creating ticket:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to create ticket', details: error.message });
  }
});

// Get ticket messages
ticketsRouter.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userToken = req.headers['x-user-token'] as string;
    const authHeader = req.headers['authorization'] as string;

    // Verify ticket exists
    const ticket = await database.query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );

    if (!ticket.rows.length) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // FLUXO 1: Usuário público com token
    if (userToken) {
      const publicUser = await database.query(
        'SELECT id FROM public_users WHERE user_token = $1',
        [userToken]
      );

      if (!publicUser.rows.length || ticket.rows[0].requester_id !== publicUser.rows[0].id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    // FLUXO 2: Usuário interno com JWT
    else if (authHeader) {
      const token = authHeader.substring(7);
      const jwt = require('jsonwebtoken');
      const { config } = require('../config/environment');
      
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        
        // TI, Coordenador e Admin podem ver mensagens de qualquer chamado
        const allowedRoles = [UserRole.IT_STAFF, UserRole.MANAGER, UserRole.ADMIN];
        if (!allowedRoles.includes(decoded.role)) {
          return res.status(403).json({ error: 'Acesso negado' });
        }
      } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
      }
    }
    // Sem autenticação
    else {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

    // Get messages
    const messages = await database.query(
      `SELECT * FROM ticket_messages 
       WHERE ticket_id = $1 
       ORDER BY created_at ASC`,
      [id]
    );

    res.json({ messages: messages.rows });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Add message to ticket
ticketsRouter.post('/:id/messages', validate(addMessageSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userToken = req.headers['x-user-token'] as string;
    const authHeader = req.headers['authorization'] as string;
    const { message, is_internal } = req.body;

    if (!userToken && !authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let authorType = 'public';
    let authorId = null;

    // FLUXO 1: Usuário público
    if (userToken) {
      const publicUser = await database.query(
        'SELECT id FROM public_users WHERE user_token = $1',
        [userToken]
      );

      if (!publicUser.rows.length) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      authorId = publicUser.rows[0].id;
      authorType = 'public';
    } 
    // FLUXO 2: Usuário interno (TI)
    else if (authHeader) {
      const token = authHeader.substring(7);
      const jwt = require('jsonwebtoken');
      const { config } = require('../config/environment');
      
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        authorId = decoded.id;
        authorType = 'it_staff';
      } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
      }
    }

    const result = await database.query(
      `INSERT INTO ticket_messages (
        ticket_id, author_type, author_id, message, is_internal, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`,
      [id, authorType, authorId, message, is_internal || false]
    );

    // 📧 NOTIFICAÇÃO: Nova mensagem (não enviar se for mensagem interna)
    if (!is_internal) {
      try {
        const ticket = await database.query(
          'SELECT * FROM tickets WHERE id = $1',
          [id]
        );

        if (ticket.rows.length > 0) {
          let authorName = '';
          let recipientEmail = '';
          let recipientName = '';

          // Se mensagem veio da TI, notificar o solicitante
          if (authorType === 'it_staff') {
            const itUser = await database.query(
              'SELECT name FROM internal_users WHERE id = $1',
              [authorId]
            );
            authorName = itUser.rows[0]?.name || 'Equipe TI';

            // Buscar email do solicitante
            if (ticket.rows[0].requester_type === 'public') {
              const publicUser = await database.query(
                'SELECT email, name FROM public_users WHERE id = $1',
                [ticket.rows[0].requester_id]
              );
              recipientEmail = publicUser.rows[0]?.email;
              recipientName = publicUser.rows[0]?.name;
            }
          }
          // Se mensagem veio do usuário, notificar o técnico atribuído
          else if (authorType === 'public' && ticket.rows[0].assigned_to_id) {
            const publicUser = await database.query(
              'SELECT name FROM public_users WHERE id = $1',
              [authorId]
            );
            authorName = publicUser.rows[0]?.name || 'Usuário';

            const itUser = await database.query(
              'SELECT email, name FROM internal_users WHERE id = $1',
              [ticket.rows[0].assigned_to_id]
            );
            recipientEmail = itUser.rows[0]?.email;
            recipientName = itUser.rows[0]?.name;
          }

          if (recipientEmail) {
            await EmailService.notifyNewMessage(
              id,
              ticket.rows[0].title,
              recipientEmail,
              recipientName,
              authorName,
              message
            );
          }
        }
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

/**
 * PATCH /:id - Atualizar chamado (status, prioridade, atribuição)
 * 
 * Regras:
 * - Apenas TI e Admin podem atualizar chamados
 * - Auditoria obrigatória
 */
ticketsRouter.patch('/:id', authenticate, validate(updateTicketSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assigned_to_id, priority } = req.body;

    console.log('🔧 PATCH /tickets/:id - Iniciando atualização');
    console.log('Ticket ID:', id);
    console.log('Body recebido:', { status, assigned_to_id, priority });

    const authHeader = req.headers['authorization'] as string;
    if (!authHeader) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

    // Validar token e permissão
    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const { config } = require('../config/environment');
    
    let userId: string;
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      
      // AUTORIZAÇÃO: Apenas TI e Admin podem atualizar
      if (![UserRole.IT_STAFF, UserRole.ADMIN].includes(decoded.role)) {
        return res.status(403).json({ 
          error: 'Acesso negado',
          message: 'Apenas TI e Administradores podem atualizar chamados'
        });
      }
      
      userId = decoded.id;
      console.log('Usuário autenticado:', decoded.name, '(', decoded.role, ')');
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Construir query de update
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (status !== undefined) {
      fields.push(`status = $${paramCount}`);
      values.push(status);
      console.log(`✅ Atualizando status para: ${status}`);
      paramCount++;
    }

    if (assigned_to_id !== undefined) {
      fields.push(`assigned_to_id = $${paramCount}`);
      values.push(assigned_to_id);
      console.log(`✅ Atualizando assigned_to_id para: ${assigned_to_id}`);
      paramCount++;
    }

    if (priority !== undefined) {
      fields.push(`priority = $${paramCount}`);
      values.push(priority);
      console.log(`✅ Atualizando priority para: ${priority}`);
      paramCount++;
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    // Adicionar timestamp de atualização
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *, assigned_to_id as assigned_to`;
    console.log('Query SQL:', query);
    console.log('Valores:', values);
    
    const result = await database.query(query, values);

    if (!result.rows.length) {
      console.log('❌ Ticket não encontrado no banco');
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    console.log('✅ Ticket atualizado com sucesso!');
    console.log('Dados atualizados:', result.rows[0]);

    // AUDITORIA: Registrar alteração
    await database.query(
      `INSERT INTO ticket_audit_log (ticket_id, user_id, action, changes, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, userId, 'update', JSON.stringify({ status, assigned_to_id, priority })]
    ).catch(() => {
      // Log de auditoria é opcional se a tabela não existir ainda
      console.log('Audit log not available');
    });

    // 📧 NOTIFICAÇÕES: Atribuição ou mudança de status
    try {
      const ticket = result.rows[0];

      // Se foi atribuído a alguém
      if (assigned_to_id && assigned_to_id !== 'null') {
        const assignedUser = await database.query(
          'SELECT email, name FROM internal_users WHERE id = $1',
          [assigned_to_id]
        );

        if (assignedUser.rows.length > 0) {
          let requesterName = 'Usuário';
          if (ticket.requester_type === 'public') {
            const publicUser = await database.query(
              'SELECT name FROM public_users WHERE id = $1',
              [ticket.requester_id]
            );
            requesterName = publicUser.rows[0]?.name || 'Usuário';
          }

          await EmailService.notifyTicketAssigned(
            ticket.id,
            ticket.title,
            requesterName,
            assignedUser.rows[0].email,
            assignedUser.rows[0].name
          );
        }
      }

      // Se o status mudou, notificar o solicitante
      if (status && ticket.requester_type === 'public') {
        const publicUser = await database.query(
          'SELECT email, name FROM public_users WHERE id = $1',
          [ticket.requester_id]
        );

        if (publicUser.rows.length > 0) {
          // Buscar status antigo
          const oldTicket = await database.query(
            'SELECT status FROM tickets WHERE id = $1',
            [id]
          );

          await EmailService.notifyStatusUpdate(
            ticket.id,
            ticket.title,
            publicUser.rows[0].email,
            publicUser.rows[0].name,
            oldTicket.rows[0]?.status || 'open',
            status
          );
        }
      }
    } catch (emailError) {
      console.error('Error sending notification email:', emailError);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

/**
 * POST /:id/attachments - Upload de anexo
 * Permite usuários públicos e TI anexarem arquivos
 */
ticketsRouter.post('/:id/attachments', uploadTicketAttachment, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userToken = req.headers['x-user-token'] as string;
    const authHeader = req.headers['authorization'] as string;

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    let uploaderType = 'public';
    let uploaderId = null;

    // Validar autenticação e obter usuário
    if (userToken) {
      const publicUser = await database.query(
        'SELECT id FROM public_users WHERE user_token = $1',
        [userToken]
      );

      if (!publicUser.rows.length) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      uploaderId = publicUser.rows[0].id;
      uploaderType = 'public';
    } else if (authHeader) {
      const token = authHeader.substring(7);
      const jwt = require('jsonwebtoken');
      const { config } = require('../config/environment');
      
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        uploaderId = decoded.id;
        uploaderType = 'it_staff';
      } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
      }
    } else {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

    // Verificar se ticket existe
    const ticket = await database.query('SELECT id FROM tickets WHERE id = $1', [id]);
    if (!ticket.rows.length) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Salvar anexo no banco
    const attachment = await database.query(
      `INSERT INTO ticket_attachments (
        ticket_id, filename, original_name, file_path, file_size, 
        mime_type, uploaded_by_type, uploaded_by_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id,
        req.file.filename,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        uploaderType,
        uploaderId
      ]
    );

    res.status(201).json({
      ...attachment.rows[0],
      url: `/uploads/ticket-attachments/${req.file.filename}`
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

/**
 * GET /:id/attachments - Listar anexos do chamado
 */
ticketsRouter.get('/:id/attachments', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userToken = req.headers['x-user-token'] as string;
    const authHeader = req.headers['authorization'] as string;

    // Verificar autenticação
    if (!userToken && !authHeader) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

    // Verificar se ticket existe e usuário tem acesso
    const ticket = await database.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (!ticket.rows.length) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Se for usuário público, verificar se é o dono do ticket
    if (userToken) {
      const publicUser = await database.query(
        'SELECT id FROM public_users WHERE user_token = $1',
        [userToken]
      );

      if (!publicUser.rows.length || ticket.rows[0].requester_id !== publicUser.rows[0].id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    // Buscar anexos
    const attachments = await database.query(
      `SELECT 
        id, filename, original_name, file_size, mime_type,
        uploaded_by_type, created_at
       FROM ticket_attachments 
       WHERE ticket_id = $1 
       ORDER BY created_at DESC`,
      [id]
    );

    const attachmentsWithUrl = attachments.rows.map((att: any) => ({
      ...att,
      url: `/uploads/ticket-attachments/${att.filename}`
    }));

    res.json(attachmentsWithUrl);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

/**
 * DELETE /:id/attachments/:attachmentId - Deletar anexo
 */
ticketsRouter.delete('/:id/attachments/:attachmentId', async (req: Request, res: Response) => {
  try {
    const { id, attachmentId } = req.params;
    const userToken = req.headers['x-user-token'] as string;
    const authHeader = req.headers['authorization'] as string;

    let uploaderId = null;
    let uploaderType = 'public';

    // Validar autenticação
    if (userToken) {
      const publicUser = await database.query(
        'SELECT id FROM public_users WHERE user_token = $1',
        [userToken]
      );

      if (!publicUser.rows.length) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      uploaderId = publicUser.rows[0].id;
      uploaderType = 'public';
    } else if (authHeader) {
      const token = authHeader.substring(7);
      const jwt = require('jsonwebtoken');
      const { config } = require('../config/environment');
      
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        uploaderId = decoded.id;
        uploaderType = 'it_staff';
      } catch (err) {
        return res.status(401).json({ error: 'Token inválido' });
      }
    } else {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

    // Buscar anexo
    const attachment = await database.query(
      'SELECT * FROM ticket_attachments WHERE id = $1 AND ticket_id = $2',
      [attachmentId, id]
    );

    if (!attachment.rows.length) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    // Verificar se é o dono do anexo ou TI
    if (uploaderType === 'public' && attachment.rows[0].uploaded_by_id !== uploaderId) {
      return res.status(403).json({ error: 'Você só pode deletar seus próprios anexos' });
    }

    // Deletar arquivo físico
    deleteFile(attachment.rows[0].file_path);

    // Deletar do banco
    await database.query('DELETE FROM ticket_attachments WHERE id = $1', [attachmentId]);

    res.json({ message: 'Anexo deletado com sucesso' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

export default ticketsRouter;

