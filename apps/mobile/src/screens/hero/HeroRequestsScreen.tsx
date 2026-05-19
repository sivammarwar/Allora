import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";
import { connectService } from "../../lib/socket";

const FILTERS = ["INCOMING", "ACCEPTED", "COMPLETED", "CANCELLED"];
const FILTER_LABELS: Record<string, string> = {
  INCOMING: "Incoming", ACCEPTED: "Accepted", COMPLETED: "Completed", CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:   "#f59e0b",
  ACCEPTED:  "#3b82f6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

function fmtHour(h: number) {
  const ampm = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:00 ${ampm}`;
}

function calcFinal(r: any) {
  return Number(r.charge) * (1 - Number(r.discountPercent ?? 0) / 100);
}

export default function HeroRequestsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("INCOMING");

  // Real-time: invalidate incoming list when a new request arrives or is taken
  useEffect(() => {
    if (!user?.id) return;
    let socket: any;
    const onNew = (data: any) => {
      console.log("[Socket Hero] Received service_request:new event:", data);
      qc.invalidateQueries({ queryKey: ["hero-requests", "INCOMING"] });
    };
    const onTaken = (data: any) => {
      console.log("[Socket Hero] Received service_request:taken event:", data);
      qc.invalidateQueries({ queryKey: ["hero-requests", "INCOMING"] });
    };
    (async () => {
      try {
        console.log("[Socket Hero] Connecting to service socket...");
        socket = await connectService();
        console.log("[Socket Hero] Connected to service socket");
        // Fetch hero profile to get hero ID for room joining
        const heroProfile = await api.get("/api/hero/me") as any;
        console.log("[Socket Hero] Hero profile:", heroProfile?.id ? "FOUND" : "NOT FOUND");
        if (heroProfile?.id) {
          socket.emit("hero:join", heroProfile.id);
          console.log("[Socket Hero] Joined hero room:", heroProfile.id);
        }
        socket.on("service_request:new", onNew);
        socket.on("service_request:taken", onTaken);
        console.log("[Socket Hero] Listening for service_request:new and service_request:taken events");
      } catch (e) {
        console.log("[Socket Hero] Connection error:", e);
      }
    })();
    return () => {
      if (socket) {
        socket.off("service_request:new", onNew);
        socket.off("service_request:taken", onTaken);
      }
    };
  }, [user?.id, qc]);

  const isIncoming = filter === "INCOMING";

  const { data: requests = [], isLoading, isFetching, refetch } = useQuery<any[]>({
    queryKey: ["hero-requests", filter],
    queryFn: () =>
      isIncoming
        ? (api.get("/api/hero/service-requests/incoming") as any)
        : (api.get(`/api/hero/service-requests?status=${filter}`) as any),
    enabled: !!user,
    refetchInterval: isIncoming ? 15_000 : false,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.post(`/api/hero/service-requests/${id}/${action}`) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hero-requests"] });
      qc.invalidateQueries({ queryKey: ["hero-stats"] });
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? e?.error ?? "Action failed."),
  });

  const handleAction = (id: string, action: string, label: string) => {
    Alert.alert(
      `${label} booking?`,
      `Are you sure you want to ${label.toLowerCase()} this request?`,
      [
        { text: "No", style: "cancel" },
        {
          text: label,
          style: (action === "cancel" || action === "decline") ? "destructive" : "default",
          onPress: () => actionMutation.mutate({ id, action }),
        },
      ]
    );
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
                {FILTER_LABELS[item]}
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
          refreshing={isFetching && !isLoading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>
                {isIncoming ? "No new requests" : `No ${FILTER_LABELS[filter].toLowerCase()} requests`}
              </Text>
              <Text style={styles.emptySub}>
                {isIncoming ? "New booking requests in your area will appear here." : ""}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const final = calcFinal(item);
            const dateStr = item.scheduledDate
              ? new Date(item.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : null;
            const status = item.status ?? "PENDING";

            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.service}>{item.subcategory?.name ?? "Service"}</Text>
                    <Text style={styles.category}>{item.subcategory?.category?.name}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] ?? "#9ca3af" }]}>
                    <Text style={styles.badgeText}>{status}</Text>
                  </View>
                </View>

                <Text style={styles.customer}>
                  👤 {item.user?.name ?? "Customer"}
                </Text>

                {dateStr && (
                  <Text style={styles.meta}>
                    📅 {dateStr}{"  "}🕐 {fmtHour(item.scheduledHour)}
                  </Text>
                )}

                {item.userAddress && (
                  <Text style={styles.meta}>📍 {item.userAddress}</Text>
                )}

                {(item.distanceKm ?? 0) > 0 && (
                  <Text style={styles.distanceText}>📍 {item.distanceKm} km away</Text>
                )}

                {(() => {
                  const transportTotal = Number(item.transportTotal ?? 0);
                  const total = final + transportTotal;
                  return (
                    <View>
                      <Text style={styles.charge}>₹{total.toFixed(0)}</Text>
                      {transportTotal > 0 ? (
                        <Text style={styles.transportText}>incl. ₹{transportTotal.toFixed(0)} travel charge</Text>
                      ) : (item.distanceKm ?? 0) > 0 ? (
                        <Text style={styles.freeTransportText}>Free travel</Text>
                      ) : null}
                    </View>
                  );
                })()}

                {/* Action buttons */}
                <View style={styles.actions}>
                  {isIncoming && status === "PENDING" && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => handleAction(item.id, "accept", "Accept")}
                        disabled={actionMutation.isPending}
                      >
                        <Text style={styles.acceptText}>Accept ✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.cancelBtn]}
                        onPress={() => handleAction(item.id, "decline", "Decline")}
                        disabled={actionMutation.isPending}
                      >
                        <Text style={styles.cancelText}>Decline ✗</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {status === "ACCEPTED" && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => handleAction(item.id, "complete", "Complete")}
                        disabled={actionMutation.isPending}
                      >
                        <Text style={styles.acceptText}>Complete ✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.cancelBtn]}
                        onPress={() => handleAction(item.id, "cancel", "Cancel")}
                        disabled={actionMutation.isPending}
                      >
                        <Text style={styles.cancelText}>Cancel ✗</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  filterRow: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  filterList: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#f3f4f6" },
  filterBtnActive: { backgroundColor: BRAND_PRIMARY },
  filterText: { fontSize: 11, fontWeight: "700", color: BRAND_MUTED },
  filterTextActive: { color: "#fff" },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111", textAlign: "center" },
  emptySub: { fontSize: 12, color: BRAND_MUTED, textAlign: "center", marginTop: 6 },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  service: { fontSize: 15, fontWeight: "700", color: "#111" },
  category: { fontSize: 11, color: BRAND_MUTED, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginLeft: 8 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  customer: { fontSize: 12, color: BRAND_MUTED, marginBottom: 4 },
  meta: { fontSize: 12, color: BRAND_MUTED, marginBottom: 4 },
  charge: { fontSize: 17, fontWeight: "800", color: BRAND_PRIMARY, marginTop: 6, marginBottom: 2 },
  distanceText: { fontSize: 12, color: "#3b82f6", fontWeight: "600", marginBottom: 4 },
  transportText: { fontSize: 10, color: BRAND_MUTED, marginBottom: 10 },
  freeTransportText: { fontSize: 10, color: "#10b981", fontWeight: "600", marginBottom: 10 },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  acceptBtn: { backgroundColor: BRAND_PRIMARY },
  cancelBtn: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#ef4444" },
  acceptText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  cancelText: { color: "#ef4444", fontSize: 13, fontWeight: "700" },
});
