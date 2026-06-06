'use client';

import { useState }           from 'react';
import {
  Wallet, Lock, ArrowDownCircle,
  Building2, CreditCard, Hash,
  CheckCircle2, Clock, XCircle,
  TrendingUp,
} from 'lucide-react';
import { Button }             from '@/components/ui/Button';
import { Toast }              from '@/components/ui/Toast';
import { useToast }           from '@/hooks/useToast';
import { Badge }              from '@/components/ui/Badge';
import {
  useMe, useMyWithdrawals, useRequestWithdrawal,
} from '@/hooks/useWallet';
import { useLangStore }       from '@/store/lang.store';

const EMPTY_FORM = {
  amount:         '',
  e_wallet:      '',
  account_number: '',
  account_holder: '',
};

export default function WalletPage() {
  const { t }                               = useLangStore();
  const { data: me, isLoading: meLoading }  = useMe();
  const { data: withdrawals = [] }          = useMyWithdrawals();
  const requestWithdrawal                   = useRequestWithdrawal();
  const { toasts, show: showToast, remove } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(EMPTY_FORM);

  const balance = me?.balance        ?? 0;
  const locked  = me?.locked_balance ?? 0;

  async function handleWithdraw() {
    const amt = parseInt(form.amount, 10);

    if (!form.amount || isNaN(amt) || amt <= 0) {
      showToast(t('wallet.validAmount'), 'error');
      return;
    }
    if (amt > balance) {
      showToast(t('wallet.insufficientBalance'), 'error');
      return;
    }
    if (!form.e_wallet || !form.account_number || !form.account_holder) {
      showToast(t('wallet.allRequired'), 'error');
      return;
    }

    try {
      await requestWithdrawal.mutateAsync({
        amount:         amt,
        e_wallet:      form.e_wallet,
        account_number: form.account_number,
        account_holder: form.account_holder,
      });

      // ✓ Reset form and close panel on success
      setForm(EMPTY_FORM);
      setShowForm(false);
      showToast(t('wallet.submitted'), 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || t('common.error'), 'error');
    }
  }

  function openForm() {
    setForm(EMPTY_FORM); // always start fresh
    setShowForm(true);
  }

  return (
    <div className="animate-fade-in pb-4">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
      ))}

      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display font-bold text-2xl text-ink">
          {t('wallet.title')}
        </h1>
      </div>

      {/* ── Balance cards ─────────────────────────────────────────────── */}
      <div className="px-4 mt-2 space-y-3">
        {/* Main balance */}
        <div className="card p-5 bg-gradient-to-br from-brand-500 to-brand-400 border-0">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-white/70" />
            <span className="text-xs text-white/70 font-medium uppercase tracking-wide">
              {t('wallet.available')}
            </span>
          </div>
          {meLoading ? (
            <div className="h-9 w-36 rounded-xl bg-white/20 animate-pulse" />
          ) : (
            <p className="font-display font-bold text-3xl text-white">
              {balance.toLocaleString('id-ID')}
              <span className="text-lg font-normal text-white/70 ml-1">pts</span>
            </p>
          )}
        </div>

        {/* Locked balance */}
        {locked > 0 && (
          <div className="card p-4 bg-amber-50 border-amber-100">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-amber-500" />
              <span className="text-xs text-amber-600 font-medium">
                {t('wallet.locked')}
              </span>
              <span className="ml-auto font-mono text-sm font-semibold text-amber-600">
                {locked.toLocaleString('id-ID')} pts
              </span>
            </div>
          </div>
        )}

        {/* ── Zero balance empty state ───────────────────────────────── */}
        {!meLoading && balance === 0 && (
          <div className="card p-6 text-center border-dashed">
            <TrendingUp size={28} className="text-brand-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-ink">
              No balance yet
            </p>
            <p className="text-xs text-ink-muted mt-1 mb-4">
              Submit waste reports and earn points.
              Points are added after admin validation.
            </p>
            <Button
              size="sm"
              variant="soft"
              onClick={() => window.location.href = '/submit'}
            >
              Submit a Report
            </Button>
          </div>
        )}

        {/* ── Withdraw button / form ─────────────────────────────────── */}
        {balance > 0 && (
          <>
            {!showForm ? (
              <Button
                full
                size="lg"
                variant="soft"
                onClick={openForm}
              >
                <ArrowDownCircle size={18} />
                {t('wallet.withdraw')}
              </Button>
            ) : (
              <div className="card p-5 space-y-4 animate-slide-up">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink">
                    {t('wallet.withdraw')}
                  </h3>
                  <button
                    onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                    className="text-xs text-ink-muted hover:text-ink"
                  >
                    {t('common.cancel')}
                  </button>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                    {t('wallet.amount')}
                    <span className="text-ink-faint font-normal ml-1 normal-case">
                      ({t('wallet.amountHint')}: {balance.toLocaleString('id-ID')})
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={balance}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="e.g. 10000"
                    className="input"
                  />
                </div>

                {[
                  {
                    label:       t('wallet.eWallet'),
                    key:         'e_wallet',
                    placeholder: 'GoPay / OVO / Dana / BCA…',
                    icon:        Building2,
                  },
                  {
                    label:       t('wallet.accountNumber'),
                    key:         'account_number',
                    placeholder: '08xxxxxxxxxx',
                    icon:        CreditCard,
                  },
                  {
                    label:       t('wallet.accountHolder'),
                    key:         'account_holder',
                    placeholder: 'Full name on account',
                    icon:        Hash,
                  },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                      {f.label}
                    </label>
                    <div className="relative">
                      <f.icon
                        size={14}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                      />
                      <input
                        type="text"
                        value={(form as any)[f.key]}
                        onChange={(e) =>
                          setForm({ ...form, [f.key]: e.target.value })
                        }
                        placeholder={f.placeholder}
                        className="input pl-9"
                      />
                    </div>
                  </div>
                ))}

                <Button
                  full
                  size="lg"
                  loading={requestWithdrawal.isPending}
                  onClick={handleWithdraw}
                >
                  {t('wallet.submitRequest')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Withdrawal history ─────────────────────────────────────────── */}
      <div className="px-4 mt-6">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-3">
          {t('wallet.myWithdrawals')}
        </p>

        {(withdrawals as any[]).length === 0 ? (
          <div className="card p-8 text-center">
            <ArrowDownCircle size={24} className="text-ink-faint mx-auto mb-2" />
            <p className="text-sm text-ink-muted">{t('wallet.noWithdrawals')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(withdrawals as any[]).map((w) => (
              <div key={w.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {w.e_wallet}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5 font-mono">
                      {w.account_number}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {w.account_holder}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-bold text-sm text-brand-600">
                      {w.amount.toLocaleString('id-ID')} pts
                    </p>
                    <div className="mt-1">
                      <Badge status={w.status} />
                    </div>
                  </div>
                </div>

                {w.transfer_ref && (
                  <p className="text-[11px] text-ink-faint font-mono mt-2">
                    {t('wallet.ref')}: {w.transfer_ref}
                  </p>
                )}
                {w.rejection_reason && (
                  <p className="text-xs text-red-500 mt-1.5">
                    {w.rejection_reason}
                  </p>
                )}

                <p className="text-[10px] text-ink-faint mt-2">
                  {new Date(w.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}