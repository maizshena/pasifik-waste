// src/app/(dashboard)/withdrawals/page.tsx
'use client';

import { useState }          from 'react';
import { TopBar }            from '@/components/layout/TopBar';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge }             from '@/components/ui/Badge';
import { Button }            from '@/components/ui/Button';
import { Modal }             from '@/components/ui/Modal';
import { Toast }             from '@/components/ui/Toast';
import { useToast }          from '@/hooks/useToast';
import {
  useWithdrawals, useProcessWithdrawal, Withdrawal,
} from '@/hooks/useWithdrawals';
import {
  Building2, CreditCard, User, Calendar,
  Hash, CheckCircle2, XCircle, Clock,
  AlertTriangle, ArrowUpRight,
  Wallet,
} from 'lucide-react';

const STATUS_OPTS = ['', 'pending', 'success', 'rejected'] as const;

// ── Detail Panel ──────────────────────────────────────────────────────────────
function DetailField({
  icon: Icon, label, value, mono = false, accent,
}: {
  icon:     typeof Building2;
  label:    string;
  value:    React.ReactNode;
  mono?:    boolean;
  accent?:  string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-surface-border/50 last:border-0">
      <div className="p-1.5 rounded-lg bg-surface-overlay border border-surface-border flex-shrink-0 mt-0.5">
        <Icon size={12} className="text-ink-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-ink-faint uppercase tracking-widest mb-0.5">
          {label}
        </p>
        <p className={`text-sm break-all ${mono ? 'font-mono' : ''} ${accent ?? 'text-ink'}`}>
          {value ?? '—'}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WithdrawalsPage() {
  const [page,   setPage]   = useState(1);
  const [status, setStatus] = useState('');

  // Detail panel state
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Process modal state
  const [processModal, setProcessModal] = useState<{
    action: 'confirm' | 'reject';
  } | null>(null);
  const [reason,   setReason]   = useState('');

  const { toasts, show: showToast, remove: removeToast } = useToast();
  const { data, isLoading } = useWithdrawals({
    page, limit: 20, status: status || undefined,
  });
  const process = useProcessWithdrawal();

  const rows: Withdrawal[] = data?.data ?? [];

  function openDetail(w: Withdrawal) {
    setSelected(w);
    setDetailOpen(true);
  }

  async function handleProcess() {
    if (!selected || !processModal) return;
    try {
      await process.mutateAsync({
        id:               selected.id,
        action:           processModal.action,
        rejection_reason: processModal.action === 'reject' ? reason : undefined,
      });
      showToast(
        processModal.action === 'confirm'
          ? 'Transfer confirmed!'
          : 'Withdrawal rejected.',
        processModal.action === 'confirm' ? 'success' : 'error'
      );
      setProcessModal(null);
      setDetailOpen(false);
      setSelected(null);
      setReason('');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    }
  }

  const columns: Column<Withdrawal>[] = [
    {
      key: 'id',
      header: '#',
      render: (r) => (
        <span className="font-mono text-xs text-ink-faint">#{r.id}</span>
      ),
      className: 'w-14',
    },
    {
      key: 'user',
      header: 'Warga',
      render: (r) => (
        <div>
          <p className="text-ink font-medium">{r.full_name}</p>
          <p className="text-xs text-ink-muted">{r.email}</p>
        </div>
      ),
    },
    {
      key: 'e_wallet',
      header: 'E-Wallet',
      render: (r) => (
        <div>
          <p className="text-ink">{r.e_wallet}</p>
          <p className="text-xs text-ink-muted font-mono">{r.account_number}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (r) => (
        <span className="font-mono text-brand-300 font-medium">
          {r.amount.toLocaleString('id-ID')} pts
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge status={r.status} />,
    },
    {
      key: 'date',
      header: 'Requested',
      render: (r) => (
        <span className="text-xs text-ink-muted">
          {new Date(r.created_at).toLocaleDateString('id-ID')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); openDetail(r); }}
          className="flex items-center gap-1 text-xs text-brand hover:underline"
        >
          Details <ArrowUpRight size={11} />
        </button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <TopBar heading="Withdrawals" />

      {/* Toasts */}
      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onClose={() => removeToast(t.id)}
        />
      ))}

      <div className="px-6 py-6 space-y-5">
        {/* Filter tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_OPTS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`
                px-3 py-1 rounded-lg text-xs font-medium transition-colors
                ${status === s
                  ? 'bg-brand text-white'
                  : 'text-ink-muted bg-surface-overlay border border-surface-border hover:text-ink'
                }
              `}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={rows}
          meta={data?.meta}
          loading={isLoading}
          onPageChange={setPage}
          onRowClick={openDetail}
          emptyText="No withdrawals found"
        />
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      <Modal
        open={detailOpen}
        onClose={() => {
          if (process.isPending) return; // block close during mutation
          setDetailOpen(false);
          setSelected(null);
        }}
        title={`Withdrawal #${selected?.id}`}
        size="md"
      >
        {selected && (
          <div className="space-y-4">
            {/* Status banner */}
            <div className={`
              flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium
              ${selected.status === 'pending'
                ? 'bg-amber-400/10 border-amber-400/20 text-amber-300'
                : selected.status === 'success'
                  ? 'bg-brand/10 border-brand/20 text-brand-300'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }
            `}>
              {selected.status === 'pending' && <Clock size={15} />}
              {selected.status === 'success' && <CheckCircle2 size={15} />}
              {selected.status === 'rejected' && <XCircle size={15} />}
              <span className="capitalize">{selected.status}</span>
              {selected.transfer_ref && (
                <span className="ml-auto font-mono text-xs text-ink-muted">
                  Ref: {selected.transfer_ref}
                </span>
              )}
            </div>

            {/* Fields */}
            <div className="bg-surface rounded-xl border border-surface-border px-4">
              <DetailField
                icon={User}
                label="Account Holder"
                value={selected.account_holder}
              />
              <DetailField
                icon={Building2}
                label="E-Wallet"
                value={selected.e_wallet}
              />
              <DetailField
                icon={CreditCard}
                label="Account Number"
                value={selected.account_number}
                mono
              />
              <DetailField
                icon={Hash}
                label="Amount Requested"
                value={`${selected.amount.toLocaleString('id-ID')} points`}
                accent="text-brand-300"
                mono
              />
              <DetailField
                icon={User}
                label="Requested by"
                value={`${selected.full_name} (${selected.email})`}
              />
              <DetailField
                icon={Calendar}
                label="Requested at"
                value={new Date(selected.created_at).toLocaleString('id-ID', {
                  dateStyle: 'long', timeStyle: 'short',
                })}
              />
              {selected.processed_at && (
                <DetailField
                  icon={Calendar}
                  label="Processed at"
                  value={new Date(selected.processed_at).toLocaleString('id-ID', {
                    dateStyle: 'long', timeStyle: 'short',
                  })}
                />
              )}
              {selected.rejection_reason && (
                <DetailField
                  icon={XCircle}
                  label="Rejection Reason"
                  value={selected.rejection_reason}
                  accent="text-red-400"
                />
              )}
            </div>

            {selected.status === 'pending' && (
              <div className="flex gap-2 justify-end pt-4 border-t border-surface-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailOpen(false)}
                  disabled={process.isPending}
                >
                  Close
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={process.isPending}
                  onClick={() => setProcessModal({ action: 'reject' })}
                >
                  <XCircle size={14} /> Reject
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={process.isPending}
                  onClick={() => setProcessModal({ action: 'confirm' })}
                >
                  <CheckCircle2 size={13} /> Confirm
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={processModal?.action === 'confirm'}
        onClose={() => { if (!process.isPending) setProcessModal(null); }}
        title="Confirm Manual Transfer"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-surface rounded-xl border border-surface-border px-4">
            <DetailField
              icon={User}
              label="Transfer To"
              value={selected?.account_holder}
            />
            <DetailField
              icon={Wallet}
              label="E-Wallet"
              value={`${selected?.e_wallet} — ${selected?.account_number}`}
              mono
            />
            <DetailField
              icon={Hash}
              label="Amount"
              value={`${selected?.amount.toLocaleString('id-ID')} pts`}
              accent="text-brand-300"
              mono
            />
          </div>
          <p className="text-xs text-ink-muted">
            A mock transfer reference will be generated automatically.
            Make sure the manual e-wallet transfer has been completed before confirming.
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              disabled={process.isPending}
              onClick={() => setProcessModal(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={process.isPending}
              onClick={handleProcess}
            >
              <CheckCircle2 size={13} /> Yes, Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Reject Modal ──────────────────────────────────────────────────── */}
      <Modal
        open={processModal?.action === 'reject'}
        onClose={() => { if (!process.isPending) setProcessModal(null); }}
        title="Reject Withdrawal"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex-shrink-0">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <p className="text-sm text-ink-muted">
              The locked balance will be returned to the warga's available balance.
              Provide an optional reason below.
            </p>
          </div>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={process.isPending}
            placeholder="Rejection reason (optional)…"
            className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink focus:outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 resize-none disabled:opacity-50"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              disabled={process.isPending}
              onClick={() => setProcessModal(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={process.isPending}
              onClick={handleProcess}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}