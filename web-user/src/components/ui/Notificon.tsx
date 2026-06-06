'use client';

import {
  FileText, CheckCircle2, MessageCircle,
  ArrowDownCircle, Building2, Tag,
  Bell,
} from 'lucide-react';

export type NotifType =
  | 'new_report'
  | 'report_validated'
  | 'new_comment'
  | 'new_withdrawal'
  | 'withdrawal_processed'
  | 'new_category'
  | string;

interface Config {
  icon:  typeof Bell;
  color: string;
  bg:    string;
}

const TYPE_MAP: Record<string, Config> = {
  new_report:           { icon: FileText,        color: 'text-blue-500',   bg: 'bg-blue-50'   },
  report_validated:     { icon: CheckCircle2,    color: 'text-brand-500',  bg: 'bg-brand-50'  },
  new_comment:          { icon: MessageCircle,   color: 'text-violet-500', bg: 'bg-violet-50' },
  new_withdrawal:       { icon: ArrowDownCircle, color: 'text-amber-500',  bg: 'bg-amber-50'  },
  withdrawal_processed: { icon: Building2,       color: 'text-brand-500',  bg: 'bg-brand-50'  },
  new_category:         { icon: Tag,             color: 'text-pink-500',   bg: 'bg-pink-50'   },
};

const FALLBACK: Config = {
  icon:  Bell,
  color: 'text-ink-muted',
  bg:    'bg-surface-overlay',
};

interface Props {
  type:  NotifType;
  size?: number;
}

export function NotifIcon({ type, size = 14 }: Props) {
  const config  = TYPE_MAP[type] ?? FALLBACK;
  const Icon    = config.icon;

  return (
    <div className={`
      w-8 h-8 rounded-xl flex items-center justify-center
      flex-shrink-0 ${config.bg}
    `}>
      <Icon size={size} className={config.color} />
    </div>
  );
}