'use client';

import { useState }     from 'react';
import { useRouter }    from 'next/navigation';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { Button }       from '@/components/ui/Button';
import api              from '@/lib/axios';

export default function RegisterPage() {
  const router  = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [err,    setErr]    = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!form.full_name || !form.email || !form.password) {
      setErr('Name, email and password are required');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.post('/api/auth/register', form);
      const { user, accessToken, refreshToken } = data.data;
      setAuth(user, accessToken, refreshToken);
      router.replace('/dashboard');
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand/15 border border-brand/20 shadow-glow mb-4">
            <Leaf size={22} className="text-brand" />
          </div>
          <h1 className="font-display text-2xl text-ink">Pasifik</h1>
          <p className="text-sm text-ink-muted mt-1">Create Admin Account</p>
        </div>

        <div className="bg-surface-raised border border-surface-border rounded-2xl p-7 shadow-modal">
          <h2 className="font-display text-lg text-ink mb-5">Register</h2>

          <div className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="John Doe"
                className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@pasifik.id"
                className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">
                Phone <span className="text-ink-faint font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
                className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 bg-surface border border-surface-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted transition-colors"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {err && (
              <p className="text-xs text-red-400 bg-red-900/10 border border-red-900/20 rounded-lg px-3 py-2">
                {err}
              </p>
            )}

            <Button onClick={handleRegister} loading={loading} className="w-full" size="lg">
              Create Account
            </Button>

            <p className="text-center text-xs text-ink-muted">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-brand hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}