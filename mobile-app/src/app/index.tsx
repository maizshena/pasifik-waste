import { Redirect }     from 'expo-router';
import { useAuthStore } from '@/store/auth.store';

export default function Index() {
  const { user, accessToken, hydrated } = useAuthStore();

  if (accessToken && user?.role === 'warga') {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/(auth)/login" />;
}