import api from "@/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Withdrawal {
  id: number;
  amount: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  status: "pending" | "success" | "rejected";
  rejection_reason: string | null;
  transfer_ref: string | null;
  created_at: string;
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/api/auth/me")).data.data,
    refetchInterval: 30_000,
  });
}

export function useMyWithdrawals() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["my-withdrawals"],
    staleTime: 30_000,
    queryFn: async () => {
      const res = await api.get("/api/withdrawals/my");
      const raw = res.data;
      return (Array.isArray(raw) ? raw : (raw.data ?? [])) as Withdrawal[];
    },
  });
}

export function useRequestWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      amount: number;
      bank_name: string;
      account_number: string;
      account_holder: string;
    }) => api.post("/api/withdrawals", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["me"] }); // ← refresh balance
    },
  });
}
