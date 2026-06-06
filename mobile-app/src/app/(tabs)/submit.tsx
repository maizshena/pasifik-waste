import { useState, useRef }   from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Modal,
  Alert, Platform, ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Image }              from 'expo-image';
import { useQuery }           from '@tanstack/react-query';
import * as ImagePicker       from 'expo-image-picker';
import * as Location          from 'expo-location';
import { Ionicons }           from '@expo/vector-icons';
import { useSubmitReport }    from '@/hooks/useReports';
import { useLangStore }       from '@/store/lang.store';
import { useToast }           from '@/hooks/useToast';
import { Toast }              from '@/components/ui/Toast';
import { Button }             from '@/components/ui/Button';
import api                    from '@/lib/axios';

interface Category {
  id:           number;
  name:         string;
  price_per_kg: number;
  unit:         string;
  is_active:    boolean | number;
}

const HOUR_OPTIONS = Array.from({ length: 21 }, (_, i) => {
  const totalMinutes = 7 * 60 + i * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 17) return null;
  const h12    = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? 'AM' : 'PM';
  const value  = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const label  = `${h12}:${String(m).padStart(2, '0')} ${period}`;
  return { value, label };
}).filter(Boolean) as { value: string; label: string }[];

export default function SubmitScreen() {
  const { t }           = useLangStore();
  const submitReport    = useSubmitReport();
  const { toasts, show, remove } = useToast();

  const [form, setForm] = useState({
    category_id:      '',
    estimated_weight: '',
    address_text:     '',
    notes:            '',
    pickup_date:      '',
    pickup_hour:      '',
  });

  const [photos,       setPhotos]       = useState<{ uri: string; name: string; type: string }[]>([]);
  const [coords,       setCoords]       = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading,   setGpsLoading]   = useState(false);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [catOpen,      setCatOpen]      = useState(false);
  const [hourOpen,     setHourOpen]     = useState(false);
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn:  async () =>
      (await api.get('/api/categories')).data.data as Category[],
  });

  const categories = allCategories.filter(
    (c) => c.is_active === true || (c.is_active as any) === 1
  );

  const selectedCat = categories.find((c) => String(c.id) === form.category_id);

  async function pickPhotos() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:         ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit:     5 - photos.length,
      quality:            0.8,
    });
    if (!result.canceled) {
      const newPhotos = result.assets.map((a) => ({
        uri:  a.uri,
        name: a.fileName || `photo_${Date.now()}.jpg`,
        type: a.mimeType || 'image/jpeg',
      }));
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      const a = result.assets[0];
      setPhotos((prev) => [
        ...prev,
        { uri: a.uri, name: a.fileName || `photo_${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' },
      ].slice(0, 5));
    }
  }

  async function detectGPS() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location access is required.');
      return;
    }
    setGpsLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat  = loc.coords.latitude;
      const lng  = loc.coords.longitude;
      setCoords({ lat, lng });
      setErrors((prev) => ({ ...prev, location: '' }));

      // Reverse geocode
      const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (address) {
        const parts = [address.street, address.district, address.city, address.region]
          .filter(Boolean);
        setForm((prev) => ({ ...prev, address_text: parts.join(', ') }));
      }

      show('Location detected!', 'success');
    } catch {
      show('Could not detect location', 'error');
    } finally {
      setGpsLoading(false);
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.category_id)                                  e.category_id      = 'Required';
    if (!form.estimated_weight || parseFloat(form.estimated_weight) <= 0) e.estimated_weight = 'Required';
    if (!coords && !form.address_text.trim())               e.location         = 'Required';
    if (!form.pickup_date)                                  e.pickup_date      = 'Required';
    if (!form.pickup_hour)                                  e.pickup_hour      = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    setConfirmOpen(false);

    const fd = new FormData();
    fd.append('category_id',      form.category_id);
    fd.append('estimated_weight', form.estimated_weight);
    fd.append('pickup_date',      form.pickup_date);
    fd.append('pickup_hour',      form.pickup_hour);
    if (form.address_text) fd.append('address_text', form.address_text);
    if (form.notes)        fd.append('notes',        form.notes);
    if (coords) {
      fd.append('latitude',  String(coords.lat));
      fd.append('longitude', String(coords.lng));
    }
    photos.forEach((p, i) => {
      fd.append('photos', { uri: p.uri, name: p.name, type: p.type } as any);
    });

    try {
      await submitReport.mutateAsync(fd);
      setSubmitted(true);
    } catch (e: any) {
      show(e.response?.data?.message || t('common.error'), 'error');
    }
  }

  function resetForm() {
    setForm({ category_id: '', estimated_weight: '', address_text: '', notes: '', pickup_date: '', pickup_hour: '' });
    setPhotos([]); setCoords(null); setErrors({}); setSubmitted(false);
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <View style={styles.successRoot}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color="#73AF6F" />
        </View>
        <Text style={styles.successTitle}>{t('submit.success')}</Text>
        <Text style={styles.successSub}>Our team will validate it soon.</Text>
        <View style={styles.successActions}>
          <Button onPress={() => {}} full size="lg">View My Reports</Button>
          <Button onPress={resetForm} variant="outline" full size="lg">Submit Another</Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
      ))}

      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>{t('submit.title')}</Text>
        <Text style={styles.pageSubtitle}>Fields marked * are required</Text>

        {/* ── Category ─────────────────────────────────────────────────── */}
        <View style={[styles.card, errors.category_id && styles.cardError]}>
          <Text style={styles.fieldLabel}>{t('submit.category')} *</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setCatOpen(true)}
          >
            <Text style={selectedCat ? styles.pickerValue : styles.pickerPlaceholder}>
              {selectedCat ? selectedCat.name : t('submit.selectCategory')}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          {errors.category_id && <Text style={styles.errorText}>{errors.category_id}</Text>}

          {selectedCat && (
            <View style={styles.pointPreviewSmall}>
              <Text style={styles.pointPreviewText}>
                Earn Rp {selectedCat.price_per_kg.toLocaleString('id-ID')} / {selectedCat.unit}
              </Text>
            </View>
          )}
        </View>

        {/* ── Weight ───────────────────────────────────────────────────── */}
        <View style={[styles.card, errors.estimated_weight && styles.cardError]}>
          <Text style={styles.fieldLabel}>{t('submit.weight')} *</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={form.estimated_weight}
              onChangeText={(v) => {
                setForm({ ...form, estimated_weight: v });
                setErrors((prev) => ({ ...prev, estimated_weight: '' }));
              }}
              placeholder="e.g. 5.5"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputUnit}>kg</Text>
          </View>
          {errors.estimated_weight && <Text style={styles.errorText}>{errors.estimated_weight}</Text>}

          {/* Point preview */}
          {selectedCat && form.estimated_weight && parseFloat(form.estimated_weight) > 0 && (() => {
            const w     = parseFloat(form.estimated_weight);
            const gross = Math.round(w * selectedCat.price_per_kg);
            const fee   = w <= 15 ? 2500 : w <= 30 ? 5000 : 7500;
            const net   = Math.max(0, gross - fee);
            return (
              <View style={styles.pointBreakdown}>
                {[
                  { label: 'Est. Gross', value: gross, color: '#1a2e1a' },
                  { label: 'Fee',        value: fee,   color: '#D97706'  },
                  { label: 'Est. Net',   value: net,   color: '#059669'  },
                ].map((p) => (
                  <View key={p.label} style={styles.pointBreakdownItem}>
                    <Text style={styles.pointBreakdownLabel}>{p.label}</Text>
                    <Text style={[styles.pointBreakdownValue, { color: p.color }]}>
                      {p.value.toLocaleString('id-ID')}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })()}
        </View>

        {/* ── Location ─────────────────────────────────────────────────── */}
        <View style={[styles.card, errors.location && styles.cardError]}>
          <Text style={styles.fieldLabel}>{t('submit.location')} *</Text>
          <TouchableOpacity
            style={[styles.gpsBtn, coords && styles.gpsBtnActive]}
            onPress={detectGPS}
            disabled={gpsLoading}
          >
            {gpsLoading
              ? <ActivityIndicator size="small" color="#73AF6F" />
              : <Ionicons name="location-outline" size={18} color={coords ? '#73AF6F' : '#9CA3AF'} />
            }
            <Text style={[styles.gpsBtnText, coords && { color: '#73AF6F' }]}>
              {coords
                ? `📍 ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : t('submit.detectGps')
              }
            </Text>
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={form.address_text}
            onChangeText={(v) => {
              setForm({ ...form, address_text: v });
              if (coords || v.trim()) setErrors((prev) => ({ ...prev, location: '' }));
            }}
            placeholder={t('submit.address')}
            placeholderTextColor="#9CA3AF"
            multiline
          />
          {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
        </View>

        {/* ── Pickup schedule ───────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{t('submit.pickupSchedule')} *</Text>

          {/* Date input */}
          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={16} color="#4a6b49" />
            <Text style={styles.scheduleFieldLabel}>{t('submit.pickupDate')}</Text>
          </View>
          <TextInput
            style={[styles.input, errors.pickup_date && styles.inputError]}
            value={form.pickup_date}
            onChangeText={(v) => {
              setForm({ ...form, pickup_date: v });
              setErrors((prev) => ({ ...prev, pickup_date: '' }));
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
          {errors.pickup_date && <Text style={styles.errorText}>{errors.pickup_date}</Text>}

          {/* Time picker */}
          <View style={[styles.scheduleRow, { marginTop: 12 }]}>
            <Ionicons name="time-outline" size={16} color="#4a6b49" />
            <Text style={styles.scheduleFieldLabel}>
              {t('submit.pickupTime')} (07:00 – 17:00)
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.picker, errors.pickup_hour && styles.pickerError]}
            onPress={() => setHourOpen(true)}
          >
            <Text style={form.pickup_hour ? styles.pickerValue : styles.pickerPlaceholder}>
              {form.pickup_hour
                ? HOUR_OPTIONS.find((h) => h.value === form.pickup_hour)?.label || form.pickup_hour
                : 'Select time…'
              }
            </Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          {errors.pickup_hour && <Text style={styles.errorText}>{errors.pickup_hour}</Text>}

          {/* Summary */}
          {(form.pickup_date || form.pickup_hour) && (
            <View style={styles.pointBreakdown}>
              {form.pickup_date && (
                <View style={styles.pointBreakdownItem}>
                  <Text style={styles.pointBreakdownLabel}>Date</Text>
                  <Text style={[styles.pointBreakdownValue, { color: '#1a2e1a' }]}>
                    {new Date(form.pickup_date).toLocaleDateString('id-ID', {
                      weekday: 'short', day: 'numeric', month: 'long',
                    })}
                  </Text>
                </View>
              )}
              {form.pickup_hour && (
                <View style={styles.pointBreakdownItem}>
                  <Text style={styles.pointBreakdownLabel}>Time</Text>
                  <Text style={[styles.pointBreakdownValue, { color: '#059669' }]}>
                    {HOUR_OPTIONS.find((h) => h.value === form.pickup_hour)?.label}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Photos (optional) ─────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>
            {t('submit.photos')}{' '}
            <Text style={styles.optional}>(optional, up to 5)</Text>
          </Text>

          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
              {photos.map((p, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri: p.uri }} style={styles.photoImg} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
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
            {t('submit.notes')}{' '}
            <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={form.notes}
            onChangeText={(v) => setForm({ ...form, notes: v })}
            placeholder={t('submit.notesPlaceholder') || 'Any additional information…'}
            placeholderTextColor="#9CA3AF"
            multiline
          />
        </View>

        <Button
          onPress={() => {
            if (!validate()) { show('Please fill in all required fields', 'error'); return; }
            setConfirmOpen(true);
          }}
          full
          size="xl"
          style={{ margin: 16, marginTop: 4 }}
        >
          {t('submit.submit')}
        </Button>
      </ScrollView>

      {/* ── Category picker modal ──────────────────────────────────────── */}
      <Modal visible={catOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('submit.category')}</Text>
            <TouchableOpacity onPress={() => setCatOpen(false)}>
              <Ionicons name="close" size={24} color="#1a2e1a" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.modalOption,
                  String(c.id) === form.category_id && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setForm({ ...form, category_id: String(c.id) });
                  setErrors((prev) => ({ ...prev, category_id: '' }));
                  setCatOpen(false);
                }}
              >
                <View>
                  <Text style={[
                    styles.modalOptionText,
                    String(c.id) === form.category_id && { color: '#73AF6F' },
                  ]}>
                    {c.name}
                  </Text>
                  <Text style={styles.modalOptionSub}>
                    Rp {c.price_per_kg.toLocaleString('id-ID')} / {c.unit}
                  </Text>
                </View>
                {String(c.id) === form.category_id && (
                  <Ionicons name="checkmark-circle" size={20} color="#73AF6F" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Hour picker modal ──────────────────────────────────────────── */}
      <Modal visible={hourOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('submit.pickupTime')}</Text>
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
                  setErrors((prev) => ({ ...prev, pickup_hour: '' }));
                  setHourOpen(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  h.value === form.pickup_hour && { color: '#73AF6F' },
                ]}>
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
              <Ionicons name="checkmark-circle-outline" size={40} color="#73AF6F" />
            </View>
            <Text style={styles.confirmTitle}>{t('submit.confirmTitle')}</Text>
            <Text style={styles.confirmBody}>{t('submit.confirmBody')}</Text>

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
                  <Text style={styles.confirmVal}>{form.estimated_weight} kg</Text>
                </View>
              )}
              {form.pickup_date && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmKey}>Pickup Date</Text>
                  <Text style={styles.confirmVal}>
                    {new Date(form.pickup_date).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long',
                    })}
                  </Text>
                </View>
              )}
              {form.pickup_hour && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmKey}>Pickup Time</Text>
                  <Text style={styles.confirmVal}>
                    {HOUR_OPTIONS.find((h) => h.value === form.pickup_hour)?.label}
                  </Text>
                </View>
              )}
              {photos.length > 0 && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmKey}>Photos</Text>
                  <Text style={styles.confirmVal}>{photos.length} attached</Text>
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
                {t('submit.confirmYes')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: '#F8FAF8' },
  content:            { padding: 16, paddingBottom: 32 },
  pageTitle:          { fontSize: 24, fontWeight: '800', color: '#1a2e1a', marginBottom: 4 },
  pageSubtitle:       { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },
  card:               { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardError:          { borderWidth: 1, borderColor: '#FECACA' },
  fieldLabel:         { fontSize: 12, fontWeight: '700', color: '#4a6b49', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  optional:           { fontSize: 11, fontWeight: '400', color: '#9CA3AF', textTransform: 'none' },
  input:              { backgroundColor: '#F8FAF8', borderWidth: 1, borderColor: '#E4EDE3', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a2e1a' },
  inputError:         { borderColor: '#FECACA' },
  inputRow:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputUnit:          { fontSize: 14, fontWeight: '600', color: '#9CA3AF', width: 28 },
  errorText:          { fontSize: 11, color: '#DC2626', marginTop: 4 },
  picker:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAF8', borderWidth: 1, borderColor: '#E4EDE3', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  pickerError:        { borderColor: '#FECACA' },
  pickerValue:        { fontSize: 14, color: '#1a2e1a', fontWeight: '500' },
  pickerPlaceholder:  { fontSize: 14, color: '#9CA3AF' },
  pointPreviewSmall:  { marginTop: 8, backgroundColor: '#ECFDF5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  pointPreviewText:   { fontSize: 12, color: '#059669', fontWeight: '600' },
  pointBreakdown:     { marginTop: 10, backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, gap: 6 },
  pointBreakdownItem: { flexDirection: 'row', justifyContent: 'space-between' },
  pointBreakdownLabel:{ fontSize: 12, color: '#4a6b49' },
  pointBreakdownValue:{ fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  gpsBtn:             { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAF8', borderWidth: 1, borderColor: '#E4EDE3', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  gpsBtnActive:       { borderColor: '#73AF6F', backgroundColor: '#ECFDF5' },
  gpsBtnText:         { fontSize: 13, color: '#9CA3AF', flex: 1 },
  scheduleRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  scheduleFieldLabel: { fontSize: 12, color: '#4a6b49', fontWeight: '600' },
  photoRow:           { flexDirection: 'row', marginBottom: 10 },
  photoThumb:         { width: 80, height: 80, borderRadius: 12, marginRight: 8, position: 'relative' },
  photoImg:           { width: 80, height: 80, borderRadius: 12 },
  photoRemove:        { position: 'absolute', top: -6, right: -6 },
  photoActions:       { flexDirection: 'row', gap: 10 },
  photoBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ECFDF5', borderRadius: 12, paddingVertical: 14, borderWidth: 1.5, borderColor: '#73AF6F', borderStyle: 'dashed' },
  photoBtnText:       { fontSize: 13, color: '#73AF6F', fontWeight: '600' },
  successRoot:        { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon:        { marginBottom: 16 },
  successTitle:       { fontSize: 24, fontWeight: '800', color: '#1a2e1a', textAlign: 'center', marginBottom: 8 },
  successSub:         { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 32 },
  successActions:     { width: '100%', gap: 12 },
  modalRoot:          { flex: 1, backgroundColor: '#fff' },
  modalHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E4EDE3' },
  modalTitle:         { fontSize: 18, fontWeight: '700', color: '#1a2e1a' },
  modalOption:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F7EF' },
  modalOptionActive:  { backgroundColor: '#ECFDF5' },
  modalOptionText:    { fontSize: 15, fontWeight: '600', color: '#1a2e1a' },
  modalOptionSub:     { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  confirmOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  confirmCard:        { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 12 },
  confirmIcon:        { alignItems: 'center' },
  confirmTitle:       { fontSize: 20, fontWeight: '800', color: '#1a2e1a', textAlign: 'center' },
  confirmBody:        { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  confirmSummary:     { backgroundColor: '#F8FAF8', borderRadius: 16, padding: 14, gap: 8 },
  confirmRow:         { flexDirection: 'row', justifyContent: 'space-between' },
  confirmKey:         { fontSize: 13, color: '#9CA3AF' },
  confirmVal:         { fontSize: 13, fontWeight: '600', color: '#1a2e1a' },
  confirmActions:     { flexDirection: 'row', gap: 12, marginTop: 4 },
});