import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface Report {
  id:                    number;
  category_name:         string;
  price_per_kg_snapshot: number;
  estimated_weight:      number;
  actual_weight:         number | null;
  gross_points:          number | null;
  handling_fee:          number | null;
  net_points:            number | null;
  photo_url:             string | null;
  photo_urls:            string[] | string | null;
  notes:                 string | null;
  status:                'pending' | 'approved' | 'rejected';
  rejection_reason:      string | null;
  latitude:              string | null;
  longitude:             string | null;
  address_text:          string | null;
  pickup_date:           string | null;
  pickup_hour:           string | null;
  validated_at:          string | null;
  created_at:            string;
}

export function useMyReports(params: { page?: number; limit?: number; status?: string } = {}) {
  return useQuery({
    queryKey: ['my-reports', params],
    queryFn:  async () => {
      const clean: Record<string, any> = {
        page:  params.page  || 1,
        limit: params.limit || 15,
      };
      if (params.status) clean.status = params.status;
      return (await api.get('/api/reports/my', { params: clean })).data;
    },
  });
}

export function useReport(id: number) {
  return useQuery({
    queryKey: ['report', id],
    queryFn:  async () =>
      (await api.get(`/api/reports/${id}`)).data.data as Report,
    enabled: !!id,
  });
}

export function useSubmitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.post('/api/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-reports'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useComments(reportId: number) {
  return useQuery({
    queryKey: ['comments', reportId],
    queryFn:  async () =>
      (await api.get(`/api/reports/${reportId}/comments`)).data.data,
    enabled: !!reportId,
  });
}

export function useAddComment(reportId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post(`/api/reports/${reportId}/comments`, { body }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['comments', reportId] }),
  });
}