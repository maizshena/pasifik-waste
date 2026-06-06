"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { UserPopover } from "@/components/ui/UserPopover";
import { useReports, Report } from "@/hooks/useReports";
import { useLangStore } from "@/store/lang.store";

const STATUS_OPTS = ["", "pending", "approved", "rejected"] as const;

export default function ReportsPage() {
  const { t } = useLangStore();

  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading } = useReports({
    page,
    limit: 20,
    status: status || undefined,
  });
  const rows: Report[] = data?.data ?? [];
  const meta = data?.meta;

const columns: Column<Report>[] = [
  {
    key: 'id',
    header: '#',
    render: (r) => <span className="font-mono text-xs text-ink-faint">#{r.id}</span>,
    className: 'w-14',
  },
  {
    key: 'warga',
    header: 'Warga',
    render: (r) => (
      <UserPopover
        name={r.warga_name}
        email=""
        phone={r.warga_phone ?? ''}
        role="warga"
        activity={[{ date: r.created_at, action: 'Submitted report', status: r.status }]}
      >
        <span className="text-ink hover:text-brand-300 transition-colors font-medium cursor-pointer">
          {r.warga_name}
        </span>
      </UserPopover>
    ),
  },
  {
    key: 'category',         // ← was duplicated somewhere
    header: 'Category',
    render: (r) => <span className="text-ink-muted">{r.category_name}</span>,
  },
  {
    key: 'est_weight',       // ← unique key
    header: 'Est. Weight',
    render: (r) => <span className="font-mono text-xs">{r.estimated_weight} kg</span>,
  },
  {
    key: 'actual_weight',    // ← unique key
    header: 'Actual',
    render: (r) => (
      <span className="font-mono text-xs text-brand-300">
        {r.actual_weight != null ? `${r.actual_weight} kg` : '—'}
      </span>
    ),
  },
  {
    key: 'net_points',
    header: 'Net Pts',
    render: (r) => (
      <span className="font-mono text-xs text-brand-400">
        {r.net_points != null ? r.net_points.toLocaleString('id-ID') : '—'}
      </span>
    ),
  },
  {
    key: 'report_status',    // ← was 'status', now unique
    header: 'Status',
    render: (r) => <Badge status={r.status} />,
  },
  {
    key: 'submitted_date',   // ← was 'date', now unique
    header: 'Submitted',
    render: (r) => (
      <span className="text-xs text-ink-muted">
        {new Date(r.created_at).toLocaleDateString('id-ID')}
      </span>
    ),
  },
];

  return (
    <div className="animate-fade-in">
      <TopBar heading={t('nav.reports')} />

      <div className="px-6 py-6 space-y-5">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter size={14} className="text-ink-muted" />
          <span className="text-xs text-ink-muted">Status:</span>
          <div className="flex gap-1">
            {STATUS_OPTS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  status === s
                    ? "bg-brand text-white"
                    : "text-ink-muted bg-surface-overlay border border-surface-border hover:text-ink"
                }`}
              >
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          meta={meta}
          loading={isLoading}
          onPageChange={setPage}
          onRowClick={(r) => router.push(`/reports/${r.id}`)}
        />
      </div>
    </div>
  );
}
