"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  MapPin,
  Loader2,
  X,
  CheckCircle2,
  ChevronDown,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { useSubmitReport } from "@/hooks/useReports";
import { useLangStore } from "@/store/lang.store";
import { Map } from "@/components/ui/Map";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { useSubmitStore } from "@/store/submit.store"; // Pastikan path store sesuai
import { useUnsavedWarning } from "@/hooks/useUnsavedWarning"; // Pastikan path hook sesuai
import api from "@/lib/axios";

interface Category {
  id: number;
  name: string;
  price_per_kg: number;
  unit: string;
}

const HOUR_SLOTS = Array.from({ length: 11 }, (_, i) => {
  const h = i + 7;
  return {
    value: h,
    label: `${h.toString().padStart(2, "0")}:00 ${h < 12 ? "AM" : "PM"}`,
  };
});

// get today's date
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function SubmitPage() {
  const router = useRouter();
  const { t } = useLangStore();
  const { toasts, show: showToast, remove } = useToast();
  const submitReport = useSubmitReport();
  const fileRef = useRef<HTMLInputElement>(null);
  const { geocode, loading: geocodeLoading } = useReverseGeocode();
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  const { setDirty, clearDirty } = useSubmitStore();

  const [form, setForm] = useState({
    category_id: "",
    estimated_weight: "",
    address_text: "",
    notes: "",
    pickup_date: "",
    pickup_hour: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isFormDirty =
    !!form.category_id ||
    !!form.estimated_weight ||
    !!form.address_text ||
    !!form.notes ||
    !!form.pickup_date ||
    !!form.pickup_hour ||
    photos.length > 0;

  useEffect(() => {
    setDirty(isFormDirty);
  }, [isFormDirty, setDirty]);

  useEffect(() => {
    return () => clearDirty();
  }, [clearDirty]);

  useUnsavedWarning(isFormDirty);

  const handleResetForm = () => {
    setSubmitted(false);
    setForm({
      category_id: "",
      estimated_weight: "",
      address_text: "",
      notes: "",
      pickup_date: "",
      pickup_hour: "",
    });
    setPhotos([]);
    setPreviews([]);
    setCoords(null);
    setErrors({});
    clearDirty();
  };

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      (await api.get("/api/categories")).data.data as Category[],
  });

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - photos.length;
    const toAdd = files.slice(0, remaining);
    setPhotos((prev) => [...prev, ...toAdd]);
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        setPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  function detectGPS() {
    if (!navigator.geolocation) {
      showToast("GPS not supported on this device", "error");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setErrors((prev) => ({ ...prev, location: "" }));
        setGpsLoading(false);
        showToast("Location detected!", "success");

        // auto-fill address
        const address = await geocode(lat, lng);
        if (address) {
          setForm((prev) => ({ ...prev, address_text: address }));
        }
      },
      () => {
        setGpsLoading(false);
        showToast(
          "Could not detect location. Enter address manually.",
          "error",
        );
      },
      { timeout: 10000 },
    );
  }

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!form.category_id) newErrors.category_id = "Please select a category";
    if (!form.estimated_weight || parseFloat(form.estimated_weight) <= 0)
      newErrors.estimated_weight = "Please enter a valid weight";
    if (!coords && !form.address_text.trim())
      newErrors.location = "Please detect GPS or enter address";
    if (!form.pickup_date)
      newErrors.pickup_date = "Please select a pickup date";
    if (!form.pickup_hour)
      newErrors.pickup_hour = "Please select a pickup time";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    const fd = new FormData();
    fd.append("category_id", form.category_id);
    fd.append("estimated_weight", form.estimated_weight);
    fd.append("pickup_date", form.pickup_date);
    fd.append("pickup_hour", form.pickup_hour);
    if (form.address_text) fd.append("address_text", form.address_text);
    if (form.notes) fd.append("notes", form.notes);
    if (coords) {
      fd.append("latitude", String(coords.lat));
      fd.append("longitude", String(coords.lng));
    }
    photos.forEach((photo) => fd.append("photos", photo));

    try {
      await submitReport.mutateAsync(fd);
      setSubmitted(true);
    } catch (err: any) {
      showToast(err.response?.data?.message || t("common.error"), "error");
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-brand-50 border-2 border-brand-100 flex items-center justify-center mb-5">
          <CheckCircle2 size={36} className="text-brand" />
        </div>
        <h2 className="font-display font-bold text-2xl text-ink text-center mb-2">
          Report Submitted!
        </h2>
        <p className="text-ink-muted text-center text-sm mb-8">
          {t("submit.success")} Our team will validate it soon.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button full onClick={() => router.push("/history")}>
            View My Reports
          </Button>
          <Button
            full
            variant="outline"
            onClick={() => {
              setSubmitted(false);
              setForm({
                category_id: "",
                estimated_weight: "",
                address_text: "",
                notes: "",
                pickup_date: "",
                pickup_hour: "",
              });
              setPhotos([]);
              setPreviews([]);
              setCoords(null);
              setErrors({});
            }}
          >
            Submit Another
          </Button>
        </div>
      </div>
    );
  }

  const selectedCat = categories.find((c) => String(c.id) === form.category_id);

  // error message below field
  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? (
      <p className="text-xs text-red-500 mt-1">{errors[field]}</p>
    ) : null;

  // required asterisk
  const Req = () => <span className="text-red-400 ml-0.5">*</span>;

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

      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display font-bold text-2xl text-ink">
          {t("submit.title")}
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Fill in required fields <span className="text-red-400">*</span>
        </p>
      </div>

      <div className="px-4 space-y-4 mt-2">
        <div
          className={`card p-4 ${errors.category_id ? "border-red-200" : ""}`}
        >
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
            {t("submit.category")} <Req />
          </label>
          <div className="relative">
            <select
              value={form.category_id}
              onChange={(e) => {
                setForm({ ...form, category_id: e.target.value });
                setErrors((prev) => ({ ...prev, category_id: "" }));
              }}
              className={`input appearance-none pr-10 ${errors.category_id ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — Rp {c.price_per_kg.toLocaleString("id-ID")}/
                  {c.unit}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
            />
          </div>
          <FieldError field="category_id" />

          {selectedCat && (
            <div className="mt-3 bg-brand-50 rounded-xl px-3 py-2">
              <span className="text-xs text-brand-600 font-medium">
                Earn Rp {selectedCat.price_per_kg.toLocaleString("id-ID")} per{" "}
                {selectedCat.unit}
              </span>
            </div>
          )}
        </div>

        <div
          className={`card p-4 ${errors.estimated_weight ? "border-red-200" : ""}`}
        >
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
            {t("submit.weight")} <Req />
          </label>
          <div className="relative">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={form.estimated_weight}
              onChange={(e) => {
                setForm({ ...form, estimated_weight: e.target.value });
                setErrors((prev) => ({ ...prev, estimated_weight: "" }));
              }}
              placeholder="e.g. 5.5"
              className={`input pr-12 ${errors.estimated_weight ? "border-red-300" : ""}`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-faint font-medium">
              kg
            </span>
          </div>
          <FieldError field="estimated_weight" />

          {selectedCat &&
            form.estimated_weight &&
            parseFloat(form.estimated_weight) > 0 && (
              <div className="mt-3 bg-brand-50 rounded-xl px-3 py-2.5 space-y-1">
                {(() => {
                  const w = parseFloat(form.estimated_weight);
                  const gross = Math.round(w * selectedCat.price_per_kg);
                  const fee = w <= 15 ? 2500 : w <= 30 ? 5000 : 7500;
                  const net = Math.max(0, gross - fee);
                  return (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-ink-muted">Est. gross</span>
                        <span className="font-mono text-ink">
                          {gross.toLocaleString("id-ID")} pts
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-ink-muted">Handling fee</span>
                        <span className="font-mono text-ink-muted">
                          -{fee.toLocaleString("id-ID")} pts
                        </span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-brand-100 pt-1">
                        <span className="text-brand-600 font-semibold">
                          Est. net
                        </span>
                        <span className="font-mono text-brand-600 font-bold">
                          {net.toLocaleString("id-ID")} pts
                        </span>
                      </div>
                      <p className="text-[10px] text-ink-faint">
                        *Based on admin-verified weight
                      </p>
                    </>
                  );
                })()}
              </div>
            )}
        </div>

        <div
          className={`card p-4 space-y-3 ${errors.location ? "border-red-200" : ""}`}
        >
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide">
            {t("submit.location")} <Req />
          </label>

          {/* Detect GPS button */}
          <button
            onClick={detectGPS}
            disabled={gpsLoading}
            className={`
      w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
      border text-sm font-medium transition-all
      ${
        coords
          ? "border-brand/30 bg-brand-50 text-brand-600"
          : "border-surface-border bg-surface-muted text-ink-muted hover:border-brand hover:text-brand"
      }
    `}
          >
            {gpsLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <MapPin size={16} />
            )}
            {coords
              ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
              : t("submit.detectGps")}
          </button>

          <div>
            <p className="text-xs text-ink-faint mb-1.5 flex items-center gap-1">
              <MapPin size={11} />
              Or tap the map to pin your location · drag marker to adjust
            </p>
            <Map
              lat={coords?.lat ?? null}
              lng={coords?.lng ?? null}
              onChange={async (lat, lng) => {
                setCoords({ lat, lng });
                setErrors((prev) => ({ ...prev, location: "" }));

                const address = await geocode(lat, lng);
                if (address) {
                  setForm((prev) => ({ ...prev, address_text: address }));
                }
              }}
            />
          </div>

          <div className="relative">
            <input
              type="text"
              value={form.address_text}
              onChange={(e) => {
                setForm({ ...form, address_text: e.target.value });
                if (coords) setErrors((prev) => ({ ...prev, location: "" }));
              }}
              placeholder={
                geocodeLoading
                  ? "Detecting address…"
                  : `${t("submit.address")} (auto-filled from map)`
              }
              className={`input ${geocodeLoading ? "text-ink-faint" : ""}`}
              readOnly={geocodeLoading}
            />
            {geocodeLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 size={14} className="animate-spin text-brand" />
              </div>
            )}
          </div>

          <FieldError field="location" />
        </div>

        <div className="card p-4 space-y-4">
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide">
            Pickup Schedule <Req />
          </label>

          <div>
            <label className="block text-xs text-ink-muted mb-1.5 flex items-center gap-1.5">
              <Calendar size={12} /> Pickup Date
            </label>
            <input
              type="date"
              min={todayStr()}
              value={form.pickup_date}
              onChange={(e) => {
                setForm({ ...form, pickup_date: e.target.value });
                setErrors((prev) => ({ ...prev, pickup_date: "" }));
              }}
              className={`input ${errors.pickup_date ? "border-red-300" : ""}`}
            />
            <FieldError field="pickup_date" />
          </div>

          <div>
            <label className="block text-xs text-ink-muted mb-1.5 flex items-center gap-1.5">
              <Clock size={12} /> Pickup Time
              <span className="text-ink-faint">(07:00 – 17:00)</span>
            </label>
            <input
              type="time"
              min="07:00"
              max="17:00"
              step="900"
              value={form.pickup_hour}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const [h, m] = val.split(":").map(Number);
                  if (h < 7) {
                    setForm({ ...form, pickup_hour: "07:00" });
                    return;
                  }
                  if (h > 17 || (h === 17 && m > 0)) {
                    setForm({ ...form, pickup_hour: "17:00" });
                    return;
                  }
                }
                setForm({ ...form, pickup_hour: val });
                setErrors((prev) => ({ ...prev, pickup_hour: "" }));
              }}
              className={`input font-mono ${errors.pickup_hour ? "border-red-300" : ""}`}
            />
            <FieldError field="pickup_hour" />
          </div>

          {(form.pickup_date || form.pickup_hour) && (
            <div className="bg-brand-50 rounded-xl px-3 py-2.5 space-y-1.5">
              {form.pickup_date && (
                <div className="flex justify-between text-xs">
                  <span className="text-ink-muted flex items-center gap-1.5">
                    <Calendar size={11} /> Date
                  </span>
                  <span className="font-medium text-ink">
                    {new Date(form.pickup_date).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              {form.pickup_hour &&
                (() => {
                  const parts = form.pickup_hour.split(":");
                  const h = parseInt(parts[0], 10);
                  const m = parseInt(parts[1] ?? "0", 10);
                  const period = h < 12 ? "AM" : "PM";
                  const h12 = h % 12 === 0 ? 12 : h % 12;
                  const mm = String(m).padStart(2, "0");

                  return (
                    <div className="mt-2 flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2">
                      <Clock size={13} className="text-brand flex-shrink-0" />
                      <span className="text-sm font-semibold text-brand-600">
                        Pickup at {h12}:{mm} {period}
                      </span>
                    </div>
                  );
                })()}
            </div>
          )}
        </div>

        <div className="card p-4">
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
            {t("submit.photos")}
            <span className="text-ink-faint font-normal ml-1 normal-case">
              (optional, up to 5)
            </span>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handlePhotoChange}
          />
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {previews.map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden bg-surface-muted"
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {photos.length < 5 && (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-surface-border rounded-2xl py-5 flex flex-col items-center gap-2 text-ink-faint hover:border-brand hover:text-brand transition-colors"
            >
              <Camera size={24} />
              <span className="text-xs font-medium">
                {photos.length === 0
                  ? "Tap to add photos"
                  : `Add more (${photos.length}/5)`}
              </span>
            </button>
          )}
        </div>

        <div className="card p-4">
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-3">
            {t("submit.notes")}
            <span className="text-ink-faint font-normal ml-1 normal-case">
              (optional)
            </span>
          </label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any additional information…"
            className="input resize-none"
          />
        </div>

        <Button
          full
          size="xl"
          onClick={() => {
            if (!validate()) {
              showToast("Please fill in all required fields", "error");
              return;
            }
            setConfirmOpen(true);
          }}
        >
          {t("submit.submit")}
        </Button>
      </div>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 animate-slide-up">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-brand-50 border-2 border-brand-100 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-brand" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-display font-bold text-lg text-ink">
                Submit This Report?
              </h3>
              <p className="text-sm text-ink-muted mt-2">
                Once submitted, this report cannot be edited or undone. Our team
                will review and validate it shortly.
              </p>
            </div>
            <div className="bg-surface-muted rounded-2xl p-4 space-y-2 text-sm">
              {categories.find((c) => String(c.id) === form.category_id) && (
                <div className="flex justify-between">
                  <span className="text-ink-muted">Category</span>
                  <span className="font-medium text-ink">
                    {
                      categories.find((c) => String(c.id) === form.category_id)
                        ?.name
                    }
                  </span>
                </div>
              )}
              {form.estimated_weight && (
                <div className="flex justify-between">
                  <span className="text-ink-muted">Est. Weight</span>
                  <span className="font-medium text-ink">
                    {form.estimated_weight} kg
                  </span>
                </div>
              )}
              {form.pickup_date && (
                <div className="flex justify-between">
                  <span className="text-ink-muted">Pickup Date</span>
                  <span className="font-medium text-ink">
                    {new Date(form.pickup_date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                </div>
              )}
              {form.pickup_hour && (
                <div className="flex justify-between">
                  <span className="text-ink-muted">Pickup Time</span>
                  <span className="font-medium text-ink">
                    {(() => {
                      const [h, m] = form.pickup_hour.split(":").map(Number);
                      const h12 = h % 12 === 0 ? 12 : h % 12;
                      return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
                    })()}
                  </span>
                </div>
              )}
              {photos.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink-muted">Photos</span>
                  <span className="font-medium text-ink">
                    {photos.length} attached
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                full
                variant="outline"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                full
                loading={submitReport.isPending}
                onClick={async () => {
                  setConfirmOpen(false);
                  await handleSubmit();
                }}
              >
                Yes, Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
