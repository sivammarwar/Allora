import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, Image,
  TouchableOpacity, ActivityIndicator, Alert,
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
  createdAt: string; items: SecretOrderItem[];
}

const STATUS_LABELS: Record<string, string> = {
  PLACED: "Placed", RECEIVED: "Received", PACKED: "Packed",
  OUT_FOR_DELIVERY: "Out for Delivery", DELIVERED: "Delivered", CANCELLED: "Cancelled",
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PLACED:           { bg: "#dbeafe", text: "#1d4ed8" },
  RECEIVED:         { bg: "#ede9fe", text: "#6d28d9" },
  PACKED:           { bg: "#fef9c3", text: "#854d0e" },
  OUT_FOR_DELIVERY: { bg: "#fff7ed", text: "#c2410c" },
  DELIVERED:        { bg: "#dcfce7", text: "#15803d" },
  CANCELLED:        { bg: "#fee2e2", text: "#b91c1c" },
};
const STEPS = ["PLACED", "RECEIVED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];

function ProgressBar({ status }: { status: string }) {
  const idx = STEPS.indexOf(status);
  if (idx < 0) return null;
  return (
    <View style={styles.progress}>
      {STEPS.map((s, i) => (
        <View key={s} style={styles.progressStep}>
          <View style={[styles.progressDot, i <= idx && styles.progressDotActive]} />
          {i < STEPS.length - 1 && (
            <View style={[styles.progressLine, i < idx && styles.progressLineActive]} />
          )}
          <Text style={[styles.progressLabel, i <= idx && styles.progressLabelActive]} numberOfLines={2}>
            {STATUS_LABELS[s] ?? s}
          </Text>
        </View>
      ))}
    </View>
  );
}

function OrderCard({ order }: { order: SecretOrder }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const cancelMut = useMutation({
    mutationFn: () => api.patch(`/api/secret-shop/orders/${order.id}/cancel`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["secret-shop-orders"] }),
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Cannot cancel."),
  });

  const sc = STATUS_COLORS[order.status] ?? { bg: "#f3f4f6", text: "#374151" };

  return (
    <View style={styles.orderCard}>
      <TouchableOpacity style={styles.orderHeader} onPress={() => setOpen(!open)}>
        <View style={styles.orderLeft}>
          <Text style={styles.orderId}>#{order.id.slice(-8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
          </Text>
        </View>
        <View style={styles.orderRight}>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{STATUS_LABELS[order.status] ?? order.status}</Text>
          </View>
          <Text style={styles.orderTotal}>₹{Number(order.totalAmount).toFixed(0)}</Text>
          <Text style={styles.chevron}>{open ? "▲" : "▼"}</Text>
        </View>
      </TouchableOpacity>

      {open && (
        <View style={styles.orderDetails}>
          <ProgressBar status={order.status} />

          {order.items.map((oi) => (
            <View key={oi.id} style={styles.orderItem}>
              {oi.inventoryItem.item.imageUrl ? (
                <Image source={{ uri: oi.inventoryItem.item.imageUrl }} style={styles.orderItemImg} />
              ) : (
                <View style={styles.orderItemImgPlaceholder}><Text>📦</Text></View>
              )}
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName}>{oi.inventoryItem.item.name}</Text>
                <Text style={styles.orderItemMeta}>
                  {oi.quantity} × ₹{oi.unitPrice}
                  {oi.isRejected && " · Rejected"}
                  {oi.isPacked && !oi.isRejected && " · Packed ✓"}
                </Text>
              </View>
              <Text style={styles.orderItemTotal}>₹{(oi.quantity * oi.unitPrice).toFixed(0)}</Text>
            </View>
          ))}

          {order.notes && (
            <Text style={styles.orderNotes}>📝 {order.notes}</Text>
          )}

          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Payment</Text>
            <View style={styles.payBadges}>
              <View style={styles.payBadge}><Text style={styles.payBadgeText}>{order.paymentMode}</Text></View>
              <View style={[styles.payBadge, {
                backgroundColor: order.paymentStatus === "PAID" ? "#dcfce7" : order.paymentStatus === "FAILED" ? "#fee2e2" : "#fef9c3",
              }]}>
                <Text style={[styles.payBadgeText, {
                  color: order.paymentStatus === "PAID" ? "#15803d" : order.paymentStatus === "FAILED" ? "#b91c1c" : "#854d0e",
                }]}>{order.paymentStatus}</Text>
              </View>
            </View>
          </View>

          {order.status === "PLACED" && (
            <TouchableOpacity
              style={[styles.cancelBtn, cancelMut.isPending && styles.btnDisabled]}
              onPress={() => Alert.alert("Cancel order?", undefined, [
                { text: "No", style: "cancel" },
                { text: "Yes, cancel", style: "destructive", onPress: () => cancelMut.mutate() },
              ])}
              disabled={cancelMut.isPending}
            >
              <Text style={styles.cancelText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default function SecretShopOrdersScreen() {
  const { user } = useAuth();

  const { data: orders = [], isLoading, refetch } = useQuery<SecretOrder[]>({
    queryKey: ["secret-shop-orders"],
    queryFn: () => api.get("/api/secret-shop/orders") as any,
    enabled: !!user,
  });

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o.id}
      style={styles.screen}
      contentContainerStyle={orders.length === 0 ? styles.emptyWrap : styles.list}
      onRefresh={refetch}
      refreshing={isLoading}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛍️</Text>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySub}>Place your first order from the shop.</Text>
        </View>
      }
      renderItem={({ item }) => <OrderCard order={item} />}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 12 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  orderCard: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  orderLeft: {},
  orderId: { fontSize: 13, fontWeight: "800", color: "#111" },
  orderDate: { fontSize: 11, color: BRAND_MUTED, marginTop: 2 },
  orderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: "700" },
  orderTotal: { fontSize: 14, fontWeight: "800", color: "#111" },
  chevron: { fontSize: 11, color: BRAND_MUTED },
  orderDetails: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  progress: { flexDirection: "row", paddingVertical: 16 },
  progressStep: { flex: 1, alignItems: "center" },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#e5e7eb", marginBottom: 4 },
  progressDotActive: { backgroundColor: BRAND_PRIMARY },
  progressLine: { position: "absolute", top: 4, left: "50%", right: "-50%", height: 2, backgroundColor: "#e5e7eb" },
  progressLineActive: { backgroundColor: BRAND_PRIMARY },
  progressLabel: { fontSize: 8, color: BRAND_MUTED, textAlign: "center" },
  progressLabelActive: { color: BRAND_PRIMARY, fontWeight: "700" },
  orderItem: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6" },
  orderItemImg: { width: 44, height: 44, borderRadius: 8 },
  orderItemImgPlaceholder: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  orderItemInfo: { flex: 1 },
  orderItemName: { fontSize: 12, fontWeight: "700", color: "#111" },
  orderItemMeta: { fontSize: 11, color: BRAND_MUTED, marginTop: 2 },
  orderItemTotal: { fontSize: 13, fontWeight: "700", color: "#111" },
  orderNotes: { fontSize: 12, color: BRAND_MUTED, marginTop: 10, marginBottom: 6, fontStyle: "italic" },
  payRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  payLabel: { fontSize: 12, fontWeight: "700", color: "#374151" },
  payBadges: { flexDirection: "row", gap: 6 },
  payBadge: { backgroundColor: "#f3f4f6", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  payBadgeText: { fontSize: 10, fontWeight: "700", color: "#374151" },
  cancelBtn: { marginTop: 12, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: "#ef4444", alignItems: "center", justifyContent: "center" },
  btnDisabled: { opacity: 0.5 },
  cancelText: { color: "#ef4444", fontSize: 13, fontWeight: "700" },
});
