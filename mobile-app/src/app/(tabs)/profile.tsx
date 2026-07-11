import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import { useLangStore } from "@/store/lang.store";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

export default function ProfileScreen() {
  const { user, setUser, logout } = useAuthStore();
  const { t, lang, setLang } = useLangStore();
  const { toasts, show, remove } = useToast();
  const router = useRouter();

  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name ?? "",
    phone: user?.phone ?? "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showPw, setShowPw] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await api.get("/api/auth/me")).data.data,
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: (profile as any).full_name ?? "",
        phone: (profile as any).phone ?? "",
      });
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: () =>
      api.patch("/api/auth/profile", {
        full_name: profileForm.full_name || undefined,
        phone: profileForm.phone || undefined,
      }),
    onSuccess: (res) => {
      setUser(res.data.data);
      show("Profile updated!", "success");
    },
    onError: () => show("Failed to update profile", "error"),
  });

  const changePassword = useMutation({
    mutationFn: () => {
      if (passwordForm.new_password !== passwordForm.confirm_password)
        throw new Error("Passwords do not match");
      if (passwordForm.new_password.length < 8)
        throw new Error("Min. 8 characters");
      return api.patch("/api/auth/profile", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
    },
    onSuccess: () => {
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      show("Password changed!", "success");
    },
    onError: (e: any) => show(e.message || "Failed", "error"),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (uri: string) => {
      const fd = new FormData();
      fd.append("avatar", {
        uri,
        name: "avatar.jpg",
        type: "image/jpeg",
      } as any);
      const { data } = await api.post("/api/auth/upload-avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data;
    },
    onSuccess: ({ user: u }) => {
      setUser(u);
      show("Photo updated!", "success");
    },
    onError: () => show("Upload failed", "error"),
  });

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) uploadAvatar.mutate(result.assets[0].uri);
  }

  function handleLogout() {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const avatarUri = user?.avatar_url
    ? user.avatar_url.startsWith("/uploads/")
      ? `${API_URL}${user.avatar_url}`
      : user.avatar_url
    : null;

  const PwField = ({
    label,
    storeKey,
    pwKey,
  }: {
    label: string;
    storeKey: keyof typeof passwordForm;
    pwKey: keyof typeof showPw;
  }) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={passwordForm[storeKey]}
          onChangeText={(v) =>
            setPasswordForm({ ...passwordForm, [storeKey]: v })
          }
          placeholder="••••••••"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showPw[pwKey]}
        />
        <TouchableOpacity
          onPress={() => setShowPw({ ...showPw, [pwKey]: !showPw[pwKey] })}
          style={styles.eyeBtn}
        >
          <Ionicons
            name={showPw[pwKey] ? "eye-off-outline" : "eye-outline"}
            size={18}
            color="#9CA3AF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
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
        <Text style={styles.title}>{t("profile.title")}</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {initials(user?.full_name ?? "WA")}
                </Text>
              </View>
            )}
            <View style={styles.avatarEdit}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarName}>{user?.full_name}</Text>
          <Text style={styles.avatarEmail}>{user?.email}</Text>

          {/* Language toggle */}
          <View style={styles.langRow}>
            {(["en", "id"] as const).map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => setLang(l)}
                style={[styles.langBtn, lang === l && styles.langBtnActive]}
              >
                <Text
                  style={[
                    styles.langBtnText,
                    lang === l && styles.langBtnTextActive,
                  ]}
                >
                  {l.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Personal info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("profile.personalInfo")}</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t("profile.fullName")}</Text>
            <TextInput
              style={styles.input}
              value={profileForm.full_name}
              onChangeText={(v) =>
                setProfileForm({ ...profileForm, full_name: v })
              }
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t("profile.phone")}</Text>
            <TextInput
              style={styles.input}
              value={profileForm.phone}
              onChangeText={(v) => setProfileForm({ ...profileForm, phone: v })}
              keyboardType="phone-pad"
              placeholder="08xxxxxxxxxx"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <Button
            onPress={() => updateProfile.mutate()}
            loading={updateProfile.isPending}
            variant="soft"
            full
          >
            {t("common.save")}
          </Button>
        </View>

        {/* Change password */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("profile.changePassword")}</Text>
          <PwField
            label={t("profile.currentPassword")}
            storeKey="current_password"
            pwKey="current"
          />
          <PwField
            label={t("profile.newPassword")}
            storeKey="new_password"
            pwKey="new"
          />
          <PwField
            label={t("profile.confirmPassword")}
            storeKey="confirm_password"
            pwKey="confirm"
          />
          <Button
            onPress={() => changePassword.mutate()}
            loading={changePassword.isPending}
            variant="soft"
            full
          >
            {t("profile.updatePassword")}
          </Button>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.signOutText}>{t("profile.signOut")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAF8" },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#1a2e1a" },
  avatarSection: { alignItems: "center", gap: 8, paddingVertical: 16 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "#E4EDE3",
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "#ECFDF5",
    borderWidth: 3,
    borderColor: "#E4EDE3",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 28, fontWeight: "800", color: "#73AF6F" },
  avatarEdit: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#73AF6F",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarName: { fontSize: 18, fontWeight: "700", color: "#1a2e1a" },
  avatarEmail: { fontSize: 13, color: "#9CA3AF" },
  langRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  langBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E4EDE3",
  },
  langBtnActive: { backgroundColor: "#73AF6F", borderColor: "#73AF6F" },
  langBtnText: { fontSize: 12, fontWeight: "700", color: "#9CA3AF" },
  langBtnTextActive: { color: "#fff" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1a2e1a" },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4a6b49",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  passwordRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyeBtn: {
    padding: 12,
    backgroundColor: "#F8FAF8",
    borderWidth: 1,
    borderColor: "#E4EDE3",
    borderRadius: 12,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  signOutText: { fontSize: 14, fontWeight: "700", color: "#DC2626" },
});
