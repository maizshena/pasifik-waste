"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Globe, Bell, ChevronDown, User, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useLangStore } from "@/store/lang.store";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
} from "@/hooks/useNotifications";
import { NotifIcon } from "../ui/Notificon";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { lang, setLang, t } = useLangStore();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: notifData } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = notifData?.notifications ?? [];
  const unread = notifData?.unread ?? 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleNotifClick(id: number, link: string | null) {
    markRead.mutate(id);
    setNotifOpen(false);

    if (!link) return;

    // remap any /reports/:id links to /history/:id for warga context
    const userLink = link
      .replace(/^\/reports\/(\d+)$/, "/history/$1")
      .replace(/^\/reports$/, "/history");

    router.push(userLink);
  }
  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const avatarSrc = user?.avatar_url
    ? user.avatar_url.startsWith("/uploads/")
      ? `${API_URL}${user.avatar_url}`
      : user.avatar_url
    : null;

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-surface-border">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
            <Leaf size={14} className="text-white" />
          </div>
          <span className="font-display font-semibold text-ink">Pasifik</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-surface-muted rounded-lg p-0.5 border border-surface-border">
            <Globe size={11} className="text-ink-faint ml-1" />
            {(["en", "id"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  lang === l
                    ? "bg-brand text-white"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
            >
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-surface-border rounded-2xl shadow-modal animate-fade-in overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
                  <span className="text-sm font-semibold text-ink">
                    {unread > 0 ? `${unread} unread` : "Notifications"}
                  </span>
                  {unread > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="text-[11px] text-brand hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell size={20} className="text-ink-faint mx-auto mb-2" />
                      <p className="text-sm text-ink-muted">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n.id, n.link)}
                        className={`
                          w-full text-left px-4 py-3 border-b border-surface-border/50
                          hover:bg-surface-muted transition-colors
                          ${!n.is_read ? "bg-brand-50" : ""}
                        `}
                      >
                        <div className="flex items-start gap-2">
                          <NotifIcon type={n.type} size={13} />
                          <div>
                            <p
                              className={`text-xs font-medium ${!n.is_read ? "text-ink" : "text-ink-muted"}`}
                            >
                              {n.title}
                            </p>
                            <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-2">
                              {n.body}
                            </p>
                            <p className="text-[10px] text-ink-faint mt-1">
                              {new Date(n.created_at).toLocaleString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          {!n.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0 mt-1 ml-auto" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-surface-muted transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-brand/15 border border-brand/20 flex items-center justify-center overflow-hidden">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] font-semibold text-brand">
                    {initials(user?.full_name ?? "WA")}
                  </span>
                )}
              </div>
              <ChevronDown
                size={12}
                className={`text-ink-muted transition-transform ${profileOpen ? "rotate-180" : ""}`}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-surface-border rounded-2xl shadow-modal animate-fade-in overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-surface-border">
                  <p className="text-xs font-semibold text-ink truncate">
                    {user?.full_name}
                  </p>
                  <p className="text-[11px] text-ink-muted truncate">
                    {user?.email}
                  </p>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      router.push("/profile");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
                  >
                    <User size={14} /> {t("nav.profile")}
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      router.replace("/login");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={14} /> {t("common.logout")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
