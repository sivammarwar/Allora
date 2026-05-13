import React, { useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";
import { connectService } from "../../lib/socket";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  IN_PROGRESS: "#8b5cf6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

export default function HeroHomeScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    let socket: any;
    (async () => {
      socket = await connectService();
      if (user?.id) {
        socket.emit("hero:join", user.id);
        socket.on("booking:new", () => qc.invalidateQueries({ queryKey: ["hero-requests"] }));
        socket.on("booking:updated", () => qc.invalidateQueries({ queryKey: ["hero-requests"] }));
      }
    })();
    return () => { socket?.off("booking:new"); socket?.off("booking:updated"); };
  }, [user?.id, qc]);

  const { data: stats } = useQuery<any>({
    queryKey: ["hero-stats"],
    queryFn: () => api.get("/api/hero/stats") as any,
    enabled: !!user,
  });

  const { data: requests = [], isLoading } = useQuery<any[]>({
    queryKey: ["hero-requests"],
    queryFn: () => api.get("/api/hero/requests?status=PENDING&limit=5") as any,
    enabled: !!user,
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/hero/requests/${id}/accept`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hero-requests"] }),
  });

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>

      {/* Stats strip */}
      <View style={styles.statsRow}>
        {[
          { label: "Completed", value: stats?.completedCount ?? 0 },
          { label: "Pending", value: stats?.pendingCount ?? 0 },
          { label: "Rating", value: stats?.avgRating ? stats.avgRating.toFixed(1) : "—" },
          { label: "Earnings", value: stats?.totalEarnings ? `₹${stats.totalEarnings}` : "₹0" },
        ].map(({ label, value }) => (
          <View key={label} style={styles.statCard}>
            <Text style={styles.statVal}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Pending requests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>New Requests</Text>
        {isLoading ? (
          <ActivityIndicator color={BRAND_PRIMARY} style={{ margin: 20 }} />
        ) : requests.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pending requests right now.</Text>
          </View>
        ) : (
          requests.map((req) => (
            <View key={req.id} style={styles.reqCard}>
              <View style={styles.reqTop}>
                <Text style={styles.reqService}>{req.subcategory?.name ?? "Service"}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[req.status] ?? "#9ca3af" }]}>
                  <Text style={styles.badgeText}>{req.status}</Text>
                </View>
              </View>
              <Text style={styles.reqUser}>👤 {req.user?.name ?? req.user?.email ?? "Customer"}</Text>
              {req.totalCharge != null && (
                <Text style={styles.reqCharge}>₹{req.totalCharge}</Text>
              )}
              {req.status === "PENDING" && (
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => acceptMutation.mutate(req.id)}
                  disabled={acceptMutation.isPending}
                >
                  <Text style={styles.acceptText}>
                    {acceptMutation.isPending ? "Accepting…" : "Accept Request ✓"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  statsRow: { flexDirection: "row", padding: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14,
    padding: 14, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  statVal: { fontSize: 20, fontWeight: "800", color: BRAND_PRIMARY },
  statLabel: { fontSize: 10, color: BRAND_MUTED, marginTop: 2, textAlign: "center" },
  section: { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 12 },
  empty: { padding: 24, alignItems: "center" },
  emptyText: { color: BRAND_MUTED, fontSize: 14 },
  reqCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.05, elevation: 2,
  },
  reqTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  reqService: { fontSize: 15, fontWeight: "700", color: "#111", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  reqUser: { fontSize: 12, color: BRAND_MUTED, marginBottom: 6 },
  reqCharge: { fontSize: 16, fontWeight: "700", color: BRAND_PRIMARY, marginBottom: 12 },
  acceptBtn: {
    backgroundColor: BRAND_PRIMARY, borderRadius: 12,
    paddingVertical: 12, alignItems: "center",
  },
  acceptText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
