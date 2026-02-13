import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import internalAuthRouter from './internalAuth';
import { database } from '../database/connection';
import bcrypt from 'bcryptjs';

// Mock das dependências
jest.mock('../database/connection');
jest.mock('../middleware/validation', () => ({
  validate: () => (req: any, res: any, next: any) => next(),
  loginSchema: {},
  registerSchema: {},
}));

const app = express();
app.use(express.json());
app.use('/api/internal-auth', internalAuthRouter);

describe('Internal Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /internal-login', () => {
    it('deve retornar 401 se credenciais inválidas', async () => {
      (database.query as jest.Mock).mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/internal-auth/internal-login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpass',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('deve retornar token e refresh token em login bem-sucedido', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: hashedPassword,
        role: 'it_staff',
      };

      // Mock para buscar usuário
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockUser] })
        // Mock para criar refresh token
        .mockResolvedValueOnce({
          rows: [{
            id: 'token-id',
            user_id: 'user-id',
            token: 'refresh-token-string',
            expires_at: new Date(),
            is_revoked: false,
            created_at: new Date(),
          }],
        });

      const response = await request(app)
        .post('/api/internal-auth/internal-login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('test@example.com');
    });
  });

  describe('POST /refresh', () => {
    it('deve retornar 400 se refresh token não fornecido', async () => {
      const response = await request(app)
        .post('/api/internal-auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Refresh token is required');
    });

    it('deve retornar 401 se refresh token inválido', async () => {
      (database.query as jest.Mock).mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/internal-auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired refresh token');
    });

    it('deve renovar tokens com refresh token válido', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'it_staff',
      };

      // Mock para buscar refresh token
      (database.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: 'token-id',
            user_id: 'user-id',
            token: 'valid-refresh-token',
            expires_at: new Date(Date.now() + 86400000),
            is_revoked: false,
            created_at: new Date(),
          }],
        })
        // Mock para buscar usuário
        .mockResolvedValueOnce({ rows: [mockUser] })
        // Mock para revogar token antigo
        .mockResolvedValueOnce({})
        // Mock para criar novo refresh token
        .mockResolvedValueOnce({
          rows: [{
            id: 'new-token-id',
            user_id: 'user-id',
            token: 'new-refresh-token',
            expires_at: new Date(Date.now() + 86400000),
            is_revoked: false,
            created_at: new Date(),
          }],
        });

      const response = await request(app)
        .post('/api/internal-auth/refresh')
        .send({
          refreshToken: 'valid-refresh-token',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('test@example.com');
    });
  });

  describe('POST /logout', () => {
    it('deve fazer logout com sucesso', async () => {
      (database.query as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/internal-auth/logout')
        .send({
          refreshToken: 'some-token',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('deve retornar sucesso mesmo sem refresh token', async () => {
      const response = await request(app)
        .post('/api/internal-auth/logout')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });
});
