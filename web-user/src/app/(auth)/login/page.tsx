'use client';

import { useState }     from 'react';
import { useRouter }    from 'next/navigation';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { Button }       from '@/components/ui/Button';
import api              from '@/lib/axios';

export default function LoginPage() {
  const router  = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [showPw,  setShowPw]  = useState(false);
  const [err,     setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!form.email || !form.password) { setErr('All fields required'); return; }

    setLoading(true);
    setErr('');

    try {
      const { data } = await api.post('/api/auth/login', form);
      const { user, accessToken, refreshToken } = data.data;

      if (user.role !== 'warga') {
        setErr('This portal is for residents only. Please use the Admin Dashboard.');
        return;
      }

      setAuth(user, accessToken, refreshToken);
      router.replace('/home');
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-surface flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10 animate-slide-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand shadow-float mb-4">
          <Leaf size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-3xl text-ink">Pasifik</h1>
        <p className="text-ink-muted text-sm mt-1">
          Sustainable Waste Management
        </p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-modal p-7 animate-slide-up">
        <h2 className="font-display font-semibold text-xl text-ink mb-6">
          Welcome back!
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {err && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <p className="text-xs text-red-500">{err}</p>
            </div>
          )}

          <Button
            onClick={handleLogin}
            loading={loading}
            full
            size="lg"
          >
            Sign In
          </Button>

          <p className="text-center text-sm text-ink-muted">
            Don&apos;t have an account?{' '}
            <button
              onClick={() => router.push('/register')}
              className="text-brand font-semibold hover:underline"
            >
              Register
            </button>
          </p>
        </div>
      </div>

      <p className="text-xs text-ink-faint mt-8">
        Pasifik © 2026 For residents of the region
      </p>
    </div>
  );
}