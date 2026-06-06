// src/store/auth.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  setAuth:      (user: AuthUser, at: string, rt: string) => void;
  setTokens:    (at: string, rt: string) => void;
  setUser:      (user: AuthUser) => void;
  logout:       () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:         null,
      accessToken:  null,
      refreshToken: null,
      setAuth:   (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      setUser:   (user) => set({ user }),
      logout:    () =>
        set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name:    'pasifik-user-auth', // different key from web-admin
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
);