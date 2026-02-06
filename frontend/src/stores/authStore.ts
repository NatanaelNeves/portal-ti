import { create } from 'zustand';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';

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
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email: string, name: string, password: string) => {
    set({ isLoading: true });
    try {
      const data = await authService.register(email, name, password);
      set({ user: data.user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  loadStoredUser: () => {
    const user = authService.getStoredUser();
    if (user) {
      set({ user, isAuthenticated: true });
    }
  },

  hasRole: (roles: UserRole[]) => {
    const state = get();
    return state.user ? roles.includes(state.user.role) : false;
  },
}));
