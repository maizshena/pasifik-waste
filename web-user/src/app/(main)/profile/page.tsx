'use client';

import { useRouter }                          from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation }              from '@tanstack/react-query';
import {
  User, Lock, Eye, EyeOff,
  Upload, ZoomIn, ZoomOut, RotateCcw,
  CheckCircle2, LogOut,
} from 'lucide-react';
import { Button }      from '@/components/ui/Button';
import { Toast }       from '@/components/ui/Toast';
import { useToast }    from '@/hooks/useToast';
import { useLangStore } from '@/store/lang.store';
import { useAuthStore } from '@/store/auth.store';
import api              from '@/lib/axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ProfileData {
  id:         number;
  full_name:  string;
  email:      string;
  phone:      string | null;
  role:       string;
  avatar_url: string | null;
  created_at: string;
}

function cropToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res) => {
    const out = document.createElement('canvas');
    out.width = out.height = 256;
    out.getContext('2d')!.drawImage(canvas, 0, 0, 320, 320, 0, 0, 256, 256);
    out.toBlob((b) => res(b!), 'image/webp', 0.9);
  });
}

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const { t }                     = useLangStore();
  const { toasts, show: showToast, remove } = useToast();
  const router                    = useRouter();

  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '', new_password: '', confirm_password: '',
  });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  const [cropOpen,    setCropOpen]    = useState(false);
  const [rawImage,    setRawImage]    = useState<string | null>(null);
  const [cropOffset,  setCropOffset]  = useState({ x: 0, y: 0 });
  const [cropZoom,    setCropZoom]    = useState(1);
  const [isDragging,  setIsDragging]  = useState(false);
  const [dragStart,   setDragStart]   = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef  = useRef<HTMLImageElement | null>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  // ── Fetch profile ────────────────────────────────────────────────────────
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn:  async () =>
      (await api.get('/api/auth/profile')).data.data as ProfileData,
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name ?? '',
        phone:     profile.phone     ?? '',
      });
    }
  }, [profile]);

  // ── Crop canvas ──────────────────────────────────────────────────────────
  const drawCrop = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imageRef.current;
    if (!canvas || !img) return;
    const SIZE = 320;
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, SIZE, SIZE);
    const dw = img.naturalWidth  * cropZoom;
    const dh = img.naturalHeight * cropZoom;
    const dx = (SIZE - dw) / 2 + cropOffset.x;
    const dy = (SIZE - dh) / 2 + cropOffset.y;
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
    ctx.strokeStyle = 'rgba(115,175,111,0.5)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }, [cropZoom, cropOffset]);

  useEffect(() => { drawCrop(); }, [drawCrop]);

  useEffect(() => {
    if (!rawImage) return;
    const img  = new Image();
    img.onload = () => { imageRef.current = img; drawCrop(); };
    img.src    = rawImage;
  }, [rawImage, drawCrop]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader   = new FileReader();
    reader.onload  = (ev) => {
      setRawImage(ev.target?.result as string);
      setCropOffset({ x: 0, y: 0 });
      setCropZoom(1);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  }

  // ── Mutations ────────────────────────────────────────────────────────────
  const uploadAvatar = useMutation({
    mutationFn: async (blob: Blob) => {
      const fd = new FormData();
      fd.append('avatar', blob, 'avatar.webp');
      const { data } = await api.post('/api/auth/upload-avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as { url: string; user: any };
    },
    onSuccess: ({ user: updatedUser }) => {
      setUser(updatedUser);
      setCropOpen(false);
      showToast('Foto profil berhasil diperbarui!', 'success');
    },
    onError: () => showToast('Upload gagal. Coba lagi.', 'error'),
  });

  async function confirmCrop() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await cropToBlob(canvas);
    uploadAvatar.mutate(blob);
  }

  // ── FIX 6: Toast feedback di semua mutation ──────────────────────────────
  const updateProfile = useMutation({
    mutationFn: () => api.patch('/api/auth/profile', {
      full_name: profileForm.full_name || undefined,
      phone:     profileForm.phone     || undefined,
    }),
    onSuccess: (res) => {
      setUser(res.data.data);
      showToast('Profil berhasil disimpan! ✓', 'success');
    },
    onError: () => showToast('Gagal menyimpan profil', 'error'),
  });

  const changePassword = useMutation({
    mutationFn: () => {
      if (passwordForm.new_password !== passwordForm.confirm_password)
        throw new Error('Kata sandi tidak cocok');
      if (passwordForm.new_password.length < 8)
        throw new Error('Minimal 8 karakter');
      return api.patch('/api/auth/profile', {
        current_password: passwordForm.current_password,
        new_password:     passwordForm.new_password,
      });
    },
    onSuccess: () => {
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      showToast('Kata sandi berhasil diubah! ✓', 'success');
    },
    onError: (err: any) =>
      showToast(err.message || err.response?.data?.message || 'Gagal', 'error'),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  const initials  = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const avatarSrc = user?.avatar_url
    ? user.avatar_url.startsWith('/uploads/')
      ? `${API_URL}${user.avatar_url}`
      : user.avatar_url
    : null;

  type PwKey   = 'current' | 'new' | 'confirm';
  type PwStore = 'current_password' | 'new_password' | 'confirm_password';

  const PwField = ({ label, storeKey, pwKey }: {
    label: string; storeKey: PwStore; pwKey: PwKey;
  }) => (
    <div>
      <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={showPw[pwKey] ? 'text' : 'password'}
          value={passwordForm[storeKey]}
          onChange={(e) => setPasswordForm({ ...passwordForm, [storeKey]: e.target.value })}
          placeholder="••••••••"
          className="input pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPw({ ...showPw, [pwKey]: !showPw[pwKey] })}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
        >
          {showPw[pwKey] ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in pb-4">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
      ))}

      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display font-bold text-2xl text-ink">
          {t('profile.title')}
        </h1>
      </div>

      {/* ── Avatar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center py-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-3xl bg-brand-50 border-2 border-brand-100 flex items-center justify-center overflow-hidden">
            {uploadAvatar.isPending ? (
              <div className="w-full h-full flex items-center justify-center bg-surface-overlay">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            ) : avatarSrc ? (
              <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="font-display font-bold text-3xl text-brand">
                {initials(user?.full_name ?? 'WA')}
              </span>
            )}
          </div>
          {!uploadAvatar.isPending && (
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-3xl bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Upload size={20} className="text-white" />
            </button>
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="text-sm text-brand font-medium mt-3 hover:underline"
        >
          {uploadAvatar.isPending ? 'Mengunggah…' : t('profile.changePhoto')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="text-xs text-ink-muted mt-1">{user?.email}</p>
      </div>

      <div className="px-4 space-y-4">

        {/* ── Informasi pribadi ────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <User size={15} className="text-brand" />
            <h3 className="font-semibold text-ink">
              {t('profile.personalInfo')}
            </h3>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
              {t('profile.fullName')}
            </label>
            <input
              type="text"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
              {t('profile.phone')}
            </label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className="input"
            />
          </div>

          {/* FIX 6: Tombol Save dengan icon centang kalau sukses */}
          <Button
            full
            variant="soft"
            loading={updateProfile.isPending}
            onClick={() => updateProfile.mutate()}
          >
            {updateProfile.isSuccess ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Tersimpan!
              </span>
            ) : t('common.save')}
          </Button>
        </div>

        {/* ── Ganti kata sandi ─────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-brand" />
            <h3 className="font-semibold text-ink">
              {t('profile.changePassword')}
            </h3>
          </div>
          <PwField label={t('profile.currentPassword')} storeKey="current_password" pwKey="current" />
          <PwField label={t('profile.newPassword')}     storeKey="new_password"     pwKey="new"     />
          <PwField label={t('profile.confirmPassword')} storeKey="confirm_password" pwKey="confirm" />
          <Button
            full
            variant="soft"
            loading={changePassword.isPending}
            onClick={() => changePassword.mutate()}
          >
            {changePassword.isSuccess ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Berhasil Diubah!
              </span>
            ) : t('profile.updatePassword')}
          </Button>
        </div>

        {/* ── Sign out ─────────────────────────────────────────────────── */}
        <div className="card p-5">
          <button
            onClick={() => { logout(); router.replace('/login'); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-red-500 border border-red-100 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} /> {t('profile.signOut')}
          </button>
          <p className="text-center text-xs text-ink-faint mt-2">
            {t('profile.signOutNote')}
          </p>
        </div>
      </div>

      {/* ── Crop modal ───────────────────────────────────────────────────── */}
      {cropOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 animate-slide-up">
            <h3 className="font-semibold text-ink text-center">
              {t('profile.cropTitle') || 'Crop Foto'}
            </h3>
            <p className="text-xs text-ink-muted text-center">
              {t('profile.cropNote') || 'Drag untuk pindah · Zoom dengan kontrol'}
            </p>

            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className="rounded-full cursor-grab active:cursor-grabbing border-4 border-brand-100"
                onMouseDown={(e) => {
                  setIsDragging(true);
                  setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
                }}
                onMouseMove={(e) => {
                  if (!isDragging) return;
                  setCropOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
              />
            </div>

            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => setCropZoom((z) => Math.max(0.5, z - 0.1))}
                className="p-2 rounded-xl border border-surface-border"
              >
                <ZoomOut size={16} className="text-ink-muted" />
              </button>
              <input
                type="range" min="0.5" max="3" step="0.05"
                value={cropZoom}
                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                className="w-32 accent-brand"
              />
              <button
                onClick={() => setCropZoom((z) => Math.min(3, z + 0.1))}
                className="p-2 rounded-xl border border-surface-border"
              >
                <ZoomIn size={16} className="text-ink-muted" />
              </button>
              <button
                onClick={() => { setCropZoom(1); setCropOffset({ x: 0, y: 0 }); }}
                className="p-2 rounded-xl border border-surface-border"
              >
                <RotateCcw size={16} className="text-ink-muted" />
              </button>
            </div>

            <div className="flex gap-2">
              <Button full variant="outline" onClick={() => setCropOpen(false)}>
                {t('profile.cropCancel') || 'Batal'}
              </Button>
              <Button full loading={uploadAvatar.isPending} onClick={confirmCrop}>
                {t('profile.usePhoto') || 'Gunakan Foto Ini'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
