import React, { useEffect, useState, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Modal, ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";
import { connectService } from "../../lib/socket";

const FILTERS = ["INCOMING", "ACCEPTED", "COMPLETED", "CANCELLED"];
const FILTER_LABELS: Record<string, string> = {
  INCOMING: "Incoming", ACCEPTED: "Accepted", COMPLETED: "Completed", CANCELLED: "Cancelled",
};

function fmtHour(h: number) {
  const ampm = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:00 ${ampm}`;
}

interface RequestGroup {
  key: string;
  categoryName: string;
  scheduledDate: string;
  scheduledHour: number;
  userName: string;
  userPhone: string;
  userGender?: string;
  userAddress: string;
  distanceKm: number;
  requests: any[];
  totalFinal: number;
  totalTransport: number;
}

function groupRequests(list: any[]): RequestGroup[] {
  const map = new Map<string, RequestGroup>();
  for (const r of list) {
    // Use groupId when available (bulk bookings), fall back to composite key
    const key = r.groupId
      ? r.groupId
      : `${r.subcategory?.category?.id ?? ""}__${r.scheduledDate}__${r.scheduledHour}__${r.userPhone}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        categoryName: r.subcategory?.category?.name ?? "Service",
        scheduledDate: r.scheduledDate,
        scheduledHour: r.scheduledHour,
        userName: r.userName ?? r.user?.name ?? "Customer",
        userPhone: r.userPhone ?? "",
        userGender: r.userGender,
        userAddress: r.userAddress ?? "",
        distanceKm: r.distanceKm ?? 0,
        requests: [],
        totalFinal: 0,
        totalTransport: 0,
      });
    }
    const g = map.get(key)!;
    const afterInd = Number(r.charge) * (1 - Number(r.discountPercent ?? 0) / 100);
    const final = afterInd * (1 - Number(r.bulkDiscountPercent ?? 0) / 100);
    g.requests.push(r);
    g.totalFinal += final;
    g.totalTransport += Number(r.transportTotal ?? 0);
    if (r.distanceKm) g.distanceKm = r.distanceKm;
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  );
}

