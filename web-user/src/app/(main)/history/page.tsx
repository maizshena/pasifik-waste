
'use client';

import { useState }     from 'react';
import Link             from 'next/link';
import { ClipboardList, ChevronRight, Leaf, Filter } from 'lucide-react';
import { useMyReports } from '@/hooks/useReports';
import { useLangStore } from '@/store/lang.store';
import { Badge }        from '@/components/ui/Badge';

const STATUS_OPTS = ['', 'pending', 'approved', 'rejected'] as const;

export default function HistoryPage() {
  const { t }                       = useLangStore();
  const [status, setStatus]         = useState('');
  const [page,   setPage]           = useState(1);

  const { data, isLoading } = useMyReports({
    page, limit: 10, status: status || undefined,
  });

  const reports = data?.data   ?? [];
  const meta    = data?.meta;

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display font-bold text-2xl text-ink">
          {t('history.title')}
        </h1>
      </div>

      <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <Filter size={13} className="text-ink-faint flex-shrink-0" />
        {STATUS_OPTS.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
              transition-all border
              ${status === s
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-ink-muted border-surface-border hover:border-brand hover:text-brand'
              }
            `}
          >
            {s === '' ? 'All' : t(`status.${s}`)}
          </button>
        ))}
      </div>

      <div className="px-4 mt-2 space-y-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}

        {!isLoading && reports.length === 0 && (
          <div className="card p-10 text-center mt-4">
            <ClipboardList size={28} className="text-ink-faint mx-auto mb-3" />
            <p className="text-sm text-ink-muted">{t('history.empty')}</p>
          </div>
        )}

        {!isLoading && reports.map((r: any) => (
          <Link
            key={r.id}
            href={`/history/${r.id}`}
            className="card p-4 flex items-start gap-3 hover:shadow-float transition-all"
          >
            <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Leaf size={18} className="text-brand" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {r.category_name}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {t('history.estWeight')}: {r.estimated_weight} kg
                    {r.actual_weight && ` · ${t('history.actWeight')}: ${r.actual_weight} kg`}
                  </p>
                </div>
                <Badge status={r.status} />
              </div>

              {r.status === 'approved' && r.net_points != null && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-brand-600">
                    +{r.net_points.toLocaleString('id-ID')} pts
                  </span>
                  <span className="text-[10px] text-ink-faint">
                    (gross {r.gross_points?.toLocaleString('id-ID')} − fee {r.handling_fee?.toLocaleString('id-ID')})
                  </span>
                </div>
              )}

              {r.status === 'rejected' && r.rejection_reason && (
                <p className="text-xs text-red-500 mt-1.5">
                  {r.rejection_reason}
                </p>
              )}

              <p className="text-[10px] text-ink-faint mt-1.5">
                {new Date(r.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>

            <ChevronRight size={14} className="text-ink-faint flex-shrink-0 mt-1" />
          </Link>
        ))}

        {meta && meta.totalPages > 1 && (
          <div className="flex gap-2 justify-center pb-4 pt-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 rounded-xl border border-surface-border text-sm text-ink-muted disabled:opacity-40 hover:border-brand hover:text-brand transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-ink-muted">
              {page} / {meta.totalPages}
            </span>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-xl border border-surface-border text-sm text-ink-muted disabled:opacity-40 hover:border-brand hover:text-brand transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}