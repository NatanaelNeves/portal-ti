import { database } from '../database/connection';
import { UserRole } from '../types/enums';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserModel {
  async create(email: string, name: string, password: string, role: UserRole = UserRole.FINAL_USER): Promise<User> {
    const id = uuid();
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await database.query(
      `INSERT INTO users (id, email, name, password_hash, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, name, role, department_id, is_active, created_at, updated_at`,
      [id, email, name, passwordHash, role]
    );

    return this.mapRow(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await database.query(
      'SELECT id, email, name, role, department_id, is_active, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await database.query(
      'SELECT id, email, name, role, department_id, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async verifyPassword(email: string, password: string): Promise<boolean> {
    const result = await database.query(
      'SELECT password_hash FROM users WHERE email = $1',
      [email]
    );

    if (!result.rows[0]) return false;

    return bcrypt.compare(password, result.rows[0].password_hash);
  }

  private mapRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      departmentId: row.department_id,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const userModel = new UserModel();
