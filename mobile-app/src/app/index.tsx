import { Redirect }    from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/store/auth.store';

export default function Index() {
  const { user, accessToken, hydrated } = useAuthStore();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#73AF6F" />
      </View>
    );
  }

  if (accessToken && user?.role === 'warga') return <Redirect href="/(tabs)" />;
  return <Redirect href="/(auth)/login" />;
}