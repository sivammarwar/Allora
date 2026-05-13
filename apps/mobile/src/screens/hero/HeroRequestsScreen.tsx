import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

const FILTERS = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  IN_PROGRESS: "#8b5cf6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

export default function HeroRequestsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("PENDING");

  const { data: requests = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["hero-requests-all", filter],
    queryFn: () => api.get(`/api/hero/requests?status=${filter}`) as any,
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.patch(`/api/hero/requests/${id}/${action}`) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hero-requests-all"] });
      qc.invalidateQueries({ queryKey: ["hero-stats"] });
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Action failed."),
  });

  const handleAction = (id: string, action: string, label: string) => {
    Alert.alert(`${label}?`, `Are you sure you want to ${label.toLowerCase()} this request?`, [
      { text: "Cancel", style: "cancel" },
      { text: label, onPress: () => updateMutation.mutate({ id, action }) },
    ]);
  };

  return (
    <View style={styles.screen}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(f) => f}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterBtn, filter === item && styles.filterBtnActive]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
                {item.replace("_", " ")}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={BRAND_PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No {filter.toLowerCase().replace("_", " ")} requests</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.service}>{item.subcategory?.name ?? "Service"}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] ?? "#9ca3af" }]}>
                  <Text style={styles.badgeText}>{item.status.replace("_", " ")}</Text>
                </View>
              </View>

              <Text style={styles.customer}>
                👤 {item.user?.name ?? item.user?.email ?? "Customer"}
              </Text>

              {item.scheduledAt && (
                <Text style={styles.meta}>
                  📅 {new Date(item.scheduledAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  {"  "}
                  {new Date(item.scheduledAt).toLocaleTimeString("en-IN", { timeStyle: "short" })}
                </Text>
              )}

              {item.totalCharge != null && (
                <Text style={styles.charge}>₹{item.totalCharge}</Text>
              )}

              {/* Action buttons */}
              <View style={styles.actions}>
                {item.status === "PENDING" && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.acceptBtn]}
                      onPress={() => handleAction(item.id, "accept", "Accept")}
                    >
                      <Text style={styles.acceptText}>Accept ✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleAction(item.id, "reject", "Reject")}
                    >
                      <Text style={styles.rejectText}>Reject ✗</Text>
                    </TouchableOpacity>
                  </>
                )}
                {item.status === "CONFIRMED" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleAction(item.id, "start", "Start")}
                  >
                    <Text style={styles.acceptText}>Start →</Text>
                  </TouchableOpacity>
                )}
                {item.status === "IN_PROGRESS" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleAction(item.id, "complete", "Complete")}
                  >
                    <Text style={styles.acceptText}>Complete ✓</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  filterRow: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  filterList: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: "#f3f4f6",
  },
  filterBtnActive: { backgroundColor: BRAND_PRIMARY },
  filterText: { fontSize: 11, fontWeight: "700", color: BRAND_MUTED },
  filterTextActive: { color: "#fff" },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  service: { flex: 1, fontSize: 15, fontWeight: "700", color: "#111" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  customer: { fontSize: 12, color: BRAND_MUTED, marginBottom: 4 },
  meta: { fontSize: 12, color: BRAND_MUTED, marginBottom: 6 },
  charge: { fontSize: 16, fontWeight: "700", color: BRAND_PRIMARY, marginBottom: 12 },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  acceptBtn: { backgroundColor: BRAND_PRIMARY },
  rejectBtn: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#ef4444" },
  acceptText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  rejectText: { color: "#ef4444", fontSize: 13, fontWeight: "700" },
});
