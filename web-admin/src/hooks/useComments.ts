// src/hooks/useComments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface Comment {
  id:            number;
  body:          string;
  created_at:    string;
  author_name:   string;
  author_role:   string;
  author_avatar: string | null;
}

export function useComments(reportId: number) {
  return useQuery({
    queryKey: ['comments', reportId],
    queryFn:  async () =>
      (await api.get(`/api/reports/${reportId}/comments`)).data.data as Comment[],
    enabled: !!reportId,
  });
}

export function useAddComment(reportId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post(`/api/reports/${reportId}/comments`, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', reportId] });
    },
  });
}