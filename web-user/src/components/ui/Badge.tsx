'use client';

type BadgeStatus = 'pending' | 'approved' | 'rejected' | 'success' | string;

const MAP: Record<string, { bg: string; text: string; dot: string }> = {
  pending:  { bg: 'bg-amber-50',  text: 'text-amber-600',  dot: 'bg-amber-400'  },
  approved: { bg: 'bg-brand-50',  text: 'text-brand-600',  dot: 'bg-brand-400'  },
  success:  { bg: 'bg-brand-50',  text: 'text-brand-600',  dot: 'bg-brand-400'  },
  rejected: { bg: 'bg-red-50',    text: 'text-red-500',    dot: 'bg-red-400'    },
};

export function Badge({ status }: { status: BadgeStatus }) {
  const s = MAP[status] ?? MAP['pending'];
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
      ${s.bg} ${s.text}
    `}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}