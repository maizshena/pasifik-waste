'use client';

import { useRouter }    from 'next/navigation';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export default function AdminOnlyPage() {
  const { logout } = useAuthStore();
  const router     = useRouter();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="text-center max-w-sm animate-slide-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 border border-red-100 mb-5">
          <ShieldAlert size={28} className="text-red-400" />
        </div>
        <h2 className="font-display font-semibold text-xl text-ink mb-2">
          Admin Access Only
        </h2>
        <p className="text-sm text-ink-muted mb-6">
          This portal is for residents only. Admins should use the Admin Dashboard.
        </p>
        <button
          onClick={() => { logout(); router.replace('/login'); }}
          className="flex items-center gap-2 mx-auto text-sm text-red-500 hover:underline"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}