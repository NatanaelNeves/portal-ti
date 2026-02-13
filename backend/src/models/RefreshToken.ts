import { database } from '../database/connection';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

export class RefreshTokenModel {
  // Gerar novo refresh token (válido por 7 dias)
  async create(userId: string): Promise<RefreshToken> {
    const id = uuid();
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    const result = await database.query(
      `INSERT INTO refresh_tokens (id, user_id, token, expires_at) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, user_id, token, expires_at, is_revoked, created_at`,
      [id, userId, token, expiresAt]
    );

    return this.mapRow(result.rows[0]);
  }

  // Buscar refresh token válido
  async findByToken(token: string): Promise<RefreshToken | null> {
    const result = await database.query(
      `SELECT id, user_id, token, expires_at, is_revoked, created_at 
       FROM refresh_tokens 
       WHERE token = $1 AND is_revoked = false AND expires_at > NOW()`,
      [token]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  // Revogar token (logout ou quando usado)
  async revoke(token: string): Promise<void> {
    await database.query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE token = $1',
      [token]
    );
  }

  // Revogar todos os tokens de um usuário (logout de todos os dispositivos)
  async revokeAllForUser(userId: string): Promise<void> {
    await database.query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1',
      [userId]
    );
  }

  // Limpar tokens expirados (executar periodicamente)
  async cleanExpired(): Promise<number> {
    const result = await database.query(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR is_revoked = true RETURNING id'
    );
    return result.rowCount || 0;
  }

  private mapRow(row: any): RefreshToken {
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      expiresAt: new Date(row.expires_at),
      isRevoked: row.is_revoked,
      createdAt: new Date(row.created_at),
    };
  }
}

export const refreshTokenModel = new RefreshTokenModel();
