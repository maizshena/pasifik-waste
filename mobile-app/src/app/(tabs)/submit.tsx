import { Button } from "@/components/ui/Button";
import { MapPicker } from "@/components/ui/MapPicker";
import { Toast } from "@/components/ui/Toast";
import { useSubmitReport } from "@/hooks/useReports";
import { useToast } from "@/hooks/useToast";
import api from "@/lib/axios";
import { useLangStore } from "@/store/lang.store";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Category {
  id: number;
  name: string;
  price_per_kg: number;
  unit: string;
  is_active: boolean | number;
}

const HOUR_OPTIONS = Array.from({ length: 21 }, (_, i) => {
  const totalMinutes = 7 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 17) return null;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? "AM" : "PM";
  const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const label = `${h12}:${String(m).padStart(2, "0")} ${period}`;

  return { value, label };
}).filter(Boolean) as { value: string; label: string }[];

export default function SubmitScreen() {
  const { t } = useLangStore();
  const submitReport = useSubmitReport();
  const { toasts, show, remove } = useToast();

  const [form, setForm] = useState({
    category_id: "",
    estimated_weight: "",
    address_text: "",
    notes: "",
    pickup_date: "",
    pickup_hour: "",
  });

  const [photos, setPhotos] = useState<
    { uri: string; name: string; type: string }[]
  >([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [gpsLoading, setGpsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [hourOpen, setHourOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [pickupTime, setPickupTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const { data: rawCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/api/categories");
      const rows = res.data?.data ?? res.data ?? [];
      return rows as Category[];
    },
  });

  const categories = rawCategories.filter(
    (c) => c.is_active === true || c.is_active === 1,
  );

  const MapView =
    Platform.OS !== "web" ? require("react-native-maps").default : null;
  const Marker =
    Platform.OS !== "web" ? require("react-native-maps").Marker : null;

  const selectedCat = categories.find((c) => String(c.id) === form.category_id);

  async function pickPhotos() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library access is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - photos.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newPhotos = result.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName || `photo_${Date.now()}.jpg`,
        type: a.mimeType || "image/jpeg",
      }));
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      const a = result.assets[0];
      setPhotos((prev) =>
        [
          ...prev,
          {
            uri: a.uri,
            name: a.fileName || `photo_${Date.now()}.jpg`,
            type: a.mimeType || "image/jpeg",
          },
        ].slice(0, 5),
      );
    }
  }

  async function detectGPS() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Location access is required.");
      return;
    }
    setGpsLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setCoords({ lat, lng });
      setErrors((prev) => ({ ...prev, location: "" }));

      const [address] = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (address) {
        const parts = [
          address.street,
          address.district,
          address.city,
          address.region,
        ].filter(Boolean);
        setForm((prev) => ({ ...prev, address_text: parts.join(", ") }));
      }

      show("Location detected!", "success");
    } catch {
      show("Could not detect location", "error");
    } finally {
      setGpsLoading(false);
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.category_id) e.category_id = "Required";
    if (!form.estimated_weight || parseFloat(form.estimated_weight) <= 0)
      e.estimated_weight = "Required";
    if (!coords && !form.address_text.trim()) e.location = "Required";
    if (!pickupDate) e.pickup_date = "Required";
    if (!pickupTime || !form.pickup_hour) e.pickup_hour = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    setConfirmOpen(false);

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
    photos.forEach((p) => {
      (fd as any).append("photos", {
        uri: Platform.OS === "android" ? p.uri : p.uri.replace("file://", ""),
        name: p.name || `photo_${Date.now()}.jpg`,
        type: p.type || "image/jpeg",
      });
    });

    try {
      await submitReport.mutateAsync(fd);
      setSubmitted(true);
    } catch (e: any) {
      show(e.response?.data?.message || t("common.error"), "error");
    }
  }

  function resetForm() {
    setForm({
      category_id: "",
      estimated_weight: "",
      address_text: "",
      notes: "",
      pickup_date: "",
      pickup_hour: "",
    });
    setPhotos([]);
    setCoords(null);
    setErrors({});
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <View style={styles.successRoot}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color="#73AF6F" />
        </View>
        <Text style={styles.successTitle}>{t("submit.success")}</Text>
        <Text style={styles.successSub}>Our team will validate it soon.</Text>
        <View style={styles.successActions}>
          <Button onPress={() => {}} full size="lg">
            View My Reports
          </Button>
          <Button onPress={resetForm} variant="outline" full size="lg">
            Submit Another
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onClose={() => remove(t.id)}
        />
      ))}

      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>{t("submit.title")}</Text>
        <Text style={styles.pageSubtitle}>Fields marked * are required</Text>
        <View style={[styles.card, errors.category_id && styles.cardError]}>
          <Text style={styles.fieldLabel}>{t("submit.category")} *</Text>
          <TouchableOpacity
            style={[styles.picker, errors.category_id && styles.pickerError]}
            onPress={() => setCatOpen(true)}
            activeOpacity={0.8}
          >
            <Text
              style={
                selectedCat ? styles.pickerValue : styles.pickerPlaceholder
              }
              numberOfLines={1}
            >
              {selectedCat
                ? `${selectedCat.name}  —  Rp ${selectedCat.price_per_kg.toLocaleString("id-ID")}/${selectedCat.unit}`
                : t("submit.selectCategory")}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          {errors.category_id && (
            <Text style={styles.errorText}>{errors.category_id}</Text>
          )}

          {selectedCat && (
            <View style={styles.pointPreviewSmall}>
              <Text style={styles.pointPreviewText}>
                Earn Rp {selectedCat.price_per_kg.toLocaleString("id-ID")} /{" "}
                {selectedCat.unit}
              </Text>
            </View>
          )}
        </View>
        {/* ── Weight ───────────────────────────────────────────────────── */}
        <View
          style={[styles.card, errors.estimated_weight && styles.cardError]}
        >
          <Text style={styles.fieldLabel}>{t("submit.weight")} *</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={form.estimated_weight}
              onChangeText={(v) => {
                setForm({ ...form, estimated_weight: v });
                setErrors((prev) => ({ ...prev, estimated_weight: "" }));
              }}
              placeholder="e.g. 5.5"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputUnit}>kg</Text>
          </View>
          {errors.estimated_weight && (
            <Text style={styles.errorText}>{errors.estimated_weight}</Text>
          )}

          {/* Point preview */}
          {selectedCat &&
            form.estimated_weight &&
            parseFloat(form.estimated_weight) > 0 &&
            (() => {
              const w = parseFloat(form.estimated_weight);
              const gross = Math.round(w * selectedCat.price_per_kg);
              const fee = w <= 15 ? 2500 : w <= 30 ? 5000 : 7500;
              const net = Math.max(0, gross - fee);
              return (
                <View style={styles.pointBreakdown}>
                  {[
                    { label: "Est. Gross", value: gross, color: "#1a2e1a" },
                    { label: "Fee", value: fee, color: "#D97706" },
                    { label: "Est. Net", value: net, color: "#059669" },
                  ].map((p) => (
                    <View key={p.label} style={styles.pointBreakdownItem}>
                      <Text style={styles.pointBreakdownLabel}>{p.label}</Text>
                      <Text
                        style={[styles.pointBreakdownValue, { color: p.color }]}
                      >
                        {p.value.toLocaleString("id-ID")}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })()}
        </View>
        {/* ── Location ─────────────────────────────────────────────────── */}
        <View style={[styles.card, errors.location && styles.cardError]}>
          <Text style={styles.fieldLabel}>{t("submit.location")} *</Text>
          <TouchableOpacity
            style={[styles.gpsBtn, coords && styles.gpsBtnActive]}
            onPress={detectGPS}
            disabled={gpsLoading}
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color="#73AF6F" />
            ) : (
              <Ionicons
                name="location-outline"
                size={18}
                color={coords ? "#73AF6F" : "#9CA3AF"}
              />
            )}
            <Text style={[styles.gpsBtnText, coords && { color: "#73AF6F" }]}>
              {coords
                ? `📍 ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : t("submit.detectGps")}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={form.address_text}
            onChangeText={(v) => {
              setForm({ ...form, address_text: v });
              if (coords || v.trim())
                setErrors((prev) => ({ ...prev, location: "" }));
            }}
            placeholder={t("submit.address")}
            placeholderTextColor="#9CA3AF"
            multiline
          />
          {errors.location && (
            <Text style={styles.errorText}>{errors.location}</Text>
          )}
        </View>
        // Replace the pickup schedule card entirely:
        {/* ── Pickup Schedule ───────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Pickup Schedule *</Text>

          {/* Date picker */}
          <Text style={styles.scheduleSubLabel}>📅 Pickup Date</Text>
          <TouchableOpacity
            style={[styles.picker, errors.pickup_date && styles.pickerError]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <Text
              style={pickupDate ? styles.pickerValue : styles.pickerPlaceholder}
            >
              {pickupDate
                ? pickupDate.toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Select pickup date…"}
            </Text>
            <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          {errors.pickup_date && (
            <Text style={styles.errorText}>{errors.pickup_date}</Text>
          )}

          {showDatePicker && (
            <DateTimePicker
              value={pickupDate ?? new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              minimumDate={new Date()}
              onChange={(event, date) => {
                setShowDatePicker(Platform.OS === "ios");
                if (event.type === "set" && date) {
                  setPickupDate(date);
                  const iso = date.toISOString().split("T")[0];
                  setForm({ ...form, pickup_date: iso });
                  setErrors((prev) => ({ ...prev, pickup_date: "" }));
                }
              }}
            />
          )}

          {/* Time picker */}
          <Text style={[styles.scheduleSubLabel, { marginTop: 12 }]}>
            ⏰ Pickup Time (07:00 – 17:00)
          </Text>
          <TouchableOpacity
            style={[styles.picker, errors.pickup_hour && styles.pickerError]}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.8}
          >
            <Text
              style={pickupTime ? styles.pickerValue : styles.pickerPlaceholder}
            >
              {pickupTime
                ? pickupTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })
                : "Select pickup time…"}
            </Text>
            <Ionicons name="time-outline" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          {errors.pickup_hour && (
            <Text style={styles.errorText}>{errors.pickup_hour}</Text>
          )}

          {showTimePicker && (
            <DateTimePicker
              value={
                pickupTime ??
                (() => {
                  const d = new Date();
                  d.setHours(9, 0, 0);
                  return d;
                })()
              }
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minuteInterval={15}
              onChange={(event, date) => {
                setShowTimePicker(Platform.OS === "ios");
                if (event.type === "set" && date) {
                  const h = date.getHours();
                  const m = date.getMinutes();
                  // Clamp to operating hours
                  if (h < 7) {
                    setPickupTime(new Date(date.setHours(7, 0)));
                    return;
                  }
                  if (h > 17 || (h === 17 && m > 0)) {
                    setPickupTime(new Date(date.setHours(17, 0)));
                    return;
                  }
                  setPickupTime(date);
                  const hStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                  setForm({ ...form, pickup_hour: hStr });
                  setErrors((prev) => ({ ...prev, pickup_hour: "" }));
                }
              }}
            />
          )}

          {/* Summary card */}
          {(pickupDate || pickupTime) && (
            <View style={styles.pointBreakdown}>
              {pickupDate && (
                <View style={styles.pointBreakdownItem}>
                  <Text style={styles.pointBreakdownLabel}>Date</Text>
                  <Text
                    style={[styles.pointBreakdownValue, { color: "#1a2e1a" }]}
                  >
                    {pickupDate.toLocaleDateString("id-ID", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                    })}
                  </Text>
                </View>
              )}
              {pickupTime && (
                <View
                  style={[
                    styles.pointBreakdownItem,
                    {
                      borderTopWidth: 1,
                      borderTopColor: "#D1FAE5",
                      paddingTop: 6,
                      marginTop: 4,
                    },
                  ]}
                >
                  <Text style={styles.pointBreakdownLabel}>Time</Text>
                  <Text
                    style={[styles.pointBreakdownValue, { color: "#059669" }]}
                  >
                    {pickupTime.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        {/* ── Map ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{t("submit.location")} *</Text>

          {/* GPS detect */}
          <TouchableOpacity
            style={[styles.gpsBtn, coords && styles.gpsBtnActive]}
            onPress={detectGPS}
            disabled={gpsLoading}
            activeOpacity={0.8}
          >
            {gpsLoading ? (
              <ActivityIndicator size="small" color="#73AF6F" />
            ) : (
              <Ionicons
                name="locate-outline"
                size={18}
                color={coords ? "#73AF6F" : "#9CA3AF"}
              />
            )}
            <Text style={[styles.gpsBtnText, coords && { color: "#73AF6F" }]}>
              {coords
                ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : t("submit.detectGps")}
            </Text>
          </TouchableOpacity>

          {/* Interactive map */}
          <Text style={styles.mapHint}>
            Or tap the map to set location · drag pin to adjust
          </Text>
          {Platform.OS !== "web" &&
            coords &&
            (() => {
              const MapView = require("react-native-maps").default;
              const { Marker } = require("react-native-maps");
              return (
                <MapPicker
                  lat={coords?.lat ?? null}
                  lng={coords?.lng ?? null}
                  onChange={(lat, lng) => {
                    setCoords({ lat, lng });
                    setErrors((prev) => ({ ...prev, location: "" }));
                    Location.reverseGeocodeAsync({
                      latitude: lat,
                      longitude: lng,
                    })
                      .then(([addr]) => {
                        if (addr) {
                          const parts = [
                            addr.street,
                            addr.district,
                            addr.city,
                            addr.region,
                          ].filter(Boolean);
                          setForm((prev) => ({
                            ...prev,
                            address_text: parts.join(", "),
                          }));
                        }
                      })
                      .catch(() => {});
                  }}
                />
              );
            })()}

          {/* Address text fallback */}
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={form.address_text}
            onChangeText={(v) => {
              setForm({ ...form, address_text: v });
              if (coords || v.trim())
                setErrors((prev) => ({ ...prev, location: "" }));
            }}
            placeholder="Address (auto-filled from map)"
            placeholderTextColor="#9CA3AF"
            multiline
          />
          {errors.location && (
            <Text style={styles.errorText}>{errors.location}</Text>
          )}
        </View>
        {/* ── Photos (optional) ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>
            {t("submit.photos")}{" "}
            <Text style={styles.optional}>(optional, up to 5)</Text>
          </Text>

          {photos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoRow}
            >
              {photos.map((p, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image
                    source={{ uri: p.uri }}
                    style={styles.photoImg}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() =>
                      setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {photos.length < 5 && (
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={20} color="#73AF6F" />
                <Text style={styles.photoBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhotos}>
                <Ionicons name="images-outline" size={20} color="#73AF6F" />
                <Text style={styles.photoBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* ── Notes (optional) ──────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>
            {t("submit.notes")} <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            value={form.notes}
            onChangeText={(v) => setForm({ ...form, notes: v })}
            placeholder={
              t("submit.notesPlaceholder") || "Any additional information…"
            }
            placeholderTextColor="#9CA3AF"
            multiline
          />
        </View>
        <Button
          onPress={() => {
            if (!validate()) {
              show("Please fill in all required fields", "error");
              return;
            }
            setConfirmOpen(true);
          }}
          full
          size="xl"
          style={{ margin: 16, marginTop: 4 }}
        >
          {t("submit.submit")}
        </Button>
      </ScrollView>

      <Modal
        visible={catOpen}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("submit.category")}</Text>
            <TouchableOpacity onPress={() => setCatOpen(false)}>
              <Ionicons name="close" size={24} color="#1a2e1a" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {categories.length === 0 ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <Ionicons name="leaf-outline" size={32} color="#9CA3AF" />
                <Text style={{ color: "#9CA3AF", marginTop: 12, fontSize: 13 }}>
                  No active categories available
                </Text>
              </View>
            ) : (
              categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.modalOption,
                    String(c.id) === form.category_id &&
                      styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setForm({ ...form, category_id: String(c.id) });
                    setErrors((prev) => ({ ...prev, category_id: "" }));
                    setCatOpen(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.modalOptionText,
                        String(c.id) === form.category_id && {
                          color: "#73AF6F",
                        },
                      ]}
                    >
                      {c.name}
                    </Text>
                    <Text style={styles.modalOptionSub}>
                      Rp {c.price_per_kg.toLocaleString("id-ID")} / {c.unit}
                    </Text>
                  </View>
                  {String(c.id) === form.category_id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#73AF6F"
                    />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={hourOpen}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("submit.pickupTime")}</Text>
            <TouchableOpacity onPress={() => setHourOpen(false)}>
              <Ionicons name="close" size={24} color="#1a2e1a" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {HOUR_OPTIONS.map((h) => (
              <TouchableOpacity
                key={h.value}
                style={[
                  styles.modalOption,
                  h.value === form.pickup_hour && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setForm({ ...form, pickup_hour: h.value });
                  setErrors((prev) => ({ ...prev, pickup_hour: "" }));
                  setHourOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    h.value === form.pickup_hour && { color: "#73AF6F" },
                  ]}
                >
                  {h.label}
                </Text>
                {h.value === form.pickup_hour && (
                  <Ionicons name="checkmark-circle" size={20} color="#73AF6F" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Confirm modal ─────────────────────────────────────────────── */}
      <Modal visible={confirmOpen} animationType="slide" transparent>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons
                name="checkmark-circle-outline"
                size={40}
                color="#73AF6F"
              />
            </View>
            <Text style={styles.confirmTitle}>{t("submit.confirmTitle")}</Text>
            <Text style={styles.confirmBody}>{t("submit.confirmBody")}</Text>

            {/* Summary */}
            <View style={styles.confirmSummary}>
              {selectedCat && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmKey}>Category</Text>
                  <Text style={styles.confirmVal}>{selectedCat.name}</Text>
                </View>
              )}
              {form.estimated_weight && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmKey}>Est. Weight</Text>
                  <Text style={styles.confirmVal}>
                    {form.estimated_weight} kg
                  </Text>
                </View>
              )}
              {form.pickup_date && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmKey}>Pickup Date</Text>
                  <Text style={styles.confirmVal}>
                    {new Date(form.pickup_date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                    })}
                  </Text>
                </View>
              )}
              {form.pickup_hour && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmKey}>Pickup Time</Text>
                  <Text style={styles.confirmVal}>
                    {
                      HOUR_OPTIONS.find((h) => h.value === form.pickup_hour)
                        ?.label
                    }
                  </Text>
                </View>
              )}
              {photos.length > 0 && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmKey}>Photos</Text>
                  <Text style={styles.confirmVal}>
                    {photos.length} attached
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.confirmActions}>
              <Button
                onPress={() => setConfirmOpen(false)}
                variant="outline"
                full
              >
                Cancel
              </Button>
              <Button
                onPress={handleSubmit}
                loading={submitReport.isPending}
                full
              >
                {t("submit.confirmYes")}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAF8" },
  content: { padding: 16, paddingBottom: 32 },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a2e1a",
    marginBottom: 4,
  },
  pageSubtitle: { fontSize: 12, color: "#9CA3AF", marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardError: { borderWidth: 1, borderColor: "#FECACA" },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4a6b49",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  optional: {
    fontSize: 11,
    fontWeight: "400",
    color: "#9CA3AF",
    textTransform: "none",
  },
  input: {
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: "#E4EDE3",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1a2e1a",
  },
  inputError: { borderColor: "#FECACA" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  inputUnit: { fontSize: 14, fontWeight: "600", color: "#9CA3AF", width: 28 },
  errorText: { fontSize: 11, color: "#DC2626", marginTop: 4 },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: "#E4EDE3",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerError: { borderColor: "#FECACA" },
  pickerValue: { fontSize: 14, color: "#1a2e1a", fontWeight: "500" },
  pickerPlaceholder: { fontSize: 14, color: "#9CA3AF" },
  pointPreviewSmall: {
    marginTop: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pointPreviewText: { fontSize: 12, color: "#059669", fontWeight: "600" },
  pointBreakdown: {
    marginTop: 10,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  pointBreakdownItem: { flexDirection: "row", justifyContent: "space-between" },
  pointBreakdownLabel: { fontSize: 12, color: "#4a6b49" },
  pointBreakdownValue: {
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: "#E4EDE3",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  gpsBtnActive: { borderColor: "#73AF6F", backgroundColor: "#ECFDF5" },
  gpsBtnText: { fontSize: 13, color: "#9CA3AF", flex: 1 },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  scheduleFieldLabel: { fontSize: 12, color: "#4a6b49", fontWeight: "600" },
  photoRow: { flexDirection: "row", marginBottom: 10 },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 8,
    position: "relative",
  },
  photoImg: { width: 80, height: 80, borderRadius: 12 },
  photoRemove: { position: "absolute", top: -6, right: -6 },
  photoActions: { flexDirection: "row", gap: 10 },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "#73AF6F",
    borderStyle: "dashed",
  },
  photoBtnText: { fontSize: 13, color: "#73AF6F", fontWeight: "600" },
  successRoot: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  successIcon: { marginBottom: 16 },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a2e1a",
    textAlign: "center",
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 32,
  },
  successActions: { width: "100%", gap: 12 },
  modalRoot: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E4EDE3",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a2e1a" },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F7EF",
  },
  modalOptionActive: { backgroundColor: "#ECFDF5" },
  modalOptionText: { fontSize: 15, fontWeight: "600", color: "#1a2e1a" },
  modalOptionSub: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  confirmCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 12,
  },
  confirmIcon: { alignItems: "center" },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a2e1a",
    textAlign: "center",
  },
  confirmBody: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
  confirmSummary: {
    backgroundColor: "#F8FAF8",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  confirmRow: { flexDirection: "row", justifyContent: "space-between" },
  confirmKey: { fontSize: 13, color: "#9CA3AF" },
  confirmVal: { fontSize: 13, fontWeight: "600", color: "#1a2e1a" },
  confirmActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  map: { width: "100%", height: 200, borderRadius: 14, marginTop: 8 },
  mapHint: { fontSize: 11, color: "#9CA3AF", marginBottom: 6, marginTop: 10 },
  scheduleSubLabel: {
    fontSize: 12,
    color: "#4a6b49",
    fontWeight: "600",
    marginBottom: 6,
  },
});
