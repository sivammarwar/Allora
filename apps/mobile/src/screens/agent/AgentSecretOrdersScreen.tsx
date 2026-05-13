import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Image,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface SecretOrderItem {
  id: string; quantity: number; unitPrice: number; isPacked: boolean; isRejected: boolean;
  inventoryItem: { id: string; price: number; item: { id: string; name: string; brandName: string | null; imageUrl: string | null } };
}
interface SecretOrder {
  id: string; status: string; totalAmount: number; notes: string | null;
  paymentMode: "COD" | "ONLINE"; paymentStatus: "PENDING" | "PAID" | "FAILED";
  createdAt: string;
  shop: { id: string; shopName: string; phone: string; address: string };
  items: SecretOrderItem[];
}

const STATUS_LABELS: Record<string, string> = { PLACED: "Placed", RECEIVED: "Received", PACKED: "Packed", OUT_FOR_DELIVERY: "Out for Delivery", DELIVERED: "Delivered", CANCELLED: "Cancelled" };
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PLACED:           { bg: "#dbeafe", text: "#1d4ed8" },
  RECEIVED:         { bg: "#ede9fe", text: "#6d28d9" },
  PACKED:           { bg: "#fef9c3", text: "#854d0e" },
  OUT_FOR_DELIVERY: { bg: "#fff7ed", text: "#c2410c" },
  DELIVERED:        { bg: "#dcfce7", text: "#15803d" },
  CANCELLED:        { bg: "#fee2e2", text: "#b91c1c" },
};
const NEXT: Record<string, string[]> = {
  PLACED: ["RECEIVED", "CANCELLED"], RECEIVED: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY", "CANCELLED"], OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
};

