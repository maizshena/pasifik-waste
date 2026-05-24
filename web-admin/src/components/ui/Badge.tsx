'use client';

type BadgeStatus = 'pending' | 'approved' | 'rejected' | 'success' | string;

const MAP: Record<string, { dot: string; text: string; ring: string }> = {
  pending:  { dot: 'bg-amber-400',  text: 'text-amber-300',  ring: 'ring-amber-900/60' },
  approved: { dot: 'bg-brand-400',  text: 'text-brand-300',  ring: 'ring-brand-900/60' },
  success:  { dot: 'bg-brand-400',  text: 'text-brand-300',  ring: 'ring-brand-900/60' },
  rejected: { dot: 'bg-red-500',    text: 'text-red-400',    ring: 'ring-red-900/60'   },
};

export function Badge({ status }: { status: BadgeStatus }) {
  const s = MAP[status] ?? MAP['pending'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ring-1 bg-black/20 ${s.text} ${s.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}