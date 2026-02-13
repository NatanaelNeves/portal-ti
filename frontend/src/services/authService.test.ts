import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from './authService';
import api from './api';

// Mock do módulo api
vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    // Limpar localStorage antes de cada teste
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('deve fazer login com sucesso e armazenar tokens', async () => {
      const mockResponse = {
        data: {
          token: 'access-token-123',
          refreshToken: 'refresh-token-456',
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'it_staff',
          },
        },
      };

      (api.post as any).mockResolvedValue(mockResponse);

      const result = await authService.login('test@example.com', 'password123');

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(localStorage.getItem('token')).toBe('access-token-123');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token-456');
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('refreshToken', () => {
    it('deve renovar o token com sucesso', async () => {
      localStorage.setItem('refreshToken', 'old-refresh-token');

      const mockResponse = {
        data: {
          token: 'new-access-token',
          refreshToken: 'new-refresh-token',
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'it_staff',
          },
        },
      };

      (api.post as any).mockResolvedValue(mockResponse);

      const newToken = await authService.refreshToken();

      expect(api.post).toHaveBeenCalledWith('/internal-auth/refresh', {
        refreshToken: 'old-refresh-token',
      });

      expect(newToken).toBe('new-access-token');
      expect(localStorage.getItem('token')).toBe('new-access-token');
      expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
    });

    it('deve retornar null se não houver refresh token', async () => {
      const result = await authService.refreshToken();

      expect(result).toBeNull();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('deve limpar storage se refresh falhar', async () => {
      localStorage.setItem('refreshToken', 'invalid-token');
      localStorage.setItem('token', 'old-token');

      (api.post as any).mockRejectedValue(new Error('Unauthorized'));

      const result = await authService.refreshToken();

      expect(result).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('logout', () => {
    it('deve limpar todos os tokens do localStorage', () => {
      localStorage.setItem('token', 'some-token');
      localStorage.setItem('refreshToken', 'some-refresh');
      localStorage.setItem('user', JSON.stringify({ name: 'Test' }));
      localStorage.setItem('internal_token', 'internal-token');

      (api.post as any).mockResolvedValue({});

      authService.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(localStorage.getItem('internal_token')).toBeNull();
    });
  });

  describe('getStoredUser', () => {
    it('deve retornar usuário armazenado', () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'it_staff',
      };

      localStorage.setItem('user', JSON.stringify(mockUser));

      const result = authService.getStoredUser();

      expect(result).toEqual(mockUser);
    });

    it('deve retornar null se não houver usuário', () => {
      const result = authService.getStoredUser();

      expect(result).toBeNull();
    });
  });
});