export default function HeroRequestsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("INCOMING");
  const [selected, setSelected] = useState<RequestGroup | null>(null);

  // Real-time: invalidate incoming list when a new request arrives or is taken
  useEffect(() => {
    if (!user?.id) return;
    let socket: any;
    const onNew = () => qc.invalidateQueries({ queryKey: ["hero-requests", "INCOMING"] });
    const onTaken = () => qc.invalidateQueries({ queryKey: ["hero-requests", "INCOMING"] });
    (async () => {
      try {
        socket = await connectService();
        const heroProfile = await api.get("/api/hero/me") as any;
        if (heroProfile?.id) socket.emit("hero:join", heroProfile.id);
        socket.on("service_request:new", onNew);
        socket.on("service_request:taken", onTaken);
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

  const groups = useMemo(() => groupRequests(requests), [requests]);

  // Accept all requests in a group sequentially
  const acceptAllMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      let count = 0;
      for (const id of ids) {
        try {
          await api.post(`/api/hero/service-requests/${id}/accept`);
          count++;
        } catch {}
      }
      if (count === 0) throw new Error("All requests already taken");
      return count;
    },
    onSuccess: (count) => {
      setSelected(null);
      Alert.alert("Accepted! ✓", `${count} booking${count > 1 ? "s" : ""} accepted.`);
      qc.invalidateQueries({ queryKey: ["hero-requests"] });
      qc.invalidateQueries({ queryKey: ["hero-stats"] });
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Action failed."),
  });

  // Decline all requests in a group
  const declineAllMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        try { await api.post(`/api/hero/service-requests/${id}/decline`); } catch {}
      }
    },
    onSuccess: () => {
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["hero-requests"] });
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Action failed."),
  });

  // Complete all in a group
  const completeAllMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        try { await api.post(`/api/hero/service-requests/${id}/complete`); } catch {}
      }
    },
    onSuccess: () => {
      setSelected(null);
      Alert.alert("Completed! ✓", "Session marked as completed.");
      qc.invalidateQueries({ queryKey: ["hero-requests"] });
      qc.invalidateQueries({ queryKey: ["hero-stats"] });
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Action failed."),
  });

  // Cancel all in a group
  const cancelAllMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        try { await api.post(`/api/hero/service-requests/${id}/cancel`); } catch {}
      }
    },
    onSuccess: () => {
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["hero-requests"] });
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Action failed."),
  });

  const handleAcceptAll = (g: RequestGroup) => {
    const ids = g.requests.filter((r) => r.status === "PENDING").map((r) => r.id);
    Alert.alert(
      "Accept all?",
      `Accept all ${ids.length} service${ids.length > 1 ? "s" : ""} in this booking?`,
      [
        { text: "No", style: "cancel" },
        { text: "Accept All", onPress: () => acceptAllMutation.mutate(ids) },
      ]
    );
  };

  const handleDeclineAll = (g: RequestGroup) => {
    const ids = g.requests.filter((r) => r.status === "PENDING").map((r) => r.id);
    Alert.alert(
      "Decline all?",
      `Decline all ${ids.length} service${ids.length > 1 ? "s" : ""} in this booking?`,
      [
        { text: "No", style: "cancel" },
        { text: "Decline All", style: "destructive", onPress: () => declineAllMutation.mutate(ids) },
      ]
    );
  };

  const handleCompleteAll = (g: RequestGroup) => {
    const ids = g.requests.filter((r) => r.status === "ACCEPTED").map((r) => r.id);
    Alert.alert(
      "Complete all?",
      `Mark all ${ids.length} service${ids.length > 1 ? "s" : ""} as completed?`,
      [
        { text: "No", style: "cancel" },
        { text: "Complete", onPress: () => completeAllMutation.mutate(ids) },
      ]
    );
  };

  const handleCancelAll = (g: RequestGroup) => {
    const ids = g.requests.filter((r) => ["PENDING", "ACCEPTED"].includes(r.status)).map((r) => r.id);
    Alert.alert(
      "Cancel all?",
      `Cancel all ${ids.length} service${ids.length > 1 ? "s" : ""} in this booking?`,
      [
        { text: "No", style: "cancel" },
        { text: "Cancel All", style: "destructive", onPress: () => cancelAllMutation.mutate(ids) },
      ]
    );
  };

  const isMutating = acceptAllMutation.isPending || declineAllMutation.isPending
    || completeAllMutation.isPending || cancelAllMutation.isPending;

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
          data={groups}
          keyExtractor={(g) => g.key}
          contentContainerStyle={groups.length === 0 ? styles.emptyContainer : styles.list}
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
          renderItem={({ item: g }) => {
            const dateStr = g.scheduledDate
              ? new Date(g.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : null;
            const grandTotal = g.totalFinal + g.totalTransport;

            return (
              <TouchableOpacity style={styles.card} onPress={() => setSelected(g)} activeOpacity={0.85}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.categoryName}>{g.categoryName}</Text>
                    <Text style={styles.serviceList} numberOfLines={2}>
                      {g.requests.map((r) => r.subcategory?.name).join(" · ")}
                    </Text>
                  </View>
                  <Text style={styles.serviceCount}>
                    {g.requests.length} service{g.requests.length > 1 ? "s" : ""}
                  </Text>
                </View>

                <Text style={styles.customer}>👤 {g.userName}</Text>

                {dateStr && (
                  <Text style={styles.meta}>📅 {dateStr}  🕐 {fmtHour(g.scheduledHour)}</Text>
                )}

                {g.userAddress ? <Text style={styles.meta}>📍 {g.userAddress}</Text> : null}

                {g.distanceKm > 0 && (
                  <Text style={styles.distanceText}>📍 {g.distanceKm} km away</Text>
                )}

                <View style={styles.priceRow}>
                  <Text style={styles.charge}>₹{grandTotal.toFixed(0)}</Text>
                  {g.totalTransport > 0 && (
                    <Text style={styles.transportText}>incl. ₹{g.totalTransport.toFixed(0)} travel</Text>
                  )}
                </View>

                {g.requests[0]?.status === "CANCELLED" && g.requests[0]?.cancelledBy && (
                  <View style={styles.cancelledTag}>
                    <Text style={styles.cancelledTagText}>
                      Cancelled by {g.requests[0].cancelledBy === "HERO" ? "you" : "user"}
                    </Text>
                  </View>
                )}

                <Text style={styles.tapHint}>Tap for details →</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── Detail modal ──────────────────────────────────────────── */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{selected?.categoryName}</Text>
                <Text style={styles.sheetSub}>
                  {selected ? new Date(selected.scheduledDate).toLocaleDateString("en-IN", {
                    weekday: "long", day: "numeric", month: "long",
                  }) : ""}
                  {selected ? ` · ${fmtHour(selected.scheduledHour)}` : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {/* Services list */}
              {selected?.requests.map((r) => {
                const afterInd = Number(r.charge) * (1 - Number(r.discountPercent ?? 0) / 100);
                const indDisc = Number(r.discountPercent ?? 0);
                return (
                  <View key={r.id} style={styles.lineItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineItemName}>{r.subcategory?.name ?? "Service"}</Text>
                      {indDisc > 0 && <Text style={styles.discountLabel}>{indDisc}% off</Text>}
                    </View>
                    <Text style={styles.lineItemPrice}>₹{afterInd.toFixed(0)}</Text>
                  </View>
                );
              })}

              {/* Bulk discount */}
              {selected && (() => {
                const bulkPct = Number(selected.requests[0]?.bulkDiscountPercent ?? 0);
                if (bulkPct <= 0) return null;
                const subtotal = selected.requests.reduce(
                  (s: number, r: any) => s + Number(r.charge) * (1 - Number(r.discountPercent ?? 0) / 100), 0
                );
                return (
                  <View style={styles.summaryRow}>
                    <Text style={styles.bulkLabel}>Bulk discount ({bulkPct}% off)</Text>
                    <Text style={styles.bulkSaving}>−₹{(subtotal * bulkPct / 100).toFixed(0)}</Text>
                  </View>
                );
              })()}

              {/* Distance & transport */}
              {selected && selected.distanceKm > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.distanceLabel}>📍 Distance to user</Text>
                  <Text style={styles.distanceValue}>{selected.distanceKm} km</Text>
                </View>
              )}
              {selected && selected.totalTransport > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.transportLabel}>Travel charge</Text>
                  <Text style={styles.transportValue}>₹{selected.totalTransport.toFixed(0)}</Text>
                </View>
              )}

              {/* Total */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>
                  ₹{((selected?.totalFinal ?? 0) + (selected?.totalTransport ?? 0)).toFixed(0)}
                </Text>
              </View>

              {/* Customer info */}
              {selected && (
                <View style={styles.customerBox}>
                  <Text style={styles.customerBoxTitle}>CUSTOMER</Text>
                  <Text style={styles.customerBoxLine}>👤 {selected.userName}{selected.userGender ? ` · ${selected.userGender.toLowerCase()}` : ""}</Text>
                  <Text style={styles.customerBoxLine}>📞 {selected.userPhone}</Text>
                  <Text style={styles.customerBoxLine}>📍 {selected.userAddress}</Text>
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            {selected && isIncoming && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn]}
                  onPress={() => handleAcceptAll(selected)}
                  disabled={isMutating}
                >
                  {acceptAllMutation.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.acceptText}>Accept All ({selected.requests.length})</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.declineBtn]}
                  onPress={() => handleDeclineAll(selected)}
                  disabled={isMutating}
                >
                  {declineAllMutation.isPending
                    ? <ActivityIndicator color="#ef4444" size="small" />
                    : <Text style={styles.declineText}>Decline All</Text>}
                </TouchableOpacity>
              </View>
            )}

            {selected && filter === "ACCEPTED" && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn]}
                  onPress={() => handleCompleteAll(selected)}
                  disabled={isMutating}
                >
                  {completeAllMutation.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.acceptText}>Complete All ({selected.requests.length})</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.declineBtn]}
                  onPress={() => handleCancelAll(selected)}
                  disabled={isMutating}
                >
                  {cancelAllMutation.isPending
                    ? <ActivityIndicator color="#ef4444" size="small" />
                    : <Text style={styles.declineText}>Cancel All</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  categoryName: { fontSize: 15, fontWeight: "700", color: "#111" },
  serviceList: { fontSize: 12, color: "#374151", marginTop: 3 },
  serviceCount: {
    fontSize: 10, fontWeight: "700", color: BRAND_PRIMARY,
    backgroundColor: "#f0f4ff", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, overflow: "hidden", marginLeft: 8,
  },
  customer: { fontSize: 12, color: BRAND_MUTED, marginBottom: 4 },
  meta: { fontSize: 12, color: BRAND_MUTED, marginBottom: 4 },
  distanceText: { fontSize: 12, color: "#3b82f6", fontWeight: "600", marginBottom: 4 },
  priceRow: { marginTop: 6, marginBottom: 4 },
  charge: { fontSize: 17, fontWeight: "800", color: BRAND_PRIMARY },
  transportText: { fontSize: 10, color: BRAND_MUTED },
  cancelledTag: {
    backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start", marginTop: 4,
  },
  cancelledTagText: { fontSize: 11, fontWeight: "600", color: "#dc2626" },
  tapHint: { fontSize: 11, color: BRAND_MUTED, marginTop: 6 },
  // Detail modal
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  handle: { width: 40, height: 4, backgroundColor: "#e5e7eb", borderRadius: 4, alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 2 },
  sheetSub: { fontSize: 13, color: BRAND_MUTED },
  closeBtn: { padding: 4, marginLeft: 12 },
  closeBtnText: { fontSize: 18, color: BRAND_MUTED },
  lineItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  lineItemName: { fontSize: 14, fontWeight: "600", color: "#111" },
  discountLabel: { fontSize: 10, color: "#10b981", fontWeight: "600", marginTop: 2 },
  lineItemPrice: { fontSize: 14, fontWeight: "700", color: "#111" },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  bulkLabel: { fontSize: 13, color: "#16a34a", fontWeight: "600" },
  bulkSaving: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
  distanceLabel: { fontSize: 13, color: "#3b82f6", fontWeight: "600" },
  distanceValue: { fontSize: 13, fontWeight: "700", color: "#3b82f6" },
  transportLabel: { fontSize: 13, color: BRAND_MUTED },
  transportValue: { fontSize: 13, fontWeight: "700", color: "#111" },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, marginBottom: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#111" },
  totalAmount: { fontSize: 20, fontWeight: "800", color: "#111" },
  customerBox: {
    backgroundColor: "#f9f5ff", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#ede9fe", marginBottom: 12,
  },
  customerBoxTitle: { fontSize: 10, fontWeight: "700", color: BRAND_MUTED, marginBottom: 6, letterSpacing: 1 },
  customerBoxLine: { fontSize: 13, color: "#374151", marginBottom: 3 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 8 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  acceptBtn: { backgroundColor: BRAND_PRIMARY },
  declineBtn: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#ef4444" },
  acceptText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  declineText: { color: "#ef4444", fontSize: 14, fontWeight: "700" },
});
