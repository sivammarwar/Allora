import React from "react";
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";
import type { AgentStackParams } from "../../navigation/types";

type Nav = NativeStackNavigationProp<AgentStackParams>;

export default function AgentHomeScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigation = useNavigation<Nav>();

  const { data: stats } = useQuery<any>({
    queryKey: ["agent-stats"],
    queryFn: () => api.get("/api/agent/stats") as any,
    enabled: !!user,
  });

  const { data: heroRequests = [], isLoading } = useQuery<any[]>({
    queryKey: ["agent-hero-requests"],
    queryFn: () => api.get("/api/agent/hero-requests?status=PENDING") as any,
    enabled: !!user,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/agent/hero-requests/${id}/approve`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-hero-requests"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/agent/hero-requests/${id}/reject`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-hero-requests"] }),
  });

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {[
          { label: "Total Heroes", value: stats?.totalHeroes ?? 0, icon: "🦸" },
          { label: "Active Areas", value: stats?.activeAreas ?? 0, icon: "📍" },
          { label: "Orders Today", value: stats?.ordersToday ?? 0, icon: "📦" },
          { label: "Revenue", value: stats?.totalRevenue ? `₹${stats.totalRevenue}` : "₹0", icon: "💰" },
        ].map(({ label, value, icon }) => (
          <View key={label} style={styles.statCard}>
            <Text style={styles.statIcon}>{icon}</Text>
            <Text style={styles.statVal}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Pending hero applications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hero Applications</Text>

        {isLoading ? (
          <ActivityIndicator color={BRAND_PRIMARY} style={{ margin: 20 }} />
        ) : heroRequests.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pending hero applications.</Text>
          </View>
        ) : (
          heroRequests.map((req) => (
            <View key={req.id} style={styles.reqCard}>
              <View style={styles.reqTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>{(req.hero?.name ?? "H")[0].toUpperCase()}</Text>
                </View>
                <View style={styles.reqInfo}>
                  <Text style={styles.reqName}>{req.hero?.name ?? "Hero"}</Text>
                  <Text style={styles.reqEmail}>{req.hero?.email}</Text>
                </View>
              </View>

              {req.subcategory && (
                <Text style={styles.reqSub}>📋 Applying for: {req.subcategory.name}</Text>
              )}

              <View style={styles.reqActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => approveMutation.mutate(req.id)}
                  disabled={approveMutation.isPending}
                >
                  <Text style={styles.approveText}>Approve ✓</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.denyBtn]}
                  onPress={() => rejectMutation.mutate(req.id)}
                  disabled={rejectMutation.isPending}
                >
                  <Text style={styles.denyText}>Deny ✗</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Quick links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manage</Text>
        <View style={styles.quickLinks}>
          {[
            { icon: "🗺️", label: "Service Areas", screen: "AgentAreas" as const },
            { icon: "🦸", label: "My Heroes", screen: "AgentHeroes" as const },
            { icon: "📋", label: "All Bookings", screen: "AgentBookingHistory" as const },
            { icon: "💳", label: "Payments", screen: "AgentPaymentHistory" as const },
            { icon: "�", label: "Price Control", screen: "AgentPriceControl" as const },
          ].map(({ icon, label, screen }) => (
            <TouchableOpacity key={label} style={styles.quickCard} onPress={() => navigation.navigate(screen)}>
              <Text style={styles.quickIcon}>{icon}</Text>
              <Text style={styles.quickLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 10 },
  statCard: {
    width: "47%", backgroundColor: "#fff", borderRadius: 16,
    padding: 16, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statVal: { fontSize: 22, fontWeight: "800", color: BRAND_PRIMARY },
  statLabel: { fontSize: 11, color: BRAND_MUTED, marginTop: 3, textAlign: "center" },
  section: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 12 },
  empty: { padding: 20, alignItems: "center" },
  emptyText: { color: BRAND_MUTED, fontSize: 14 },
  reqCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.05, elevation: 2,
  },
  reqTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  avatarInitial: { color: "#fff", fontSize: 18, fontWeight: "700" },
  reqInfo: { flex: 1 },
  reqName: { fontSize: 15, fontWeight: "700", color: "#111" },
  reqEmail: { fontSize: 12, color: BRAND_MUTED },
  reqSub: { fontSize: 12, color: BRAND_MUTED, marginBottom: 12 },
  reqActions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  approveBtn: { backgroundColor: BRAND_PRIMARY },
  denyBtn: { borderWidth: 1.5, borderColor: "#ef4444" },
  approveText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  denyText: { color: "#ef4444", fontSize: 13, fontWeight: "700" },
  quickLinks: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: {
    width: "30%", backgroundColor: "#fff", borderRadius: 14,
    padding: 14, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  quickIcon: { fontSize: 24, marginBottom: 6 },
  quickLabel: { fontSize: 11, fontWeight: "600", color: "#111", textAlign: "center" },
});
