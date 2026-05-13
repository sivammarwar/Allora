import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";

export default function HeroProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () =>
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>
            {user?.name?.[0]?.toUpperCase() ?? "H"}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name ?? "Hero"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>HERO</Text>
        </View>
      </View>

      <View style={styles.menu}>
        {[
          { icon: "🛠️", label: "My Services" },
          { icon: "📅", label: "My Slots" },
          { icon: "💰", label: "Earnings" },
          { icon: "⭐", label: "My Ratings" },
          { icon: "❓", label: "Support" },
        ].map(({ icon, label }) => (
          <TouchableOpacity key={label} style={styles.menuRow}>
            <Text style={styles.menuIcon}>{icon}</Text>
            <Text style={styles.menuLabel}>{label}</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  header: { alignItems: "center", padding: 32, backgroundColor: "#fff" },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: BRAND_PRIMARY, alignItems: "center",
    justifyContent: "center", marginBottom: 12,
  },
  avatarInitial: { color: "#fff", fontSize: 32, fontWeight: "800" },
  name: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 4 },
  email: { fontSize: 13, color: BRAND_MUTED, marginBottom: 10 },
  roleBadge: {
    paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: "#fff5f7", borderRadius: 20,
    borderWidth: 1, borderColor: "#fecdd3",
  },
  roleText: { fontSize: 11, color: BRAND_PRIMARY, fontWeight: "700" },
  menu: { margin: 16, backgroundColor: "#fff", borderRadius: 16 },
  menuRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6",
  },
  menuIcon: { fontSize: 18, marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 14, color: "#111", fontWeight: "500" },
  menuChevron: { fontSize: 20, color: BRAND_MUTED },
  logoutBtn: {
    marginHorizontal: 16, marginTop: 8, height: 50,
    borderRadius: 14, borderWidth: 1.5, borderColor: "#ef4444",
    alignItems: "center", justifyContent: "center",
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },
});
