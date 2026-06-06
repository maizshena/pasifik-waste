import { useState }     from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter }    from 'expo-router';
import { Ionicons }     from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth.store';
import { Button }       from '@/components/ui/Button';
import { Toast }        from '@/components/ui/Toast';
import { useToast }     from '@/hooks/useToast';
import api              from '@/lib/axios';

export default function RegisterScreen() {
  const router  = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { toasts, show, remove } = useToast();

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '',
  });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!form.full_name || !form.email || !form.password) {
      show('Name, email and password are required', 'error');
      return;
    }
    if (form.password.length < 8) {
      show('Password must be at least 8 characters', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', form);
      const { user, accessToken, refreshToken } = data.data;
      await setAuth(user, accessToken, refreshToken);
      router.replace('/(tabs)');
    } catch (e: any) {
      show(e.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
      ))}

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <Ionicons name="leaf" size={32} color="#fff" />
          </View>
          <Text style={styles.appName}>Pasifik</Text>
          <Text style={styles.tagline}>Join the community</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={16} color="#4a6b49" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.cardTitle}>Create account</Text>

          {[
            { label: 'Full Name', key: 'full_name', placeholder: 'Your full name',  keyboard: 'default'        as const },
            { label: 'Email',     key: 'email',     placeholder: 'you@example.com', keyboard: 'email-address'  as const },
            { label: 'Phone',     key: 'phone',     placeholder: '08xxxxxxxxxx',    keyboard: 'phone-pad'      as const },
          ].map((f) => (
            <View key={f.key} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                value={(form as any)[f.key]}
                onChangeText={(v) => setForm({ ...form, [f.key]: v })}
                placeholder={f.placeholder}
                placeholderTextColor="#9CA3AF"
                keyboardType={f.keyboard}
                autoCapitalize="none"
              />
            </View>
          ))}

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={form.password}
                onChangeText={(v) => setForm({ ...form, password: v })}
                placeholder="Min. 8 characters"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPw}
              />
              <TouchableOpacity
                onPress={() => setShowPw(!showPw)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          <Button onPress={handleRegister} loading={loading} full size="lg">
            Create Account
          </Button>

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={styles.switchRow}
          >
            <Text style={styles.switchText}>
              Already have an account?{' '}
              <Text style={styles.switchLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F0F7EF' },
  scroll:      { flexGrow: 1, justifyContent: 'center', padding: 24 },
  hero:        { alignItems: 'center', marginBottom: 32 },
  logoBox:     { width: 72, height: 72, borderRadius: 20, backgroundColor: '#73AF6F', alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#73AF6F', shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  appName:     { fontSize: 28, fontWeight: '700', color: '#1a2e1a' },
  tagline:     { fontSize: 13, color: '#4a6b49', marginTop: 4 },
  card:        { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 },
  cardTitle:   { fontSize: 20, fontWeight: '700', color: '#1a2e1a', marginBottom: 20 },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText:    { fontSize: 13, color: '#4a6b49' },
  field:       { marginBottom: 16 },
  label:       { fontSize: 12, fontWeight: '600', color: '#4a6b49', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:       { backgroundColor: '#F8FAF8', borderWidth: 1, borderColor: '#E4EDE3', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a2e1a' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn:      { padding: 12, backgroundColor: '#F8FAF8', borderWidth: 1, borderColor: '#E4EDE3', borderRadius: 12 },
  switchRow:   { marginTop: 16, alignItems: 'center' },
  switchText:  { fontSize: 13, color: '#4a6b49' },
  switchLink:  { color: '#73AF6F', fontWeight: '700' },
});