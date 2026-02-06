import { database } from '../database/connection';
import { TicketStatus, TicketPriority, TicketType } from '../types/enums';
import { v4 as uuid } from 'uuid';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  requesterId: string;
  assignedToId?: string;
  departmentId?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class TicketModel {
  async create(
    title: string,
    description: string,
    type: TicketType,
    priority: TicketPriority,
    requesterId: string,
    departmentId?: string
  ): Promise<Ticket> {
    const id = uuid();

    const result = await database.query(
      `INSERT INTO tickets (id, title, description, type, priority, requester_id, department_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, type, priority, status, requester_id, assigned_to_id, 
                 department_id, resolved_at, created_at, updated_at`,
      [id, title, description, type, priority, requesterId, departmentId]
    );

    return this.mapRow(result.rows[0]);
  }

  async findById(id: string): Promise<Ticket | null> {
    const result = await database.query(
      `SELECT id, title, description, type, priority, status, requester_id, assigned_to_id, 
              department_id, resolved_at, created_at, updated_at FROM tickets WHERE id = $1`,
      [id]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByRequesterId(requesterId: string): Promise<Ticket[]> {
    const result = await database.query(
      `SELECT id, title, description, type, priority, status, requester_id, assigned_to_id, 
              department_id, resolved_at, created_at, updated_at FROM tickets 
       WHERE requester_id = $1 ORDER BY created_at DESC`,
      [requesterId]
    );

    return result.rows.map((row: any) => this.mapRow(row));
  }

  async findAll(status?: TicketStatus, skip = 0, limit = 20): Promise<{ tickets: Ticket[]; total: number }> {
    const whereClause = status ? 'WHERE status = $1' : '';
    const params = status ? [status] : [];

    const countResult = await database.query(
      `SELECT COUNT(*) as count FROM tickets ${whereClause}`,
      params
    );

    const result = await database.query(
      `SELECT id, title, description, type, priority, status, requester_id, assigned_to_id, 
              department_id, resolved_at, created_at, updated_at FROM tickets 
       ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, skip]
    );

    return {
      tickets: result.rows.map((row: any) => this.mapRow(row)),
      total: parseInt(countResult.rows[0].count),
    };
  }

  async updateStatus(id: string, status: TicketStatus, resolvedAt?: Date): Promise<Ticket | null> {
    const result = await database.query(
      `UPDATE tickets SET status = $1, resolved_at = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, title, description, type, priority, status, requester_id, assigned_to_id, 
                 department_id, resolved_at, created_at, updated_at`,
      [status, resolvedAt, id]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async assign(id: string, assignedToId: string): Promise<Ticket | null> {
    const result = await database.query(
      `UPDATE tickets SET assigned_to_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, title, description, type, priority, status, requester_id, assigned_to_id, 
                 department_id, resolved_at, created_at, updated_at`,
      [assignedToId, id]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  private mapRow(row: any): Ticket {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      priority: row.priority,
      status: row.status,
      requesterId: row.requester_id,
      assignedToId: row.assigned_to_id,
      departmentId: row.department_id,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const ticketModel = new TicketModel();
