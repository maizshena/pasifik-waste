"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  FileText,
  MessageCircle,
  Send,
  Calendar,
  Clock,
} from "lucide-react";
import { useReport } from "@/hooks/useReports";
import { useComments, useAddComment } from "@/hooks/useComments";
import { useLangStore } from "@/store/lang.store";
import { useAuthStore } from "@/store/auth.store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { relativeTime } from "@/lib/relativeTime";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function toAbsolute(url: string) {
  return url.startsWith("/uploads/") ? `${API_URL}${url}` : url;
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLangStore();
  const { user } = useAuthStore();
  const reportId = parseInt(id, 10);
  const [currentPhoto, setCurrentPhoto] = useState(0);

  const { data: report, isLoading } = useReport(reportId);
  const { data: comments = [], isLoading: commentsLoading } =
    useComments(reportId);
  const addComment = useAddComment(reportId);
  const { toasts, show: showToast, remove } = useToast();

  const [commentBody, setCommentBody] = useState("");

  async function handleAddComment() {
    if (!commentBody.trim()) return;
    try {
      await addComment.mutateAsync(commentBody.trim());
      setCommentBody("");
    } catch {
      showToast("Failed to send comment", "error");
    }
  }

  // Safe photo resolution
  const photos: string[] = (() => {
    if (report?.photo_urls) {
      try {
        const parsed =
          typeof report.photo_urls === "string"
            ? JSON.parse(report.photo_urls)
            : report.photo_urls;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    if (report?.photo_url) return [report.photo_url];
    return [];
  })();

  if (isLoading) {
    return (
      <div className="px-4 py-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!report) return null;

  const Field = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex justify-between items-start py-3 border-b border-surface-border/50 last:border-0">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className="text-sm text-ink font-medium text-right max-w-[60%]">
        {value ?? "—"}
      </span>
    </div>
  );

  return (
    <div className="animate-fade-in pb-4">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onClose={() => remove(t.id)}
        />
      ))}

      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-surface-muted transition-colors"
        >
          <ArrowLeft size={18} className="text-ink-muted" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-xl text-ink truncate">
            {report.category_name}
          </h1>
          <p className="text-xs text-ink-muted">Report #{report.id}</p>
        </div>
        <Badge status={report.status} />
      </div>

      <div className="px-4 space-y-4">
        {photos.length > 0 && (
          <div className="card overflow-hidden">
            {/* Main photo */}
            <img
              src={toAbsolute(photos[currentPhoto ?? 0])}
              alt="Report"
              className="w-full h-48 object-cover"
            />
            {/* All thumbnails when more than 1 */}
            {photos.length > 1 && (
              <div className="flex gap-1.5 p-2 overflow-x-auto">
                {photos.map((p, i) => (
                  <img
                    key={i}
                    src={toAbsolute(p)}
                    alt=""
                    onClick={() => setCurrentPhoto(i)}
                    className={`w-14 h-14 rounded-xl object-cover flex-shrink-0 cursor-pointer
              border-2 transition-all ${
                (currentPhoto ?? 0) === i
                  ? "border-brand"
                  : "border-transparent opacity-70"
              }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="card p-4">
          <Field
            label={t("history.estWeight")}
            value={`${report.estimated_weight} kg`}
          />
          {report.actual_weight && (
            <Field
              label={t("history.actWeight")}
              value={`${report.actual_weight} kg`}
            />
          )}
          {(report as any).pickup_date && (
            <Field
              label="Pickup Date"
              value={
                <span className="flex items-center gap-1 justify-end">
                  <Calendar size={12} className="text-ink-faint" />
                  {new Date((report as any).pickup_date).toLocaleDateString(
                    "id-ID",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    },
                  )}
                </span>
              }
            />
          )}
          {(report as any).pickup_hour && (
            <Field
              label="Pickup Time"
              value={
                <span className="flex items-center gap-1 justify-end">
                  <Clock size={12} className="text-ink-faint" />
                  {(() => {
                    const val = (report as any).pickup_hour as string;
                    // Handles both old integer format and new HH:MM string
                    if (val.includes(":")) {
                      const [h, m] = val.split(":").map(Number);
                      const period = h < 12 ? "AM" : "PM";
                      const h12 = h % 12 === 0 ? 12 : h % 12;
                      return `${h12}:${String(m).padStart(2, "0")} ${period}`;
                    }
                    // Legacy integer fallback
                    const h = parseInt(val, 10);
                    return `${String(h).padStart(2, "0")}:00 ${h < 12 ? "AM" : "PM"}`;
                  })()}
                </span>
              }
            />
          )}
          <Field
            label="Submitted"
            value={new Date(report.created_at).toLocaleDateString("id-ID", {
              dateStyle: "long",
            })}
          />
          {report.validated_at && (
            <Field
              label="Validated"
              value={new Date(report.validated_at).toLocaleDateString("id-ID", {
                dateStyle: "long",
              })}
            />
          )}
        </div>

        {/* Points breakdown */}
        {report.status === "approved" && report.net_points != null && (
          <div className="card p-4 bg-brand-50 border-brand-100">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-3">
              Points Earned
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Gross Points</span>
                <span className="font-mono font-medium text-ink">
                  {report.gross_points?.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Handling Fee</span>
                <span className="font-mono text-ink-muted">
                  -{report.handling_fee?.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-brand-100 pt-2">
                <span className="text-brand-600">Net Points</span>
                <span className="font-mono text-brand-600">
                  +{report.net_points.toLocaleString("id-ID")} pts
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Rejection reason */}
        {report.status === "rejected" && (
          <div className="card p-4 bg-red-50 border-red-100">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">
              Rejection Reason
            </p>
            <p className="text-sm text-red-600">
              {report.rejection_reason ?? "No reason provided"}
            </p>
          </div>
        )}

        {/* Location */}
        {(report.latitude || report.address_text) && (
          <div className="card p-4 flex items-start gap-3">
            <MapPin size={16} className="text-brand flex-shrink-0 mt-0.5" />
            <div>
              {report.address_text && (
                <p className="text-sm text-ink">{report.address_text}</p>
              )}
              {report.latitude && (
                <p className="text-xs text-ink-faint font-mono mt-0.5">
                  {report.latitude}, {report.longitude}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Notes — FileText icon (different from comment icon) */}
        {report.notes && (
          <div className="card p-4 flex items-start gap-3">
            <FileText
              size={16}
              className="text-ink-faint flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
                Notes
              </p>
              <p className="text-sm text-ink-muted">{report.notes}</p>
            </div>
          </div>
        )}

        {/* Comments — MessageCircle icon (distinct from FileText notes) */}
        <div className="card overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-surface-border flex items-center gap-2">
            <MessageCircle size={15} className="text-brand" />
            <h3 className="font-semibold text-ink text-sm">
              Comments with Admin
            </h3>
            <span className="ml-auto text-xs text-ink-muted">
              {(comments as any[]).length} comment
              {(comments as any[]).length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Comment list */}
          <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
            {commentsLoading && (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="skeleton h-12 rounded-xl" />
                ))}
              </div>
            )}

            {!commentsLoading && (comments as any[]).length === 0 && (
              <div className="py-6 text-center">
                <MessageCircle
                  size={20}
                  className="text-ink-faint mx-auto mb-2"
                />
                <p className="text-xs text-ink-muted">No comments yet.</p>
              </div>
            )}

            {!commentsLoading &&
              (comments as any[]).map((c: any) => {
                const isMe = c.author_role === "warga";
                const isAdmin =
                  c.author_role === "admin" || c.author_role === "super_admin";

                return (
                  <div
                    key={c.id}
                    className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`
                    w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold
                    ${
                      isAdmin
                        ? "bg-brand text-white"
                        : "bg-surface-overlay text-ink-muted border border-surface-border"
                    }
                  `}
                    >
                      {isAdmin
                        ? "🛡"
                        : (c.author_name?.[0]?.toUpperCase() ?? "W")}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`
                    max-w-[75%] px-3 py-2 rounded-2xl text-sm
                    ${
                      isMe
                        ? "bg-brand text-white rounded-br-sm"
                        : "bg-surface-overlay text-ink rounded-bl-sm border border-surface-border"
                    }
                  `}
                    >
                      {isAdmin && (
                        <p className="text-[10px] font-semibold text-brand-600 mb-0.5">
                          Admin
                        </p>
                      )}
                      <p className="leading-relaxed">{c.body}</p>
                      <p
                        className={`text-[10px] mt-1 ${isMe ? "text-white/60" : "text-ink-faint"}`}
                      >
                        {new Date(c.created_at).toLocaleString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Input */}
          <div className="px-4 pb-4 border-t border-surface-border pt-3">
            <div className="flex gap-2 items-end">
              <textarea
                rows={2}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="Ask the admin something… (Enter to send)"
                className="flex-1 input resize-none text-sm py-2"
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                loading={addComment.isPending}
                disabled={!commentBody.trim()}
              >
                <Send size={13} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
