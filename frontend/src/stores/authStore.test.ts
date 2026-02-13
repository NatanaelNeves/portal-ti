import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from './authStore';
import { authService } from '../services/authService';
import { showToast } from '../utils/toast';
import { websocketClient } from '../services/websocketClient';
import { UserRole } from '../types';

// Mock dos serviços
vi.mock('../services/authService');
vi.mock('../utils/toast');
vi.mock('../services/websocketClient');

describe('useAuthStore', () => {
  beforeEach(() => {
    // Limpar store antes de cada teste
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.logout();
    });
    
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('deve fazer login com sucesso', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.IT_STAFF,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLoginResponse = {
        token: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      };

      (authService.login as any).mockResolvedValue(mockLoginResponse);
      localStorage.setItem('internal_token', 'access-token');

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isLoading).toBe(false);
      expect(showToast.success).toHaveBeenCalledWith('Bem-vindo(a), Test User!');
      expect(websocketClient.connect).toHaveBeenCalledWith('access-token');
    });

    it('deve tratar erro de login', async () => {
      const error = {
        response: {
          data: { error: 'Credenciais inválidas' },
        },
      };

      (authService.login as any).mockRejectedValue(error);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrongpass');
        } catch (e) {
          // Esperado
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(showToast.error).toHaveBeenCalledWith('Credenciais inválidas');
    });
  });

  describe('logout', () => {
    it('deve fazer logout e limpar estado', () => {
      localStorage.setItem('internal_token', 'some-token');
      localStorage.setItem('user', JSON.stringify({ name: 'Test' }));

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(authService.logout).toHaveBeenCalled();
      expect(websocketClient.disconnect).toHaveBeenCalled();
      expect(showToast.info).toHaveBeenCalledWith('Você saiu do sistema');
    });
  });

  describe('loadStoredUser', () => {
    it('deve carregar usuário do localStorage', () => {
      const mockUser = {
        id: '1',
        email: 'stored@example.com',
        name: 'Stored User',
        role: UserRole.ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      localStorage.setItem('internal_token', 'stored-token');
      (authService.getStoredUser as any).mockReturnValue(mockUser);

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.loadStoredUser();
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(websocketClient.connect).toHaveBeenCalledWith('stored-token');
    });

    it('não deve carregar se não houver usuário armazenado', () => {
      (authService.getStoredUser as any).mockReturnValue(null);

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.loadStoredUser();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('deve verificar se usuário tem role específico', () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.IT_STAFF,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { result } = renderHook(() => useAuthStore());

      // Definir usuário manualmente
      act(() => {
        result.current.user = mockUser;
        result.current.isAuthenticated = true;
      });

      expect(result.current.hasRole([UserRole.IT_STAFF])).toBe(true);
      expect(result.current.hasRole([UserRole.ADMIN])).toBe(false);
      expect(result.current.hasRole([UserRole.IT_STAFF, UserRole.ADMIN])).toBe(true);
    });

    it('deve retornar false se não houver usuário', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.hasRole([UserRole.ADMIN])).toBe(false);
    });
  });
});
