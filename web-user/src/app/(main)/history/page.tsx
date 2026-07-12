'use client';

import { useCallback }           from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link                       from 'next/link';
import {
  ClipboardList, ChevronRight,
  Leaf, Filter, Image as ImageIcon,
} from 'lucide-react';
import { useMyReports }           from '@/hooks/useReports';
import { useLangStore }           from '@/store/lang.store';
import { Badge }                  from '@/components/ui/Badge';

const API_URL   = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const STATUS_OPTS = ['', 'pending', 'approved', 'rejected'] as const;

// ── helper: ambil URL foto pertama dari report ──────────────────────────────
function getFirstPhoto(r: any): string | null {
  // Coba photo_urls (array JSON) dulu
  if (r.photo_urls) {
    try {
      const parsed = typeof r.photo_urls === 'string'
        ? JSON.parse(r.photo_urls)
        : r.photo_urls;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch {}
  }
  // Fallback ke photo_url tunggal
  if (r.photo_url) return r.photo_url;
  return null;
}

function toAbsolute(url: string) {
  return url.startsWith('/uploads/') ? `${API_URL}${url}` : url;
}

// ── Empty state yang berbeda-beda per status ────────────────────────────────
function EmptyState({ status }: { status: string }) {
  const messages: Record<string, { icon: string; title: string; sub: string }> = {
    '':         { icon: '📋', title: 'Belum ada laporan',      sub: 'Mulai kirim laporan sampah pertamamu!'         },
    pending:    { icon: '⏳', title: 'Tidak ada yang pending',  sub: 'Semua laporanmu sudah diproses admin.'         },
    approved:   { icon: '✅', title: 'Belum ada yang disetujui', sub: 'Laporan yang disetujui akan muncul di sini.'  },
    rejected:   { icon: '❌', title: 'Tidak ada yang ditolak',  sub: 'Bagus! Tidak ada laporan yang ditolak.'        },
  };
  const m = messages[status] ?? messages[''];
  return (
    <div className="card p-10 text-center mt-4 space-y-2">
      <p className="text-3xl">{m.icon}</p>
      <p className="text-sm font-semibold text-ink">{m.title}</p>
      <p className="text-xs text-ink-muted">{m.sub}</p>
    </div>
  );
}

export default function HistoryPage() {
  const { t }         = useLangStore();
  const router        = useRouter();
  const pathname      = usePathname();
  const searchParams  = useSearchParams();

  // ── FIX 1: Filter & page state disimpan di URL ─────────────────────────
  const status  = searchParams.get('status') ?? '';
  const page    = parseInt(searchParams.get('page') ?? '1', 10);

  const setParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else        params.delete(key);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  function handleStatusChange(s: string) {
    const params = new URLSearchParams();
    if (s) params.set('status', s);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const { data, isLoading } = useMyReports({
    page,
    limit:  10,
    status: status || undefined,
  });

  const reports = data?.data ?? [];
  const meta    = data?.meta;

  return (
    <div className="animate-fade-in">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display font-bold text-2xl text-ink">
          {t('history.title')}
        </h1>
      </div>

      {/* ── Filter tabs ──────────────────────────────────────────────────── */}
      <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <Filter size={13} className="text-ink-faint flex-shrink-0" />
        {STATUS_OPTS.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={`
              flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
              transition-all border
              ${status === s
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-ink-muted border-surface-border hover:border-brand hover:text-brand'
              }
            `}
          >
            {s === '' ? t('status.all') : t(`status.${s}`)}
          </button>
        ))}
      </div>

      <div className="px-4 mt-2 space-y-3">

        {/* ── FIX 5: Skeleton loading ──────────────────────────────────── */}
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}

        {/* ── FIX 3: Empty state per status ───────────────────────────── */}
        {!isLoading && reports.length === 0 && (
          <EmptyState status={status} />
        )}

        {/* ── Report list ──────────────────────────────────────────────── */}
        {!isLoading && reports.map((r: any) => {
          // FIX 2: ambil thumbnail foto
          const firstPhoto = getFirstPhoto(r);

          return (
            <Link
              key={r.id}
              href={`/history/${r.id}`}
              className="card p-4 flex items-start gap-3 hover:shadow-float transition-all"
            >
              {/* ── FIX 2: Thumbnail foto / fallback icon ─────────────── */}
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-brand-50 flex items-center justify-center border border-surface-border">
                {firstPhoto ? (
                  <img
                    src={toAbsolute(firstPhoto)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Kalau foto gagal load, tampilkan icon
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                      (e.currentTarget.nextElementSibling as HTMLElement)!.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="w-full h-full items-center justify-center"
                  style={{ display: firstPhoto ? 'none' : 'flex' }}
                >
                  <Leaf size={20} className="text-brand" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">
                      {r.category_name}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {t('history.estWeight')}: {r.estimated_weight} kg
                      {r.actual_weight && ` · Aktual: ${r.actual_weight} kg`}
                    </p>
                  </div>
                  <Badge status={r.status} />
                </div>

                {r.status === 'approved' && r.net_points != null && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-brand-600">
                      +{r.net_points.toLocaleString('id-ID')} pts
                    </span>
                    <span className="text-[10px] text-ink-faint">
                      (gross {r.gross_points?.toLocaleString('id-ID')} − fee {r.handling_fee?.toLocaleString('id-ID')})
                    </span>
                  </div>
                )}

                {r.status === 'rejected' && r.rejection_reason && (
                  <p className="text-xs text-red-500 mt-1">
                    {r.rejection_reason}
                  </p>
                )}

                {/* Foto count badge */}
                {firstPhoto && (
                  <div className="mt-1 flex items-center gap-1">
                    <ImageIcon size={10} className="text-ink-faint" />
                    <span className="text-[10px] text-ink-faint">
                      {(() => {
                        try {
                          const arr = typeof r.photo_urls === 'string'
                            ? JSON.parse(r.photo_urls)
                            : r.photo_urls;
                          return Array.isArray(arr) ? `${arr.length} foto` : '1 foto';
                        } catch { return '1 foto'; }
                      })()}
                    </span>
                  </div>
                )}

                <p className="text-[10px] text-ink-faint mt-1">
                  {new Date(r.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>

              <ChevronRight size={14} className="text-ink-faint flex-shrink-0 mt-1" />
            </Link>
          );
        })}

        {/* ── Pagination ───────────────────────────────────────────────── */}
        {meta && meta.totalPages > 1 && (
          <div className="flex gap-2 justify-center pb-4 pt-2">
            <button
              disabled={page <= 1}
              onClick={() => setParam('page', String(page - 1))}
              className="px-4 py-2 rounded-xl border border-surface-border text-sm text-ink-muted disabled:opacity-40 hover:border-brand hover:text-brand transition-colors"
            >
              {t('history.previous') || 'Sebelumnya'}
            </button>
            <span className="px-4 py-2 text-sm text-ink-muted">
              {page} / {meta.totalPages}
            </span>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => setParam('page', String(page + 1))}
              className="px-4 py-2 rounded-xl border border-surface-border text-sm text-ink-muted disabled:opacity-40 hover:border-brand hover:text-brand transition-colors"
            >
              {t('history.next') || 'Berikutnya'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
