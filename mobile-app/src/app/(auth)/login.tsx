import { useState }      from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter }     from 'expo-router';
import { Ionicons }      from '@expo/vector-icons';
import { useAuthStore }  from '@/store/auth.store';
import { Toast }         from '@/components/ui/Toast';
import { useToast }      from '@/hooks/useToast';
import api               from '@/lib/axios';

export default function LoginScreen() {
  const router  = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { toasts, show, remove } = useToast();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  async function handleLogin() {
    const emailTrimmed = email.trim().toLowerCase();

    if (!emailTrimmed || !password) {
      show('Email and password are required', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', {
        email:    emailTrimmed,
        password: password,
      });

      const { user, accessToken, refreshToken } = data.data;

      if (user.role !== 'warga') {
        show('This app is for residents only. Please use the Admin Dashboard.', 'error');
        return;
      }

      await setAuth(user, accessToken, refreshToken);
      router.replace('/(tabs)');
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Login failed. Check your credentials.';
      show(msg, 'error');
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
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <Ionicons name="leaf" size={32} color="#fff" />
          </View>
          <Text style={styles.appName}>Pasifik</Text>
          <Text style={styles.tagline}>Sustainable Waste Management</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back 👋</Text>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.pwRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPw}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
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

          {/* Submit */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.submitText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Switch to register */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            style={styles.switchRow}
          >
            <Text style={styles.switchText}>
              Don't have an account?{' '}
              <Text style={styles.switchLink}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#F0F7EF' },
  scroll:          { flexGrow: 1, justifyContent: 'center', padding: 24 },
  hero:            { alignItems: 'center', marginBottom: 32 },
  logoBox:         { width: 72, height: 72, borderRadius: 20, backgroundColor: '#73AF6F', alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#73AF6F', shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  appName:         { fontSize: 28, fontWeight: '800', color: '#1a2e1a' },
  tagline:         { fontSize: 13, color: '#4a6b49', marginTop: 4 },
  card:            { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 },
  cardTitle:       { fontSize: 20, fontWeight: '700', color: '#1a2e1a', marginBottom: 20 },
  field:           { marginBottom: 16 },
  label:           { fontSize: 12, fontWeight: '600', color: '#4a6b49', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:           { backgroundColor: '#F8FAF8', borderWidth: 1, borderColor: '#E4EDE3', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1a2e1a' },
  pwRow:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn:          { padding: 12, backgroundColor: '#F8FAF8', borderWidth: 1, borderColor: '#E4EDE3', borderRadius: 12 },
  submitBtn:       { backgroundColor: '#73AF6F', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8, shadowColor: '#73AF6F', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnDisabled:{ opacity: 0.6 },
  submitText:      { color: '#fff', fontSize: 15, fontWeight: '700' },
  switchRow:       { marginTop: 16, alignItems: 'center' },
  switchText:      { fontSize: 13, color: '#4a6b49' },
  switchLink:      { color: '#73AF6F', fontWeight: '700' },
});