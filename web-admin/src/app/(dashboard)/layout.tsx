// src/app/(dashboard)/layout.tsx
'use client';

import { useEffect }    from 'react';
import { useRouter }    from 'next/navigation';
import { Sidebar }      from '@/components/layout/Sidebar';
import { Toast }        from '@/components/ui/Toast';
import { useToast }     from '@/hooks/useToast';
import { useAuthStore } from '@/store/auth.store';
import { useHydration } from '@/hooks/useHydration';
import { authEvents }   from '@/lib/authEvents';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, accessToken, logout } = useAuthStore();
  const router                        = useRouter();
  const hydrated                      = useHydration();
  const { toasts, show: showToast, remove: removeToast } = useToast();

  // ── Auth guard
  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken || !user) { router.replace('/login'); return; }
    if (user.role === 'warga') { router.replace('/warga-only'); }
  }, [hydrated, accessToken, user, router]);

  // ── Session expiry listener
  useEffect(() => {
    const unsub = authEvents.onSessionExpired(() => {
      logout();
      showToast('Session expired. Please log in again.', 'error');
      // Small delay so toast is visible before redirect
      setTimeout(() => router.replace('/login'), 1800);
    });
    return unsub;
  }, [logout, router, showToast]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!accessToken || !user || user.role === 'warga') return null;

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto transition-all duration-200">
        {/* global toast stack for session events */}
        {toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            onClose={() => removeToast(t.id)}
          />
        ))}
        {children}
      </main>
    </div>
  );
}