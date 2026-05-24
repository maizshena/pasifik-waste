"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe, ChevronDown, User, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { NotificationBell } from "./NotificationBell";
import { useLangStore } from '@/store/lang.store';


const LANGS = [
  { code: "en", label: "EN" },
  { code: "id", label: "ID" },
];

interface Props {
  heading: string;
}

export function TopBar({ heading }: Props) {
  const { lang, setLang } = useLangStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  

  const avatarSrc = user?.avatar_url
    ? user.avatar_url.startsWith("/uploads/")
      ? `${API_URL}${user.avatar_url}`
      : user.avatar_url
    : null;

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const roleLabel = (role: string) =>
    role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : role;

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-surface-border bg-surface/80 backdrop-blur-md sticky top-0 z-20">
      <h1 className="font-display text-lg text-ink">{heading}</h1>

      <div className="flex items-center gap-3">
        {/* i18n toggle */}
        <div className="flex items-center gap-1 bg-surface-overlay rounded-lg p-0.5 border border-surface-border">
          <Globe size={12} className="text-ink-muted ml-1.5" />
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code as "en" | "id")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                lang === l.code
                  ? "bg-brand text-white"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <NotificationBell />

        <div ref={ref} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-overlay border border-transparent hover:border-surface-border transition-all"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-lg bg-brand/15 border border-brand/20 flex items-center justify-center overflow-hidden">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-medium text-brand">
                  {initials(user?.full_name ?? "AD")}
                </span>
              )}
            </div>

            <div className="text-left hidden sm:block">
              <p className="text-xs font-medium text-ink leading-tight">
                {user?.full_name}
              </p>
              <p className="text-[10px] text-ink-muted leading-tight">
                {roleLabel(user?.role ?? "")}
              </p>
            </div>

            <ChevronDown
              size={12}
              className={`text-ink-muted transition-transform ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-surface-overlay border border-surface-border rounded-xl shadow-modal animate-fade-in overflow-hidden">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-surface-border">
                <p className="text-xs font-medium text-ink truncate">
                  {user?.full_name}
                </p>
                <p className="text-[10px] text-ink-muted truncate">
                  {user?.email}
                </p>
              </div>

              {/* Menu items */}
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    router.push("/profile");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-muted hover:text-ink hover:bg-surface-raised transition-colors"
                >
                  <User size={14} /> Edit Profile
                </button>

                <button
                  onClick={() => {
                    logout();
                    router.replace("/login");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/10 transition-colors"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
