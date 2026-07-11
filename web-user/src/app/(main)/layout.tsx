'use client';

import { useEffect }         from 'react';
import { useRouter }         from 'next/navigation';
import { TopBar }            from '@/components/layout/Topbar';
import { BottomNav }         from '@/components/layout/BottomNav';
import { Toast }             from '@/components/ui/Toast';
import { useToast }          from '@/hooks/useToast';
import { useAuthStore }      from '@/store/auth.store';
import { useHydration }      from '@/hooks/useHydration';
import { authEvents }        from '@/lib/authEvents';
import { NotificationSync }  from '@/hooks/useNotificationSync';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, accessToken, logout } = useAuthStore();
  const router                        = useRouter();
  const hydrated                      = useHydration();
  const { toasts, show, remove }      = useToast();

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken || !user) { router.replace('/login'); return; }
    if (user.role !== 'warga') { router.replace('/admin-only'); }
  }, [hydrated, accessToken, user, router]);

  useEffect(() => {
    const unsub = authEvents.onSessionExpired(() => {
      logout();
      show('Session expired. Please log in again.', 'error');
      setTimeout(() => router.replace('/login'), 1800);
    });
    return unsub;
  }, [logout, router, show]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!accessToken || !user || user.role !== 'warga') return null;

  return (
    <div className="min-h-screen bg-surface-muted">
      <TopBar />

      {/* Toast stack */}
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
      ))}

      <NotificationSync />

      <main className="max-w-lg mx-auto pb-nav">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}