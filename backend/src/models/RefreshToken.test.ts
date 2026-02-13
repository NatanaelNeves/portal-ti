import { refreshTokenModel } from './RefreshToken';
import { database } from '../database/connection';

// Mock do database
jest.mock('../database/connection', () => ({
  database: {
    query: jest.fn(),
  },
}));

describe('RefreshTokenModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar um novo refresh token', async () => {
      const mockUserId = 'user-123';
      const mockToken = {
        id: 'token-id',
        user_id: mockUserId,
        token: 'mock-token-string',
        expires_at: new Date(),
        is_revoked: false,
        created_at: new Date(),
      };

      (database.query as jest.Mock).mockResolvedValue({
        rows: [mockToken],
      });

      const result = await refreshTokenModel.create(mockUserId);

      expect(database.query).toHaveBeenCalledTimes(1);
      expect(result.userId).toBe(mockUserId);
      expect(result.isRevoked).toBe(false);
    });
  });

  describe('findByToken', () => {
    it('deve encontrar um refresh token válido', async () => {
      const mockToken = {
        id: 'token-id',
        user_id: 'user-123',
        token: 'valid-token',
        expires_at: new Date(Date.now() + 86400000), // +1 dia
        is_revoked: false,
        created_at: new Date(),
      };

      (database.query as jest.Mock).mockResolvedValue({
        rows: [mockToken],
      });

      const result = await refreshTokenModel.findByToken('valid-token');

      expect(result).toBeTruthy();
      expect(result?.token).toBe('valid-token');
      expect(result?.isRevoked).toBe(false);
    });

    it('deve retornar null se token não existir', async () => {
      (database.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await refreshTokenModel.findByToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('revoke', () => {
    it('deve revogar um refresh token', async () => {
      (database.query as jest.Mock).mockResolvedValue({});

      await refreshTokenModel.revoke('some-token');

      expect(database.query).toHaveBeenCalledWith(
        'UPDATE refresh_tokens SET is_revoked = true WHERE token = $1',
        ['some-token']
      );
    });
  });

  describe('revokeAllForUser', () => {
    it('deve revogar todos os tokens de um usuário', async () => {
      (database.query as jest.Mock).mockResolvedValue({});

      await refreshTokenModel.revokeAllForUser('user-123');

      expect(database.query).toHaveBeenCalledWith(
        'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1',
        ['user-123']
      );
    });
  });

  describe('cleanExpired', () => {
    it('deve deletar tokens expirados', async () => {
      (database.query as jest.Mock).mockResolvedValue({
        rowCount: 5,
      });

      const result = await refreshTokenModel.cleanExpired();

      expect(result).toBe(5);
      expect(database.query).toHaveBeenCalledWith(
        'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR is_revoked = true RETURNING id'
      );
    });
  });
});
