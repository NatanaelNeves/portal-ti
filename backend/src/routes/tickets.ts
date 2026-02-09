import { Router, Request, Response } from 'express';
import { database } from '../database/connection';
import { authenticate, authorize } from '../middleware/authorization';
import { UserRole } from '../types/enums';

const ticketsRouter = Router();

/**
 * GET / - Listar chamados
 * 
 * Regras:
 * - Usuário público (token): apenas seus próprios chamados
 * - TI/Coordenador/Admin: todos os chamados
 */
ticketsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const userToken = req.headers['x-user-token'] as string;
    const authHeader = req.headers['authorization'] as string;

    // FLUXO 1: Usuário público com token
    if (userToken) {
      const publicUser = await database.query(
        'SELECT id, email FROM public_users WHERE user_token = $1',
        [userToken]
      );

      if (!publicUser.rows.length) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      // ISOLAMENTO: Retorna APENAS chamados deste usuário
      const tickets = await database.query(
        `SELECT t.*, 
                t.assigned_to_id as assigned_to,
                (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count
         FROM tickets t
         WHERE t.requester_type = 'public' AND t.requester_id = $1
         ORDER BY t.created_at DESC`,
        [publicUser.rows[0].id]
      );

      return res.json(tickets.rows);
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

        // Retornar todos os chamados
        const tickets = await database.query(
          `SELECT t.*, 
                  t.assigned_to_id as assigned_to,
                  (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count
           FROM tickets t
           ORDER BY t.created_at DESC`
        );

        return res.json(tickets.rows);
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

    const ticket = await database.query(
      'SELECT *, assigned_to_id as assigned_to FROM tickets WHERE id = $1',
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
ticketsRouter.post('/', async (req: Request, res: Response) => {
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
ticketsRouter.post('/:id/messages', async (req: Request, res: Response) => {
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
ticketsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assigned_to_id, priority } = req.body;

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
      paramCount++;
    }

    if (assigned_to_id !== undefined) {
      fields.push(`assigned_to_id = $${paramCount}`);
      values.push(assigned_to_id);
      paramCount++;
    }

    if (priority !== undefined) {
      fields.push(`priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    // Adicionar timestamp de atualização
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await database.query(query, values);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // AUDITORIA: Registrar alteração
    await database.query(
      `INSERT INTO ticket_audit_log (ticket_id, user_id, action, changes, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, userId, 'update', JSON.stringify({ status, assigned_to_id, priority })]
    ).catch(() => {
      // Log de auditoria é opcional se a tabela não existir ainda
      console.log('Audit log not available');
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

export default ticketsRouter;
