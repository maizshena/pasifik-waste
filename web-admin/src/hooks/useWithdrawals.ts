// src/hooks/useWithdrawals.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';

export interface Withdrawal {
  id:               number;
  user_id:          number;
  full_name:        string;
  email:            string;
  amount:           number;
  bank_name:        string;
  account_number:   string;
  account_holder:   string;
  status:           'pending' | 'success' | 'rejected';
  rejection_reason: string | null;
  processed_by:     number | null;
  processed_at:     string | null;
  transfer_ref:     string | null;
  created_at:       string;
}

interface ListParams { page?: number; limit?: number; status?: string; }

export function useWithdrawals(params: ListParams = {}) {
  return useQuery({
    queryKey: ['withdrawals', params],
    queryFn:  async () => {
      const { data } = await api.get('/api/withdrawals', { params });
      return data;
    },
  });
}

export function useProcessWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      transfer_ref,
      rejection_reason,
    }: {
      id:                number;
      action:            'confirm' | 'reject';
      transfer_ref?:     string;
      rejection_reason?: string;
    }) => {
      const { data } = await api.patch(`/api/withdrawals/${id}/process`, {
        action, transfer_ref, rejection_reason,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['withdrawals'] });
    },
  });
}