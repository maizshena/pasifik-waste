"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PlusCircle,
  Wallet,
  ChevronRight,
  Leaf,
  TrendingUp,
} from "lucide-react";
import { useMe } from "@/hooks/useWallet";
import { useMyReports } from "@/hooks/useReports";
import { useLangStore } from "@/store/lang.store";
import { Badge } from "@/components/ui/Badge";

export default function HomePage() {
  const { t } = useLangStore();
  const { data: me, isLoading: meLoading } = useMe();
  const { data: reportsData } = useMyReports({ page: 1, limit: 3 });
  const router = useRouter();

  const reports = reportsData?.data ?? [];
  const balance = me?.balance ?? 0;
  const locked = me?.locked_balance ?? 0;
  const firstName = me?.full_name?.split(" ")[0] ?? "Warga";

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const greetMap = { morning: "🌅", afternoon: "☀️", evening: "🌙" };

  return (
    <div className="animate-fade-in">
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-400 mx-4 mt-4 rounded-3xl p-6 shadow-float">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative">
          <p className="text-white/80 text-sm font-medium">
            {greetMap[timeOfDay]} {t("home.greeting")}, {firstName}!
          </p>

          <div className="mt-3 mb-1">
            <p className="text-white/60 text-xs uppercase tracking-widest font-medium">
              {t("home.balance")}
            </p>
            {meLoading ? (
              <div className="mt-2 space-y-2">
                <div className="h-9 w-44 rounded-xl bg-white/20 animate-pulse" />
              </div>
            ) : (
              <p className="font-display font-bold text-4xl text-white mt-1">
                {balance.toLocaleString("id-ID")}
                <span className="text-lg font-medium text-white/70 ml-1">
                  pts
                </span>
              </p>
            )}
          </div>

          {locked > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-white/50 text-xs">
                {locked.toLocaleString("id-ID")} pts {t("home.locked")}
              </span>
            </div>
          )}

          <div className="absolute top-0 right-0">
            <Leaf size={48} className="text-white/10" />
          </div>
        </div>
      </div>

      <div className="px-4 mt-5">
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-3">
          {t("home.quickActions")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push("/submit")}
            className="card p-4 flex items-center gap-3 hover:shadow-float transition-all active:scale-[0.98] text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <PlusCircle size={20} className="text-brand" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                {t("home.submitWaste")}
              </p>
              <p className="text-xs text-ink-muted">Earn points</p>
            </div>
          </button>

          <button
            onClick={() => router.push("/wallet")}
            className="card p-4 flex items-center gap-3 hover:shadow-float transition-all active:scale-[0.98] text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Wallet size={20} className="text-brand" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                {t("home.viewWallet")}
              </p>
              <p className="text-xs text-ink-muted">Withdraw points</p>
            </div>
          </button>
        </div>
      </div>

      <div className="px-4 mt-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest">
            {t("home.recentReports")}
          </p>
          <Link
            href="/history"
            className="flex items-center gap-0.5 text-xs text-brand font-medium hover:underline"
          >
            See all <ChevronRight size={12} />
          </Link>
        </div>

        {reports.length === 0 ? (
          <div className="card p-8 text-center">
            <TrendingUp size={28} className="text-brand-200 mx-auto mb-3" />
            <p className="text-sm text-ink-muted">{t("home.noReports")}</p>
            <button
              onClick={() => router.push("/submit")}
              className="mt-3 text-sm text-brand font-semibold hover:underline"
            >
              Submit your first report →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((r: any) => (
              <Link
                key={r.id}
                href={`/history/${r.id}`}
                className="card p-4 flex items-center gap-3 hover:shadow-float transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Leaf size={16} className="text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">
                    {r.category_name}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {r.estimated_weight} kg ·{" "}
                    {new Date(r.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <Badge status={r.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
