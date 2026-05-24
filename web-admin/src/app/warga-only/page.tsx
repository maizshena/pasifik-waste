'use client';

import { useRouter }    from 'next/navigation';
import { Leaf, Smartphone, Globe, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export default function WargaOnlyPage() {
  const { user, logout } = useAuthStore();
  const router           = useRouter();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md text-center animate-slide-up">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/15 border border-brand/20 shadow-glow mb-6">
          <Leaf size={28} className="text-brand" />
        </div>

        <h1 className="font-display text-3xl text-ink mb-2">Pasifik</h1>
        <p className="text-ink-muted text-sm mb-8">
          Sustainable Waste Management Ecosystem
        </p>

        {/* Card */}
        <div className="bg-surface-raised border border-surface-border rounded-2xl p-8 shadow-modal space-y-6">
          <div>
            <p className="text-ink font-medium text-lg">
              Hi, {user?.full_name ?? 'Warga'} 👋
            </p>
            <p className="text-ink-muted text-sm mt-1">
              Your account has Warga access. The Pasifik resident
              portal is coming soon!
            </p>
          </div>

          {/* Platform cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface border border-surface-border rounded-xl p-4 text-left">
              <Smartphone size={20} className="text-brand mb-2" />
              <p className="text-xs font-medium text-ink">Mobile App</p>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Available on Android & iOS
              </p>
              <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-brand/10 text-brand-300 border border-brand/20">
                Coming Soon
              </span>
            </div>

            <div className="bg-surface border border-surface-border rounded-xl p-4 text-left">
              <Globe size={20} className="text-brand mb-2" />
              <p className="text-xs font-medium text-ink">Web Platform</p>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Access from any browser
              </p>
              <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                In Development
              </span>
            </div>
          </div>

          <p className="text-xs text-ink-faint">
            Submit waste reports, track your points, and request
            withdrawals — all from one place. Stay tuned!
          </p>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm text-red-400 border border-red-900/30 hover:bg-red-900/10 transition-colors"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>

        <p className="text-xs text-ink-faint mt-6">
          Pasifik © 2025 — Sustainable Waste Management
        </p>
      </div>
    </div>
  );
}