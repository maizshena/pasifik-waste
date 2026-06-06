import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type Role = 'warga' | 'admin' | 'super_admin';

export interface AuthUser {
  id:          number;
  full_name:   string;
  email:       string;
  role:        Role;
  phone?:      string;
  avatar_url?: string;
  balance?:    number;
  locked_balance?: number;
}

interface AuthState {
  user:         AuthUser | null;
  accessToken:  string | null;
  refreshToken: string | null;
  hydrated:     boolean;
  setAuth:      (user: AuthUser, at: string, rt: string) => Promise<void>;
  setUser:      (user: AuthUser) => void;
  logout:       () => Promise<void>;
  hydrate:      () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user:         null,
  accessToken:  null,
  refreshToken: null,
  hydrated:     false,

  // Persist tokens to SecureStore on login
  setAuth: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('accessToken',  accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    await SecureStore.setItemAsync('user',         JSON.stringify(user));
    set({ user, accessToken, refreshToken });
  },

  setUser: (user) => set({ user }),

  // Clear SecureStore on logout
  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    set({ user: null, accessToken: null, refreshToken: null });
  },

  // Read from SecureStore on app start
  hydrate: async () => {
    try {
      const accessToken  = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      const userStr      = await SecureStore.getItemAsync('user');
      const user         = userStr ? JSON.parse(userStr) : null;
      set({ user, accessToken, refreshToken, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
}));