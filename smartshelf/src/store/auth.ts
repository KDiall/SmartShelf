import { create } from 'zustand';
import type { User } from '@/types';

interface AuthStore {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if (typeof window !== 'undefined') {
      import('@/lib/idb').then(({ idb }) =>
        Promise.all([idb.medicines.clear(), idb.sales.clear(), idb.pendingSales.clear()])
      );
    }
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (typeof window !== 'undefined') {
      import('@/lib/idb').then(({ idb }) =>
        Promise.all([idb.medicines.clear(), idb.sales.clear(), idb.pendingSales.clear()])
      );
    }
    set({ token: null, user: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ token, user, isAuthenticated: true });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  },
}));
