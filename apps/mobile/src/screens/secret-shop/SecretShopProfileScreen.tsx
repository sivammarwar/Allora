import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";

export default function SecretShopProfileScreen() {
  const { user, logout } = useAuth();

  const { data: me } = useQuery<any>({
    queryKey: ["secret-shop-me"],
    queryFn: () => api.get("/api/secret-shop/me") as any,
    enabled: !!user,
  });

  const { data: history = [] } = useQuery<any[]>({
    queryKey: ["secret-shop-payment-history"],
    queryFn: () => api.get("/api/secret-shop/payment-history") as any,
    enabled: me?.state === "verified",
  });

  const handleLogout = () =>
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);

  const profile = me?.profile;

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{(profile?.shopName ?? user?.name ?? "S")[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.shopName}>{profile?.shopName ?? "My Shop"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {profile?.isVerifiedByAgent && (
          <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Verified Shop</Text></View>
        )}
      </View>

      <View style={styles.menu}>
        {[
          { icon: "📦", label: "My Orders" },
          { icon: "💳", label: "Payment History" },
          { icon: "❓", label: "Support" },
        ].map(({ icon, label }) => (
          <TouchableOpacity key={label} style={styles.menuRow}>
            <Text style={styles.menuIcon}>{icon}</Text>
            <Text style={styles.menuLabel}>{label}</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {history.length > 0 && (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Payment History</Text>
          {history.slice(0, 10).map((h: any) => (
            <View key={h.id} style={styles.historyRow}>
              <View>
                <Text style={styles.historyId}>#{h.orderId?.slice(-8).toUpperCase()}</Text>
                <Text style={styles.historyDate}>{new Date(h.createdAt).toLocaleDateString("en-IN")}</Text>
              </View>
              <Text style={[styles.historyAmt, { color: h.status === "SUCCESS" ? "#16a34a" : "#dc2626" }]}>
                {h.status === "SUCCESS" ? "+" : ""}₹{Number(h.amount).toFixed(0)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  header: { alignItems: "center", padding: 32, backgroundColor: "#fff" },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#10b981", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarInitial: { color: "#fff", fontSize: 32, fontWeight: "800" },
  shopName: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 4 },
  email: { fontSize: 13, color: BRAND_MUTED, marginBottom: 10 },
  verifiedBadge: { backgroundColor: "#dcfce7", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  verifiedText: { fontSize: 11, color: "#15803d", fontWeight: "700" },
  menu: { margin: 16, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" },
  menuRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6" },
  menuIcon: { fontSize: 18, marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 14, color: "#111", fontWeight: "500" },
  menuChevron: { fontSize: 20, color: BRAND_MUTED },
  historyCard: { backgroundColor: "#fff", borderRadius: 16, margin: 16, padding: 16 },
  historyTitle: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 12 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6" },
  historyId: { fontSize: 12, fontWeight: "700", color: "#111" },
  historyDate: { fontSize: 11, color: BRAND_MUTED },
  historyAmt: { fontSize: 14, fontWeight: "800" },
  logoutBtn: { marginHorizontal: 16, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: "#ef4444", alignItems: "center", justifyContent: "center" },
  logoutText: { color: "#ef4444", fontSize: 15, fontWeight: "700" },
});
