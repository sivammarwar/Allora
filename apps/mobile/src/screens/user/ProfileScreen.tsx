import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ScrollView, Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../../auth/AuthContext";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";
import type { UserStackParams } from "../../navigation/types";

type NavProp = NativeStackNavigationProp<UserStackParams>;

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NavProp>();
  const { t } = useLanguage();

  const handleLogout = () => {
    Alert.alert(t("profile.logout"), "Are you sure?", [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("profile.logout"), style: "destructive", onPress: logout },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestAvatarPlaceholder}>
          <Text style={styles.guestAvatarIcon}>👤</Text>
        </View>
        <Text style={styles.guestTitle}>{t("profile.guestTitle")}</Text>
        <Text style={styles.guestSub}>{t("profile.guestSub")}</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate("GuestLogin", { role: "USER" })}>
          <Text style={styles.loginBtnText}>{t("profile.signIn")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const menuItems = [
    { icon: "📋", label: t("profile.myBookings"),     onPress: () => navigation.navigate("UserTabs", undefined as any) },
    { icon: "⭐", label: t("profile.myReviews"),      onPress: () => navigation.navigate("MyReviews") },
    { icon: "📍", label: t("profile.savedAddresses"), onPress: () => navigation.navigate("SavedAddresses") },
    { icon: "💳", label: t("profile.paymentMethods"), onPress: () => navigation.navigate("PaymentMethods") },
    { icon: "🔔", label: t("profile.notifications"),  onPress: () => navigation.navigate("Notifications") },
    { icon: "❓", label: t("profile.helpSupport"),    onPress: () => navigation.navigate("HelpSupport") },
  ];

  const companyItems = [
    { icon: "🏢", label: t("profile.aboutUs"),       onPress: () => navigation.navigate("About") },
    { icon: "⚙️", label: t("profile.howItWorks"),     onPress: () => navigation.navigate("HowItWorks") },
    { icon: "📞", label: t("profile.contactUs"),      onPress: () => navigation.navigate("Contact") },
  ];

  const legalItems = [
    { icon: "📄", label: t("profile.privacyPolicy"),  onPress: () => navigation.navigate("PrivacyPolicy") },
    { icon: "📋", label: t("profile.termsOfService"), onPress: () => navigation.navigate("Terms") },
    { icon: "💰", label: t("profile.refundPolicy"),   onPress: () => navigation.navigate("RefundPolicy") },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{user?.name ?? "No name set"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>

      {/* Menu items */}
      <View style={styles.menu}>
        {menuItems.map(({ icon, label, onPress }) => (
          <TouchableOpacity key={label} style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>{icon}</Text>
            <Text style={styles.menuLabel}>{label}</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Company */}
      <Text style={styles.sectionLabel}>{t("profile.companySection")}</Text>
      <View style={styles.menu}>
        {companyItems.map(({ icon, label, onPress }) => (
          <TouchableOpacity key={label} style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>{icon}</Text>
            <Text style={styles.menuLabel}>{label}</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Legal */}
      <Text style={styles.sectionLabel}>{t("profile.legalSection")}</Text>
      <View style={styles.menu}>
        {legalItems.map(({ icon, label, onPress }) => (
          <TouchableOpacity key={label} style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>{icon}</Text>
            <Text style={styles.menuLabel}>{label}</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t("profile.logout")}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>{t("profile.version")}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  content: { paddingBottom: 60 },
  avatarSection: { alignItems: "center", paddingTop: 36, paddingBottom: 28, backgroundColor: "#fff" },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 14 },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: BRAND_PRIMARY,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  avatarInitial: { color: "#fff", fontSize: 36, fontWeight: "800" },
  name: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 4 },
  email: { fontSize: 13, color: BRAND_MUTED, marginBottom: 10 },
  roleBadge: {
    paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: "#fff5f7", borderRadius: 20,
    borderWidth: 1, borderColor: "#fecdd3",
  },
  roleText: { fontSize: 11, color: BRAND_PRIMARY, fontWeight: "700" },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: BRAND_MUTED, textTransform: "uppercase", letterSpacing: 1, marginTop: 20, marginBottom: 4, marginHorizontal: 20 },
  menu: { marginTop: 16, backgroundColor: "#fff", borderRadius: 16, marginHorizontal: 16 },
  menuRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6",
  },
  menuIcon: { fontSize: 18, marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 14, color: "#111", fontWeight: "500" },
  menuChevron: { fontSize: 20, color: BRAND_MUTED },
  logoutBtn: {
    marginTop: 20, marginHorizontal: 16, height: 50,
    borderRadius: 14, borderWidth: 1.5, borderColor: "#ef4444",
    alignItems: "center", justifyContent: "center",
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },
  version: { textAlign: "center", color: BRAND_MUTED, fontSize: 11, marginTop: 20 },
  guestContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#f9fafb" },
  guestAvatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  guestAvatarIcon: { fontSize: 38 },
  guestTitle: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 8 },
  guestSub: { fontSize: 14, color: BRAND_MUTED, textAlign: "center", marginBottom: 28, lineHeight: 20 },
  loginBtn: {
    height: 50, paddingHorizontal: 36, borderRadius: 14,
    backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center",
  },
  loginBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
