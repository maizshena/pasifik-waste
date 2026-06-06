import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface Notification {
  id:         number;
  type:       string;
  title:      string;
  body:       string;
  link:       string | null;
  is_read:    boolean;
  created_at: string;
}

export function useNotifications() {
  return useQuery({
    queryKey:        ['notifications'],
    queryFn:         async () => {
      const res  = await api.get('/api/notifications');
      const raw  = res.data?.data;

      return {
        notifications: Array.isArray(raw?.notifications) ? raw.notifications : [],
        unread:        typeof raw?.unread === 'number'   ? raw.unread        : 0,
      };
    },
    refetchInterval: 15_000,
    placeholderData: { notifications: [], unread: 0 },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.patch(`/api/notifications/${id}/read`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/api/notifications/read-all'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}