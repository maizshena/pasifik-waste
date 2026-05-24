// src/hooks/useReports.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

export interface Report {
  id:                    number;
  user_id:               number;
  warga_name:            string;
  warga_phone:           string;
  category_name:         string;
  category_id:           number;
  price_per_kg_snapshot: number;
  estimated_weight:      number;
  actual_weight:         number | null;
  gross_points:          number | null;
  handling_fee:          number | null;
  net_points:            number | null;
  photo_url:             string | null;
  notes:                 string | null;
  status:                'pending' | 'approved' | 'rejected';
  rejection_reason:      string | null;
  validated_by:          number | null;
  validated_at:          string | null;
  latitude:              number | null;
  longitude:             number | null;
  address_text:          string | null;
  created_at:            string;
}

interface ListParams {
  page?:   number;
  limit?:  number;
  status?: string;
}

export function useReports(params: ListParams = {}) {
  return useQuery({
    queryKey: ['reports', params],
    queryFn:  async () => {
      const { data } = await api.get('/api/reports', { params });
      return data;
    },
  });
}

export function useReport(id: number) {
  return useQuery({
    queryKey: ['report', id],
    queryFn:  async () => {
      const { data } = await api.get(`/api/reports/${id}`);
      return data.data as Report;
    },
    enabled: !!id,
  });
}

export function useValidateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      actual_weight,
      rejection_reason,
    }: {
      id:               number;
      action:           'approve' | 'reject';
      actual_weight?:   number;
      rejection_reason?: string;
    }) => {
      const { data } = await api.patch(`/api/reports/${id}/validate`, {
        action, actual_weight, rejection_reason,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}