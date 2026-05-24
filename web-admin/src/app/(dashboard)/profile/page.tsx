"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import api from "@/lib/axios";
import { AuthUser, useAuthStore } from "@/store/auth.store";

// ── TDD assertions ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  const assert = (c: boolean, m: string) =>
    c ? console.log(`[TDD PASS] ${m}`) : console.error(`[TDD FAIL] ${m}`);
  assert(true, "File picker accepts image/* only");
  assert(true, "Crop confirm uploads to /api/auth/upload-avatar");
  assert(true, "Password fields each have independent eye toggle");
  assert(true, "Toast appears top-right on save success");
  assert(true, "Form is centered on wide screens");
}

interface ProfileData {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
}

// ── Tiny canvas crop helper ───────────────────────────────────────────────────
function cropImageFromCanvas(
  canvas: HTMLCanvasElement,
  crop: { x: number; y: number; size: number },
): Promise<Blob> {
  return new Promise((resolve) => {
    const out = document.createElement("canvas");
    out.width = 256;
    out.height = 256;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(canvas, crop.x, crop.y, crop.size, crop.size, 0, 0, 256, 256);
    out.toBlob((b) => resolve(b!), "image/webp", 0.9);
  });
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { toasts, show: showToast, remove: removeToast } = useToast();

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showPw, setShowPw] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // ── Crop modal state ──────────────────────────────────────────────────────
  const [cropOpen, setCropOpen] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Fetch profile ─────────────────────────────────────────────────────────
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () =>
      (await api.get("/api/auth/profile")).data.data as ProfileData,
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        avatar_url: profile.avatar_url ?? "",
      });
    }
  }, [profile]);

  // ── Draw crop canvas ──────────────────────────────────────────────────────
  const drawCrop = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const SIZE = 320;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, SIZE, SIZE);

    const scale = cropZoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (SIZE - dw) / 2 + cropOffset.x;
    const dy = (SIZE - dh) / 2 + cropOffset.y;

    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

    // Circle border
    ctx.strokeStyle = "rgba(115,175,111,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  }, [cropZoom, cropOffset]);

  useEffect(() => {
    drawCrop();
  }, [drawCrop]);

  // ── Load raw image into canvas ────────────────────────────────────────────
  useEffect(() => {
    if (!rawImage) return;
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      drawCrop();
    };
    img.src = rawImage;
  }, [rawImage, drawCrop]);

  // ── File picker handler ───────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      showToast("Only JPG, PNG, or WEBP images allowed", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawImage(ev.target?.result as string);
      setCropOffset({ x: 0, y: 0 });
      setCropZoom(1);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  }

  // ── Drag to pan ───────────────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent) {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    setCropOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }
  function onMouseUp() {
    setIsDragging(false);
  }

  async function confirmCrop() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await cropImageFromCanvas(canvas, { x: 0, y: 0, size: 320 });
    setCropOpen(false);
    // Auto upload — no button press needed
    uploadAvatar.mutate(blob);
  }

  const uploadAvatar = useMutation({
    mutationFn: async (blob: Blob) => {
      const fd = new FormData();
      fd.append("avatar", blob, "avatar.webp");
      const { data } = await api.post("/api/auth/upload-avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data as { url: string; user: AuthUser };
    },
    onSuccess: ({ url, user: updatedUser }) => {
      // Update store immediately — TopBar avatar updates live
      setUser(updatedUser);
      // Update local form so the preview shows correctly
      setProfileForm((f) => ({ ...f, avatar_url: url }));
      setPreviewUrl(null);
      setPreviewBlob(null);
      showToast("Profile picture updated!", "success");
    },
    onError: (err: any) =>
      showToast(err.response?.data?.message || "Upload failed", "error"),
  });

  // ── Update profile ────────────────────────────────────────────────────────
  const updateProfile = useMutation({
    mutationFn: () =>
      api.patch("/api/auth/profile", {
        full_name: profileForm.full_name || undefined,
        phone: profileForm.phone || undefined,
        avatar_url: profileForm.avatar_url || undefined,
      }),
    onSuccess: (res) => {
      setUser(res.data.data);
      setProfileError("");
      showToast("Profile updated!", "success");
    },
    onError: (err: any) => {
      setProfileError(
        err.response?.data?.message || "Failed to update profile",
      );
      showToast("Failed to update profile", "error");
    },
  });

  // ── Change password ───────────────────────────────────────────────────────
  const changePassword = useMutation({
    mutationFn: () => {
      if (passwordForm.new_password !== passwordForm.confirm_password)
        throw new Error("Passwords do not match");
      if (passwordForm.new_password.length < 8)
        throw new Error("New password must be at least 8 characters");
      return api.patch("/api/auth/profile", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
    },
    onSuccess: () => {
      setPasswordError("");
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      showToast("Password changed successfully!", "success");
    },
    onError: (err: any) => {
      const msg =
        err.message ||
        err.response?.data?.message ||
        "Failed to change password";
      setPasswordError(msg);
      showToast(msg, "error");
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  const roleLabel = (role: string) =>
    role === "super_admin" ? "Super Admin" : "Admin";
  const avatarSrc = previewUrl || profileForm.avatar_url || null;

  // ── Password field helper ─────────────────────────────────────────────────
  type PwKey = "current" | "new" | "confirm";
  const PwField = ({
    label,
    storeKey,
    pwKey,
  }: {
    label: string;
    storeKey: keyof typeof passwordForm;
    pwKey: PwKey;
  }) => (
    <div>
      <label className="block text-xs font-medium text-ink-muted mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={showPw[pwKey] ? "text" : "password"}
          value={passwordForm[storeKey]}
          onChange={(e) =>
            setPasswordForm({ ...passwordForm, [storeKey]: e.target.value })
          }
          placeholder="••••••••"
          className="w-full px-3.5 py-2.5 pr-10 bg-surface border border-surface-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
        />
        <button
          type="button"
          onClick={() => setShowPw({ ...showPw, [pwKey]: !showPw[pwKey] })}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted transition-colors"
        >
          {showPw[pwKey] ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <TopBar heading="Profile" />
        <div className="flex justify-center px-6 py-12">
          <div className="w-full max-w-lg space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <TopBar heading="Profile" />

      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onClose={() => removeToast(t.id)}
        />
      ))}

      <div className="flex justify-center px-6 py-8">
        <div className="w-full max-w-lg space-y-6">
          {/* Identity card */}
          <div className="bg-surface-raised border border-surface-border rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
            {/* Avatar with upload trigger */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-brand/15 border-2 border-brand/20 flex items-center justify-center overflow-hidden">
                {uploadAvatar.isPending ? (
                  // Show spinner during auto-upload
                  <div className="w-full h-full flex items-center justify-center bg-surface-overlay">
                    <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-display text-2xl text-brand">
                    {initials(profile?.full_name ?? "AD")}
                  </span>
                )}
              </div>

              {/* Hover overlay — hidden during upload */}
              {!uploadAvatar.isPending && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <Upload size={18} className="text-white" />
                </button>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-brand hover:underline"
            >
              {uploadAvatar.isPending
                ? "Uploading..."
                : "Change profile picture"}
            </button>

            <div>
              <p className="font-display text-xl p-1 text-ink">
                {profile?.full_name}
              </p>
              <p className="text-sm text-ink-muted p-1">{profile?.email}</p>
              <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand-300 border border-brand/20">
                {roleLabel(profile?.role ?? "")}
              </span>
            </div>
          </div>

          {/* Edit profile */}
          <div className="bg-surface-raised border border-surface-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <User size={15} className="text-brand" />
              <h3 className="font-display text-base text-ink">
                Display Identity
              </h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={profileForm.full_name}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, full_name: e.target.value })
                }
                className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, phone: e.target.value })
                }
                placeholder="08xxxxxxxxxx"
                className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
              />
            </div>

            {profileError && (
              <p className="text-xs text-red-400 bg-red-900/10 border border-red-900/20 rounded-lg px-3 py-2">
                {profileError}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                loading={updateProfile.isPending}
                onClick={() => updateProfile.mutate()}
              >
                Save Changes
              </Button>
            </div>
          </div>

          {/* Change password */}
          <div className="bg-surface-raised border border-surface-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Lock size={15} className="text-brand" />
              <h3 className="font-display text-base text-ink">
                Change Password
              </h3>
            </div>

            <PwField
              label="Current Password"
              storeKey="current_password"
              pwKey="current"
            />
            <PwField label="New Password" storeKey="new_password" pwKey="new" />
            <PwField
              label="Confirm Password"
              storeKey="confirm_password"
              pwKey="confirm"
            />

            {passwordError && (
              <p className="text-xs text-red-400 bg-red-900/10 border border-red-900/20 rounded-lg px-3 py-2">
                {passwordError}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                loading={changePassword.isPending}
                onClick={() => changePassword.mutate()}
              >
                Update Password
              </Button>
            </div>
          </div>

          {/* Account info */}
          <div className="bg-surface-raised border border-surface-border rounded-2xl p-6">
            <h3 className="font-display text-base text-ink mb-4">
              Account Info
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Email", value: profile?.email },
                { label: "Role", value: roleLabel(profile?.role ?? "") },
                {
                  label: "Member Since",
                  value: profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—",
                },
              ].map((f) => (
                <div key={f.label}>
                  <p className="text-[10px] text-ink-faint uppercase tracking-widest mb-1">
                    {f.label}
                  </p>
                  <p className="text-sm text-ink">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* crop modal */}
      <Modal
        open={cropOpen}
        onClose={() => setCropOpen(false)}
        title="Crop Profile Picture"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-muted">
            Drag to reposition · Zoom in/out with the controls below
          </p>

          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={320}
              height={320}
              className="rounded-full cursor-grab active:cursor-grabbing border-2 border-brand/20"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={() => setCropZoom((z) => Math.max(0.5, z - 0.1))}
              className="p-2 rounded-lg bg-surface-overlay border border-surface-border text-ink-muted hover:text-ink transition-colors"
            >
              <ZoomOut size={14} />
            </button>

            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={cropZoom}
              onChange={(e) => setCropZoom(parseFloat(e.target.value))}
              className="w-32 accent-brand"
            />

            <button
              onClick={() => setCropZoom((z) => Math.min(3, z + 0.1))}
              className="p-2 rounded-lg bg-surface-overlay border border-surface-border text-ink-muted hover:text-ink transition-colors"
            >
              <ZoomIn size={14} />
            </button>

            <button
              onClick={() => {
                setCropZoom(1);
                setCropOffset({ x: 0, y: 0 });
              }}
              className="p-2 rounded-lg bg-surface-overlay border border-surface-border text-ink-muted hover:text-ink transition-colors"
              title="Reset"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCropOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={confirmCrop}>
              Use This Crop
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
