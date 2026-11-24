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

    it('deve retornar token em login bem-sucedido', async () => {
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
        .mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/api/internal-auth/internal-login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test@example.com');
    });
  });
});
