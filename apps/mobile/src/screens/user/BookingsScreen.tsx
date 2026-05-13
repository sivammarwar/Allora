import React from "react";
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  IN_PROGRESS: "#8b5cf6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

export default function BookingsScreen() {
  const { user } = useAuth();

  const { data: bookings = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["my-bookings"],
    queryFn: () => api.get("/api/user/bookings") as any,
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={BRAND_PRIMARY} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={bookings}
      keyExtractor={(b) => b.id}
      style={styles.screen}
      contentContainerStyle={bookings.length === 0 ? styles.emptyContainer : styles.listContent}
      onRefresh={refetch}
      refreshing={isLoading}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptySub}>Your service bookings will appear here.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceName}>{item.subcategory?.name ?? "Service"}</Text>
              <Text style={styles.heroName}>
                {item.hero?.name ? `Hero: ${item.hero.name}` : "Hero not assigned yet"}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] ?? "#9ca3af" }]}>
              <Text style={styles.badgeText}>{item.status?.replace("_", " ")}</Text>
            </View>
          </View>
          <View style={styles.cardBottom}>
            <Text style={styles.meta}>
              {item.scheduledAt
                ? new Date(item.scheduledAt).toLocaleDateString("en-IN", { dateStyle: "medium" })
                : "Schedule TBD"}
            </Text>
            {item.totalCharge != null && (
              <Text style={styles.price}>₹{item.totalCharge}</Text>
            )}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8,
    elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  serviceName: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 4 },
  heroName: { fontSize: 12, color: BRAND_MUTED },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meta: { fontSize: 12, color: BRAND_MUTED },
  price: { fontSize: 15, fontWeight: "700", color: BRAND_PRIMARY },
});
