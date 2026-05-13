import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ScrollView, Alert,
} from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);
  };

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
        {[
          { icon: "📋", label: "My Bookings", onPress: () => {} },
          { icon: "⭐", label: "My Reviews", onPress: () => {} },
          { icon: "📍", label: "Saved Addresses", onPress: () => {} },
          { icon: "💳", label: "Payment Methods", onPress: () => {} },
          { icon: "🔔", label: "Notifications", onPress: () => {} },
          { icon: "❓", label: "Help & Support", onPress: () => {} },
          { icon: "📄", label: "Privacy Policy", onPress: () => {} },
        ].map(({ icon, label, onPress }) => (
          <TouchableOpacity key={label} style={styles.menuRow} onPress={onPress}>
            <Text style={styles.menuIcon}>{icon}</Text>
            <Text style={styles.menuLabel}>{label}</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Allora v1.0.0</Text>
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
});
