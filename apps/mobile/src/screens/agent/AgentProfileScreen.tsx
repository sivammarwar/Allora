import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../../auth/AuthContext";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import type { AgentStackParams } from "../../navigation/types";

type NavProp = NativeStackNavigationProp<AgentStackParams>;

export default function AgentProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NavProp>();

  const handleLogout = () =>
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);

  const menuItems = [
    { icon: "🗺️", label: "Service Areas",    onPress: () => navigation.navigate("AgentAreas") },
    { icon: "🦸", label: "My Heroes",         onPress: () => navigation.navigate("AgentHeroes") },
    { icon: "📋", label: "Booking History",    onPress: () => navigation.navigate("AgentBookingHistory") },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{(user?.name ?? user?.email ?? "A")[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name ?? "Agent"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>REGIONAL OFFICER</Text></View>
      </View>

      <View style={styles.menu}>
        {menuItems.map(({ icon, label, onPress }) => (
          <TouchableOpacity key={label} style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
            <Text style={styles.menuIcon}>{icon}</Text>
            <Text style={styles.menuLabel}>{label}</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  header: { alignItems: "center", paddingTop: 36, paddingBottom: 28, backgroundColor: "#fff" },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: BRAND_PRIMARY, alignItems: "center",
    justifyContent: "center", marginBottom: 14,
  },
  avatarInitial: { color: "#fff", fontSize: 36, fontWeight: "800" },
  name: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 4 },
  email: { fontSize: 13, color: BRAND_MUTED, marginBottom: 10 },
  badge: {
    paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: "#eff6ff", borderRadius: 20, borderWidth: 1, borderColor: "#bfdbfe",
  },
  badgeText: { fontSize: 11, color: "#2563eb", fontWeight: "700" },
  menu: { marginTop: 16, marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 16 },
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
