"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MapPin,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { PhotoGallery } from "@/components/reports/PhotoGallery";
import { ReportMap } from "@/components/reports/ReportMap";
import { CommentSection } from "@/components/reports/CommentSection";
import { useReport, useValidateReport } from "@/hooks/useReports";
import api from "@/lib/axios";
import { useQueryClient } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const reportId = parseInt(id, 10);

  const { data: report, isLoading } = useReport(reportId);
  const validate = useValidateReport();
  const { toasts, show: showToast, remove: removeToast } = useToast();

  const [modal, setModal] = useState<"approve" | "reject" | "delete" | null>(
    null,
  );
  const [actualWeight, setActualWeight] = useState("");
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleValidate() {
    if (modal === "approve" && !actualWeight) return;
    try {
      await validate.mutateAsync({
        id: reportId,
        action: modal === "approve" ? "approve" : "reject",
        actual_weight:
          modal === "approve" ? parseFloat(actualWeight) : undefined,
        rejection_reason: modal === "reject" ? reason : undefined,
      });
      showToast(
        modal === "approve" ? "Report approved!" : "Report rejected.",
        modal === "approve" ? "success" : "error",
      );
      setModal(null);
      router.push("/reports");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Action failed", "error");
    }
  }

  async function handleSoftDelete() {
    setDeleting(true);
    try {
      await api.patch(`/api/reports/${reportId}/soft-delete`);
      qc.invalidateQueries({ queryKey: ["reports"] });
      showToast("Report deleted", "success");
      setTimeout(() => router.push("/reports"), 1000);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to delete", "error");
    } finally {
      setDeleting(false);
      setModal(null);
    }
  }

  // Resolve photo array
  const photos: string[] = report?.photo_url
    ? typeof report.photo_url === "string"
      ? JSON.parse(report.photo_url)
      : report.photo_url
    : report?.photo_url
      ? [report.photo_url]
      : [];

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <TopBar heading="Report Detail" />
        <div className="px-6 py-6 max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!report) return null;

  const isPending = report.status === "pending";

  const Field = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div>
      <p className="text-[10px] font-medium text-ink-faint uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-sm text-ink">{value ?? "—"}</p>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <TopBar heading="Report Detail" />

      {/* Toasts */}
      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onClose={() => removeToast(t.id)}
        />
      ))}

      {/* ── Centered layout ──────────────────────────────────────────────── */}
      <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="flex items-center gap-2">
            <Badge status={report.status} />
            <Button
              variant="danger"
              size="sm"
              onClick={() => setModal("delete")}
            >
              <Trash2 size={13} /> Delete
            </Button>
            {isPending && (
              <>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setModal("reject")}
                >
                  <XCircle size={13} /> Reject
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setModal("approve")}
                >
                  <CheckCircle2 size={13} /> Approve
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Two column layout ─────────────────────────────────────────── */}
        <div className="grid md:grid-cols-5 gap-6">
          {/* LEFT col — report info + comments (3/5 width) */}
          <div className="md:col-span-3 space-y-6">
            {/* Report info card */}
            <div className="bg-surface-raised border border-surface-border rounded-2xl p-6 space-y-5">
              <h3 className="font-display text-base text-ink border-b border-surface-border pb-3">
                Report #{report.id}
              </h3>

              <div className="grid grid-cols-2 gap-5">
                <Field label="Warga" value={report.warga_name} />
                <Field label="Phone" value={report.warga_phone} />
                <Field label="Category" value={report.category_name} />
                <Field
                  label="Price/kg"
                  value={`Rp ${report.price_per_kg_snapshot?.toLocaleString("id-ID")}`}
                />
                <Field
                  label="Est. Weight"
                  value={`${report.estimated_weight} kg`}
                />
                <Field
                  label="Actual Weight"
                  value={
                    report.actual_weight ? `${report.actual_weight} kg` : "—"
                  }
                />
              </div>

              {/* Points breakdown */}
              {report.gross_points != null && (
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-surface-border">
                  {[
                    {
                      label: "Gross",
                      value: report.gross_points,
                      color: "text-ink",
                    },
                    {
                      label: "Fee",
                      value: report.handling_fee,
                      color: "text-amber-400",
                    },
                    {
                      label: "Net Pts",
                      value: report.net_points,
                      color: "text-brand-300",
                    },
                  ].map((p) => (
                    <div
                      key={p.label}
                      className="bg-surface rounded-xl p-3 border border-surface-border"
                    >
                      <p className="text-[10px] text-ink-faint uppercase tracking-widest mb-1">
                        {p.label}
                      </p>
                      <p className={`font-mono font-medium text-sm ${p.color}`}>
                        {p.value?.toLocaleString("id-ID")}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {report.notes && (
                <div className="pt-2 border-t border-surface-border">
                  <p className="text-[10px] text-ink-faint uppercase tracking-widest mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-ink-muted">{report.notes}</p>
                </div>
              )}

              {/* Rejection reason */}
              {report.rejection_reason && (
                <div className="pt-2 border-t border-surface-border">
                  <p className="text-[10px] text-ink-faint uppercase tracking-widest mb-1">
                    Rejection Reason
                  </p>
                  <p className="text-xs text-red-400">
                    {report.rejection_reason}
                  </p>
                </div>
              )}
            </div>

            {/* Comments — in left column */}
            <CommentSection reportId={reportId} />
          </div>

          {/* RIGHT col — photo + map + meta (2/5 width) */}
          <div className="md:col-span-2 space-y-4">
            {/* Photo gallery */}
            <div className="bg-surface-raised border border-surface-border rounded-2xl p-4">
              <p className="text-[10px] text-ink-faint uppercase tracking-widest mb-3">
                Photos ({photos.length})
              </p>
              <PhotoGallery photos={photos} />
            </div>

            {/* Map */}
            {report.latitude && report.longitude && (
              <div className="bg-surface-raised border border-surface-border rounded-2xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <MapPin size={12} className="text-brand" />
                  <p className="text-[10px] text-ink-faint uppercase tracking-widest">
                    Location
                  </p>
                </div>
                <ReportMap
                  lat={parseFloat(String(report.latitude))}
                  lng={parseFloat(String(report.longitude))}
                  address={report.address_text}
                />
                <p className="text-[10px] text-ink-faint font-mono mt-4">
                  {report.latitude}, {report.longitude}
                </p>
              </div>
            )}

            <div className="bg-surface-raised border border-surface-border rounded-2xl p-4 space-y-3">
              {/* <p className="text-[10px] text-ink-faint uppercase tracking-widest">
                Timeline
              </p> */}
              <Field
                label="Submitted"
                value={new Date(report.created_at).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
              {report.validated_at && (
                <Field
                  label="Validated"
                  value={new Date(report.validated_at).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                />
              )}
              {report.validated_by && (
                <Field label="Validated by" value={report.validated_by} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* approve modal */}
      <Modal
        open={modal === "approve"}
        onClose={() => {
          if (validate.isPending) return; // block close during submit
          setModal(null);
        }}
        title="Approve Report"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Enter the actual confirmed weight to calculate net points.
          </p>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">
              Actual Weight (kg)
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              disabled={validate.isPending}
              value={actualWeight}
              onChange={(e) => setActualWeight(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20"
            />
          </div>

          {actualWeight && (
            <div className="bg-surface p-3 rounded-lg border border-surface-border text-xs space-y-1 font-mono">
              {(() => {
                const w = parseFloat(actualWeight) || 0;
                const snap = report.price_per_kg_snapshot;
                const gross = Math.round(w * snap);
                const fee = w <= 15 ? 2500 : w <= 30 ? 5000 : 7500;
                const net = Math.max(0, gross - fee);
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Gross</span>
                      <span className="text-ink">
                        {gross.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Fee</span>
                      <span className="text-amber-400">
                        -{fee.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-surface-border pt-1 mt-1">
                      <span className="text-ink-muted">Net</span>
                      <span className="text-brand-300 font-medium">
                        {net.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={validate.isPending}
              onClick={handleValidate}
            >
              Confirm Approval
            </Button>
          </div>
        </div>
      </Modal>

      {/* reject modal */}
      <Modal
        open={modal === "reject"}
        onClose={() => {
          if (validate.isPending) return; // block close during submit
          setModal(null);
        }}
        title="Reject Report"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Provide a reason for rejection (optional).
          </p>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Photo quality insufficient…"
            className="w-full px-3.5 py-2.5 bg-surface border border-surface-border rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={validate.isPending}
              onClick={handleValidate}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Modal ──────────────────────────────────────────────────── */}
      <Modal
        open={modal === "delete"}
        onClose={() => setModal(null)}
        title="Delete Report"
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex-shrink-0">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">
                Delete Report #{report.id}?
              </p>
              <p className="text-sm text-ink-muted mt-1">
                This report will be{" "}
                <span className="text-red-400 font-medium">soft-deleted</span>{" "}
                and hidden from all views. The data is preserved in the
                database.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleSoftDelete}
            >
              <Trash2 size={13} /> Yes, Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
