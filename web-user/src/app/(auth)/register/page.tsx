// src/app/(auth)/register/page.tsx
'use client';

import { useState }     from 'react';
import { useRouter }    from 'next/navigation';
import { Leaf, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { Button }       from '@/components/ui/Button';
import api              from '@/lib/axios';

export default function RegisterPage() {
  const router  = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '',
  });
  const [showPw,  setShowPw]  = useState(false);
  const [err,     setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!form.full_name || !form.email || !form.password) {
      setErr('Name, email and password are required');
      return;
    }
    if (form.password.length < 8) {
      setErr('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setErr('');

    try {
      const { data } = await api.post('/api/auth/register', form);
      const { user, accessToken, refreshToken } = data.data;
      setAuth(user, accessToken, refreshToken);
      router.replace('/home');
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-surface flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8 animate-slide-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand shadow-float mb-4">
          <Leaf size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-3xl text-ink">Pasifik</h1>
        <p className="text-ink-muted text-sm mt-1">Join the community</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-modal p-7 animate-slide-up">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-5 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <h2 className="font-display font-semibold text-xl text-ink mb-6">
          Create account
        </h2>

        <div className="space-y-4">
          {[
            { label: 'Full Name', key: 'full_name', type: 'text',  placeholder: 'Your full name' },
            { label: 'Email',     key: 'email',     type: 'email', placeholder: 'you@example.com' },
            { label: 'Phone',     key: 'phone',     type: 'tel',   placeholder: '08xxxxxxxxxx', optional: true },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">
                {f.label}
                {f.optional && <span className="text-ink-faint font-normal ml-1">(optional)</span>}
              </label>
              <input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="input"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                placeholder="Min. 8 characters"
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

          <Button onClick={handleRegister} loading={loading} full size="lg">
            Create Account
          </Button>

          <p className="text-center text-sm text-ink-muted">
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-brand font-semibold hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}