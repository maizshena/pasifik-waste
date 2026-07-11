import { useEffect }        from 'react';
import { Tabs }             from 'expo-router';
import { useRouter }        from 'expo-router';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons }         from '@expo/vector-icons';
import { useAuthStore }     from '@/store/auth.store';
import { useLangStore }     from '@/store/lang.store';
import { useNotifications } from '@/hooks/useNotifications';

function HistoryIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Ionicons
      name={focused ? 'list' : 'list-outline'}
      size={22}
      color={color}
    />
  );
}

function SubmitTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[
      submitStyles.pill,
      focused && submitStyles.pillActive,
    ]}>
      <Ionicons name="add" size={26} color="#fff" />
    </View>
  );
}

const submitStyles = StyleSheet.create({
  pill: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#73AF6F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 10 : 6,
    shadowColor: '#73AF6F',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  pillActive: {
    backgroundColor: '#5a9456',
  },
});

export default function TabsLayout() {
  const { user, accessToken, hydrated } = useAuthStore();
  const { t }   = useLangStore();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  // Auth guard — only fire after hydration
  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken || !user || user.role !== 'warga') {
      router.replace('/(auth)/login');
    }
  }, [hydrated, accessToken, user]);

  if (!hydrated || !accessToken || !user) return null;

  // Safe bottom padding: respect system navigation bar
  const tabBarHeight = 60 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   '#73AF6F',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor:  '#ffffff',
          borderTopColor:   '#E4EDE3',
          borderTopWidth:   1,
          height:           tabBarHeight,
          paddingBottom:    insets.bottom + 4,
          paddingTop:       8,
          // Ensure it sits above Android gesture bar
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: '600',
          marginTop:  2,
        },
      }}
    >
      {/* Tab order: Home — History — Submit — Wallet — Profile */}

      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: t('nav.history'),
          tabBarIcon: ({ color, focused }) => (
            <HistoryIcon color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="submit"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <SubmitTabIcon focused={focused} />
          ),
          tabBarLabel: () => (
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#73AF6F', marginTop: -2 }}>
              {t('nav.submit')}
            </Text>
          ),
        }}
      />

      <Tabs.Screen
        name="wallet"
        options={{
          title: t('nav.wallet'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'wallet' : 'wallet-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}