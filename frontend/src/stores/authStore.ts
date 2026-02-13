import { create } from 'zustand';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';
import { showToast } from '../utils/toast';
import { websocketClient } from '../services/websocketClient';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
  loadStoredUser: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const data = await authService.login(email, password);
      set({ user: data.user, isAuthenticated: true });
      showToast.success(`Bem-vindo(a), ${data.user.name}!`);
      
      // Conectar WebSocket com o token
      const token = localStorage.getItem('internal_token');
      if (token) {
        websocketClient.connect(token);
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.error || 'Erro ao fazer login');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email: string, name: string, password: string) => {
    set({ isLoading: true });
    try {
      const data = await authService.register(email, name, password);
      set({ user: data.user, isAuthenticated: true });
      showToast.success('Conta criada com sucesso!');
    } catch (error: any) {
      showToast.error(error.response?.data?.error || 'Erro ao criar conta');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false });
    websocketClient.disconnect();
    showToast.info('Você saiu do sistema');
  },

  loadStoredUser: () => {
    const user = authService.getStoredUser();
    if (user) {
      set({ user, isAuthenticated: true });
      
      // Conectar WebSocket se tiver token
      const token = localStorage.getItem('internal_token');
      if (token) {
        websocketClient.connect(token);
      }
    }
  },

  hasRole: (roles: UserRole[]) => {
    const state = get();
    return state.user ? roles.includes(state.user.role) : false;
  },
}));
