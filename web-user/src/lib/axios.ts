import axios from 'axios';
import { authEvents } from './authEvents';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({ baseURL: API_URL, timeout: 15_000 });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const raw   = localStorage.getItem('pasifik-user-auth');
      const state = raw ? JSON.parse(raw) : null;
      const token = state?.state?.accessToken;
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
    } catch {}
  }
  return config;
});

let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push((token) => {
            if (token) {
              original.headers['Authorization'] = `Bearer ${token}`;
              resolve(api(original));
            } else {
              reject(err);
            }
          });
        });
      }

      isRefreshing = true;

      try {
        const raw          = localStorage.getItem('pasifik-user-auth');
        const state        = raw ? JSON.parse(raw) : null;
        const refreshToken = state?.state?.refreshToken;

        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefresh } = data.data;

        if (raw) {
          const parsed              = JSON.parse(raw);
          parsed.state.accessToken  = accessToken;
          parsed.state.refreshToken = newRefresh;
          localStorage.setItem('pasifik-user-auth', JSON.stringify(parsed));
        }

        queue.forEach((cb) => cb(accessToken));
        queue = [];
        original.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        queue.forEach((cb) => cb(''));
        queue = [];
        localStorage.removeItem('pasifik-user-auth');
        authEvents.emit();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;