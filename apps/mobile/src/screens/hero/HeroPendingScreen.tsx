import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface Props {
  onRefresh: () => void;
}

export default function HeroPendingScreen({ onRefresh }: Props) {
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>⏳</Text>
      </View>

      <Text style={styles.h1}>Verification pending</Text>
      <Text style={styles.sub}>
        Your registration has been submitted. A regional officer will review and verify your profile shortly.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>What happens next?</Text>
        <Text style={styles.infoItem}>• An agent in your area will review your details</Text>
        <Text style={styles.infoItem}>• You'll be notified once verified</Text>
        <Text style={styles.infoItem}>• After verification, complete your onboarding payment</Text>
        <Text style={styles.infoItem}>• Then start receiving bookings!</Text>
      </View>

      <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.8}>
        <Text style={styles.refreshText}>Check status</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 28, justifyContent: "center" },
  iconWrap: {
    alignSelf: "center", width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  icon: { fontSize: 36 },
  h1: { fontSize: 24, fontWeight: "800", color: "#111", textAlign: "center", marginBottom: 8 },
  sub: { fontSize: 14, color: BRAND_MUTED, textAlign: "center", lineHeight: 21, marginBottom: 28 },
  infoBox: {
    backgroundColor: "#f9fafb", borderRadius: 14, padding: 16, marginBottom: 28,
    borderWidth: 1, borderColor: "#f3f4f6",
  },
  infoTitle: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 10 },
  infoItem: { fontSize: 13, color: "#6b7280", lineHeight: 22 },
  refreshBtn: {
    height: 50, borderRadius: 14, backgroundColor: BRAND_PRIMARY,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  refreshText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  logoutBtn: {
    height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#ef4444",
    alignItems: "center", justifyContent: "center",
  },
  logoutText: { color: "#ef4444", fontSize: 15, fontWeight: "700" },
});