function OrderCard({ order }: { order: SecretOrder }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const statusMut = useMutation({
    mutationFn: (status: string) => api.patch(`/api/agent/secret-orders/${order.id}/status`, { status }) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-secret-orders"] }),
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  const codMut = useMutation({
    mutationFn: () => api.post(`/api/agent/secret-orders/${order.id}/mark-cod-paid`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-secret-orders"] }),
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  const rejectItemMut = useMutation({
    mutationFn: (itemId: string) => api.patch(`/api/agent/secret-order-items/${itemId}/reject`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-secret-orders"] }),
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  const sc = STATUS_COLORS[order.status] ?? { bg: "#f3f4f6", text: "#374151" };
  const effectiveTotal = order.items.filter((i) => !i.isRejected).reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const nextStatuses = NEXT[order.status] ?? [];

  return (
    <View style={s.card}>
      <TouchableOpacity style={s.cardHeader} onPress={() => setOpen(!open)}>
        <View>
          <Text style={s.orderId}>#{order.id.slice(-8).toUpperCase()}</Text>
          <Text style={s.shopName}>{order.shop.shopName}</Text>
        </View>
        <View style={s.cardHeaderRight}>
          <View style={[s.statusPill, { backgroundColor: sc.bg }]}>
            <Text style={[s.statusText, { color: sc.text }]}>{STATUS_LABELS[order.status] ?? order.status}</Text>
          </View>
          <Text style={s.orderTotal}>₹{effectiveTotal.toFixed(0)}</Text>
          <Text style={s.chevron}>{open ? "▲" : "▼"}</Text>
        </View>
      </TouchableOpacity>

      {open && (
        <View style={s.details}>
          <Text style={s.detailText}>📍 {order.shop.address}</Text>
          <Text style={s.detailText}>📞 {order.shop.phone}</Text>
          {order.notes && <Text style={s.detailText}>📝 {order.notes}</Text>}

          {order.items.map((oi) => (
            <View key={oi.id} style={s.itemRow}>
              {oi.inventoryItem.item.imageUrl
                ? <Image source={{ uri: oi.inventoryItem.item.imageUrl }} style={s.itemImg} />
                : <View style={s.itemImgPlaceholder}><Text>📦</Text></View>}
              <View style={s.itemInfo}>
                <Text style={s.itemName}>{oi.inventoryItem.item.name}</Text>
                <Text style={s.itemMeta}>{oi.quantity} × ₹{oi.unitPrice}{oi.isRejected ? " · Rejected" : oi.isPacked ? " · Packed ✓" : ""}</Text>
              </View>
              {!oi.isRejected && order.status === "RECEIVED" && (
                <TouchableOpacity style={s.rejectItemBtn} onPress={() => rejectItemMut.mutate(oi.id)} disabled={rejectItemMut.isPending}>
                  <Text style={s.rejectItemText}>Reject</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {/* Status actions */}
          {nextStatuses.length > 0 && (
            <View style={s.actions}>
              {nextStatuses.map((ns) => (
                <TouchableOpacity
                  key={ns}
                  style={[s.actionBtn, ns === "CANCELLED" ? s.cancelBtn : s.advanceBtn]}
                  onPress={() => Alert.alert(`Move to ${STATUS_LABELS[ns] ?? ns}?`, undefined, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Confirm", onPress: () => statusMut.mutate(ns) },
                  ])}
                  disabled={statusMut.isPending}
                >
                  <Text style={[s.actionBtnText, ns === "CANCELLED" && s.cancelBtnText]}>
                    {ns === "CANCELLED" ? "Cancel" : `→ ${STATUS_LABELS[ns]}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Mark COD paid */}
          {order.paymentMode === "COD" && order.paymentStatus === "PENDING" && order.status === "DELIVERED" && (
            <TouchableOpacity style={s.codBtn} onPress={() => codMut.mutate()} disabled={codMut.isPending}>
              <Text style={s.codBtnText}>💵 Mark COD Paid</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default function AgentSecretOrdersScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"active" | "past">("active");

  const { data: orders = [], isLoading, refetch } = useQuery<SecretOrder[]>({
    queryKey: ["agent-secret-orders", tab],
    queryFn: () => api.get(`/api/agent/secret-orders?status=${tab === "active" ? "active" : "past"}`) as any,
    enabled: !!user,
  });

  return (
    <View style={s.screen}>
      {/* Tabs */}
      <View style={s.tabs}>
        {(["active", "past"] as const).map((t) => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === "active" ? "Active Orders" : "Past Orders"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        onRefresh={refetch}
        refreshing={isLoading}
        contentContainerStyle={orders.length === 0 ? s.emptyWrap : s.list}
        ListEmptyComponent={
          isLoading ? <View style={s.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View> : (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🛍️</Text>
              <Text style={s.emptyTitle}>No {tab} orders</Text>
            </View>
          )
        }
        renderItem={({ item }) => <OrderCard order={item} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: BRAND_PRIMARY },
  tabText: { fontSize: 13, fontWeight: "600", color: BRAND_MUTED },
  tabTextActive: { color: BRAND_PRIMARY },
  list: { padding: 16, gap: 12 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  card: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  orderId: { fontSize: 12, fontFamily: "monospace", fontWeight: "700", color: "#111" },
  shopName: { fontSize: 14, fontWeight: "700", color: "#111", marginTop: 2 },
  cardHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 9, fontWeight: "700" },
  orderTotal: { fontSize: 14, fontWeight: "800", color: "#111" },
  chevron: { fontSize: 11, color: BRAND_MUTED },
  details: { padding: 14, borderTopWidth: 1, borderTopColor: "#f3f4f6", gap: 8 },
  detailText: { fontSize: 12, color: "#4b5563" },
  itemRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9fafb", borderRadius: 10, padding: 10, gap: 10, marginTop: 4 },
  itemImg: { width: 40, height: 40, borderRadius: 8 },
  itemImgPlaceholder: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 12, fontWeight: "700", color: "#111" },
  itemMeta: { fontSize: 11, color: BRAND_MUTED, marginTop: 1 },
  rejectItemBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5, borderColor: "#ef4444" },
  rejectItemText: { fontSize: 11, color: "#ef4444", fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  actionBtn: { flex: 1, minWidth: 120, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  advanceBtn: { backgroundColor: `${BRAND_PRIMARY}18` },
  cancelBtn: { borderWidth: 1.5, borderColor: "#ef4444" },
  actionBtnText: { fontSize: 12, fontWeight: "700", color: BRAND_PRIMARY },
  cancelBtnText: { color: "#ef4444" },
  codBtn: { height: 42, borderRadius: 10, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", marginTop: 8 },
  codBtnText: { fontSize: 13, fontWeight: "700", color: "#15803d" },
});
