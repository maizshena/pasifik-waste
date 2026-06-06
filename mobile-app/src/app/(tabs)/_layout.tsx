import { useNotifications } from "@/hooks/useNotifications";
import { useAuthStore } from "@/store/auth.store";
import { useLangStore } from "@/store/lang.store";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

const { user, accessToken, hydrated } = useAuthStore();
const router = useRouter();

useEffect(() => {
  if (!hydrated) return; // wait until SecureStore is read
  if (!accessToken || !user || user.role !== "warga") {
    router.replace("/(auth)/login");
  }
}, [hydrated, accessToken, user]);

function TabIcon({
  name,
  color,
  focused,
}: {
  name: any;
  color: string;
  focused: boolean;
}) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as any)}
      size={22}
      color={color}
    />
  );
}

function NotifTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { data } = useNotifications();
  const unread = data?.unread ?? 0;

  console.log('[DEBUG] rendering root layout');
  console.log('[DEBUG] notifications data:', JSON.stringify(data));
  
  return (
    <View>
      <Ionicons
        name={focused ? "notifications" : "notifications-outline"}
        size={22}
        color={color}
      />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useLangStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#73AF6F",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#E4EDE3",
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.home"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: t("nav.submit"),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.submitActive : styles.submitInactive}>
              <Ionicons
                name="add"
                size={26}
                color={focused ? "#fff" : "#9CA3AF"}
              />
            </View>
          ),
          tabBarLabel: () => (
            <Text style={{ fontSize: 10, fontWeight: "600", color: "#73AF6F" }}>
              {t("nav.submit")}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("nav.history"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="list" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: t("nav.wallet"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="wallet" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("nav.profile"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#73AF6F",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  submitActive: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#73AF6F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: "#73AF6F",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitInactive: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F0F7EF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});
