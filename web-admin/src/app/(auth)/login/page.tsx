"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import api from "@/lib/axios";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!form.email || !form.password) {
      setErr("All fields required");
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const { data } = await api.post("/api/auth/login", form);
      const { user, accessToken, refreshToken } = data.data;

      // block warga from admin dashboard — redirect to placeholder
      if (user.role === "warga") {
        setAuth(user, accessToken, refreshToken);
        router.replace("/warga-only");
        return;
      }

      setAuth(user, accessToken, refreshToken);
      router.replace("/dashboard");
    } catch (e: any) {
      setErr(e.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#171717] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand/15 border border-brand/20 shadow-glow mb-4">
            <Leaf size={22} className="text-brand" />
          </div>
          <h1 className="font-display text-2xl text-ink">Pasifik</h1>
          <p className="text-sm text-ink-muted mt-1">Admin Console</p>
        </div>

        {/* Form card */}
        <div className="bg-surface-raised border border-surface-border rounded-2xl p-7 shadow-modal">
          <h2 className="font-display text-lg text-ink mb-5">Sign in</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@pasifik.id"
                className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 bg-surface border border-surface-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-colors"
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

            <Button
              onClick={handleLogin}
              loading={loading}
              className="w-full"
              size="lg"
            >
              Sign in
            </Button>
          </div>
          <p className="text-center text-xs pt-3 text-ink-muted mt-2">
            Need an account?{" "}
            <button
              onClick={() => router.push("/register")}
              className="text-brand hover:underline"
            >
              Register
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-ink-faint mt-5">
          Pasifik Sustainable Waste Management Ecosystem
        </p>
      </div>
    </div>
  );
}
