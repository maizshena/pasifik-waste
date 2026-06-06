import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface Withdrawal {
  id:               number;
  amount:           number;
  bank_name:        string;
  account_number:   string;
  account_holder:   string;
  status:           'pending' | 'success' | 'rejected';
  rejection_reason: string | null;
  transfer_ref:     string | null;
  created_at:       string;
}

export function useMe() {
  return useQuery({
    queryKey:        ['me'],
    queryFn:         async () => (await api.get('/api/auth/me')).data.data,
    refetchInterval: 30_000,
  });
}

export function useMyWithdrawals() {
  return useQuery({
    queryKey:  ['my-withdrawals'],
    staleTime: 30_000,
    queryFn:   async () => {
      const res = await api.get('/api/withdrawals/my');
      const raw = res.data;
      return (Array.isArray(raw) ? raw : raw.data ?? []) as Withdrawal[];
    },
  });
}

export function useRequestWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      amount:         number;
      bank_name:      string;
      account_number: string;
      account_holder: string;
    }) => api.post('/api/withdrawals', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-withdrawals'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}