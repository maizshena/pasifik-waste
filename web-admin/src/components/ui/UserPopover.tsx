'use client';

import { useState, useRef, useEffect } from 'react';
import { User, Phone, Mail, Activity } from 'lucide-react';
import { Badge } from './Badge';

interface ActivityEntry {
  date:   string;
  action: string;
  status: string;
}

interface Props {
  name:     string;
  email:    string;
  phone:    string;
  role:     string;
  activity: ActivityEntry[];
  children: React.ReactNode;
}

export function UserPopover({ name, email, phone, role, activity, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {children}
      </div>

      {open && (
        <div className="absolute z-40 top-full left-0 mt-2 w-72 bg-surface-overlay border border-surface-border rounded-xl shadow-modal animate-fade-in">
          {/* Profile */}
          <div className="p-4 border-b border-surface-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center">
                <User size={16} className="text-brand" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{name}</p>
                <span className="text-xs text-ink-muted capitalize">{role.replace('_', ' ')}</span>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <Mail size={11} /> <span>{email}</span>
              </div>
              {phone && (
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <Phone size={11} /> <span>{phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Activity log */}
          <div className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Activity size={12} className="text-brand" />
              <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">Recent Activity</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activity.length === 0 && (
                <p className="text-xs text-ink-faint">No activity yet.</p>
              )}
              {activity.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-ink">{a.action}</p>
                    <p className="text-[10px] text-ink-faint">{new Date(a.date).toLocaleDateString()}</p>
                  </div>
                  <Badge status={a.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}