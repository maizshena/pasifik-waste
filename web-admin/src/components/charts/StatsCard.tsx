'use client';

import { LucideIcon, TrendingUp } from 'lucide-react';

interface Props {
  title:   string;
  value:   string | number;
  icon:    LucideIcon;
  trend?:  { value: number; label: string };
  accent?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, accent = 'text-brand' }: Props) {
  return (
    <div className="bg-surface-raised border border-surface-border rounded-2xl p-5 hover:border-brand/30 transition-colors duration-300 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-ink-muted uppercase tracking-widest mb-2">{title}</p>
          <p className={`font-display text-3xl ${accent}`}>{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl bg-surface-overlay border border-surface-border group-hover:border-brand/20 transition-colors`}>
          <Icon size={18} className={accent} />
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <TrendingUp size={12} className="text-brand-400" />
          <span className="text-brand-400 font-medium">+{trend.value}%</span>
          <span className="text-ink-faint">{trend.label}</span>
        </div>
      )}
    </div>
  );
}