"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Clock,
  Wallet,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { StatsCard } from "@/components/charts/StatsCard";
import { Badge } from "@/components/ui/Badge";
import api from "@/lib/axios";
import { useState } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const [reportLimit, setReportLimit] = useState(5);
  const [withdrawLimit, setWithdrawLimit] = useState(5);

  const { data: statsData } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await api.get("/api/dashboard/stats")).data.data,
    refetchInterval: 30_000, // refresh every 30 seconds
  });

  const { data: reportsData } = useQuery({
    queryKey: ["dashboard-reports", reportLimit],
    queryFn: async () =>
      (
        await api.get("/api/reports", {
          params: { page: 1, limit: reportLimit },
        })
      ).data,
    refetchInterval: 30_000,
  });

  const { data: withdrawData } = useQuery({
    queryKey: ["dashboard-withdrawals", withdrawLimit],
    queryFn: async () =>
      (
        await api.get("/api/withdrawals", {
          params: { page: 1, limit: withdrawLimit },
        })
      ).data,
    refetchInterval: 30_000,
  });
  const reports = reportsData?.data ?? [];
  const withdrawals = withdrawData?.data ?? [];
  const stats = statsData ?? {};

  return (
    <div className="animate-fade-in">
      <TopBar heading="Dashboard" />

      <div className="px-6 py-6 space-y-8">
        {/* ── KPI Cards — all real data ─────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard
            title="Total Reports"
            value={stats.reports?.total_reports ?? "—"}
            icon={FileText}
            trend={{ value: 0, label: "all time" }}
          />
          <StatsCard
            title="Pending Reports"
            value={stats.reports?.pending_reports ?? "—"}
            icon={Clock}
            accent="text-amber-400"
          />
          <StatsCard
            title="Total Withdrawals"
            value={stats.withdrawals?.total_withdrawals ?? "—"}
            icon={Wallet}
            trend={{ value: 0, label: "all time" }}
          />
          <StatsCard
            title="Active Users"
            value={stats.users?.active_users ?? "—"}
            icon={Users}
            accent="text-brand-300"
          />
        </div>

        {/* ── Secondary stats row ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            {
              label: "Approved Reports",
              value: stats.reports?.approved_reports ?? "—",
              icon: CheckCircle2,
              color: "text-brand-300",
            },
            {
              label: "Rejected Reports",
              value: stats.reports?.rejected_reports ?? "—",
              icon: XCircle,
              color: "text-red-400",
            },
            {
              label: "Total Warga",
              value: stats.users?.total_warga ?? "—",
              icon: Users,
              color: "text-ink-muted",
            },
            {
              label: "Pending Withdrawals",
              value: stats.withdrawals?.pending_withdrawals ?? "—",
              icon: Wallet,
              color: "text-amber-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <s.icon size={16} className={s.color} />
              <div>
                <p className="text-[10px] text-ink-faint uppercase tracking-widest">
                  {s.label}
                </p>
                <p className={`font-mono font-medium text-lg ${s.color}`}>
                  {s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid xl:grid-cols-2 gap-6">
          {/* Recent Reports */}
          <div className="bg-surface-raised border border-surface-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between">
              {reportLimit < (reportsData?.meta?.total ?? 0) ? (
                <button
                  onClick={() => setReportLimit((l) => l + 5)}
                  className="text-xs text-brand hover:underline"
                >
                  Load 5 more ({reportsData?.meta?.total - reportLimit}{" "}
                  remaining)
                </button>
              ) : (
                <span className="text-xs text-ink-faint">
                  All reports shown
                </span>
              )}
              <Link
                href="/reports"
                className="text-xs text-ink-muted hover:text-brand transition-colors"
              >
                Full list →
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-overlay">
                  {["Warga", "Category", "Weight", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs text-ink-muted font-medium uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((r: any) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/reports/${r.id}`)}
                    className="border-b border-surface-border/50 hover:bg-surface-overlay transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 text-ink">{r.warga_name}</td>
                    <td className="px-4 py-2.5 text-ink-muted">
                      {r.category_name}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {r.estimated_weight} kg
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge status={r.status} />
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-ink-muted text-xs"
                    >
                      No reports yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Recent Withdrawals */}
          <div className="bg-surface-raised border border-surface-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between">
              {withdrawLimit < (withdrawData?.meta?.total ?? 0) ? (
                <button
                  onClick={() => setWithdrawLimit((l) => l + 5)}
                  className="text-xs text-brand hover:underline"
                >
                  Load 5 more ({withdrawData?.meta?.total - withdrawLimit}{" "}
                  remaining)
                </button>
              ) : (
                <span className="text-xs text-ink-faint">
                  All withdrawals shown
                </span>
              )}
              <Link
                href="/withdrawals"
                className="text-xs text-ink-muted hover:text-brand transition-colors"
              >
                Full list →
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-overlay">
                  {["User", "E-Wallet", "Amount", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs text-ink-muted font-medium uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w: any) => (
                  <tr
                    key={w.id}
                    className="border-b border-surface-border/50 hover:bg-surface-overlay transition-colors"
                  >
                    <td className="px-4 py-2.5 text-ink">{w.full_name}</td>
                    <td className="px-4 py-2.5 text-ink-muted">
                      {w.e_wallet} - {w.account_number}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-brand-300">
                      {w.amount.toLocaleString("id-ID")} pts
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge status={w.status} />
                    </td>
                  </tr>
                ))}
                {withdrawals.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-ink-muted text-xs"
                    >
                      No withdrawals yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
