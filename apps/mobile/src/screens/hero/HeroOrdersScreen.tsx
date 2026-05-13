import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Alert, Linking, Modal, ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { connectNotifications } from "../../lib/socket";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface OrderItem {
  id: string; orderId: string; quantity: number; unitPrice: string; deliveryCharge: string;
  subOrderStatus: "PENDING" | "PACKED" | "ASSIGNED_DELIVERY" | "DELIVERED";
  createdAt: string;
  order: {
    id: string; status: string; paymentMethod: "ONLINE" | "COD"; paymentStatus: "PENDING" | "PAID";
    deliveryAddress: string; deliveryLat: number; deliveryLng: number;
    user: { id: string; name: string | null; phone: string | null; email: string };
    notes: string | null;
  };
  product: { id: string; name: string; imageUrl: string | null } | null;
  subcategory: { id: string; name: string } | null;
  assignedDeliveryBoy: { id: string; phone: string; user: { name: string | null } } | null;
}

interface DeliveryBoy { id: string; phone: string; user: { name: string | null; email: string } }

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending", PACKED: "Packed",
  ASSIGNED_DELIVERY: "Out for delivery", DELIVERED: "Delivered",
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING:           { bg: "#fef9c3", text: "#854d0e" },
  PACKED:            { bg: `${BRAND_PRIMARY}18`, text: BRAND_PRIMARY },
  ASSIGNED_DELIVERY: { bg: "#fff7ed", text: "#c2410c" },
  DELIVERED:         { bg: "#dcfce7", text: "#15803d" },
};

function groupByOrder(items: OrderItem[]) {
  const map = new Map<string, OrderItem[]>();
  for (const i of items) {
    const arr = map.get(i.orderId) ?? [];
    arr.push(i);
    map.set(i.orderId, arr);
  }
  return Array.from(map.entries());
}

export default function HeroOrdersScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [assignFor, setAssignFor] = useState<OrderItem | null>(null);

  const { data: items = [], isLoading, refetch } = useQuery<OrderItem[]>({
    queryKey: ["hero-orders"],
    queryFn: () => api.get("/api/hero/orders") as any,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const { data: deliveryBoys = [] } = useQuery<DeliveryBoy[]>({
    queryKey: ["hero-delivery-boys"],
    queryFn: () => api.get("/api/hero/delivery-boys") as any,
    enabled: !!assignFor,
  });

  useEffect(() => {
    const refresh = () => qc.invalidateQueries({ queryKey: ["hero-orders"] });
    let cleanup: (() => void) | undefined;
    connectNotifications().then((s) => {
      s.on("order:new", refresh);
      s.on("payment:confirmed", refresh);
      cleanup = () => { s.off("order:new", refresh); s.off("payment:confirmed", refresh); };
    });
    return () => cleanup?.();
  }, [qc]);

  const packMut = useMutation({
    mutationFn: (itemId: string) => api.put(`/api/hero/orders/${itemId}/packed`) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hero-orders"] }),
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  const assignMut = useMutation({
    mutationFn: ({ itemId, deliveryBoyId }: { itemId: string; deliveryBoyId: string }) =>
      api.put(`/api/hero/orders/${itemId}/assign-delivery`, { deliveryBoyId }) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hero-orders"] }); setAssignFor(null); },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  const grouped = groupByOrder(items);

  if (isLoading) return <View style={s.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;

  return (
    <>
      <FlatList
        data={grouped}
        keyExtractor={([orderId]) => orderId}
        style={s.screen}
        contentContainerStyle={grouped.length === 0 ? s.emptyWrap : s.list}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📦</Text>
            <Text style={s.emptyTitle}>No orders yet</Text>
            <Text style={s.emptySub}>New orders will appear here in real time.</Text>
          </View>
        }
        renderItem={({ item: [orderId, orderItems] }) => {
          const ord = orderItems[0].order;
          return (
            <View style={s.card}>
              {/* Header */}
              <View style={s.cardHeader}>
                <Text style={s.orderId}>#{orderId.slice(-8).toUpperCase()}</Text>
                <View style={[s.payBadge, { backgroundColor: ord.paymentStatus === "PAID" ? "#dcfce7" : "#fef9c3" }]}>
                  <Text style={[s.payBadgeText, { color: ord.paymentStatus === "PAID" ? "#15803d" : "#854d0e" }]}>
                    {ord.paymentMethod} · {ord.paymentStatus}
                  </Text>
                </View>
              </View>

              {/* Customer */}
              <View style={s.customerRow}>
                <Text style={s.customerName}>{ord.user.name ?? ord.user.email}</Text>
                {ord.user.phone && (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${ord.user.phone}`)}>
                    <Text style={s.phoneLink}>📞 {ord.user.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={s.address}>📍 {ord.deliveryAddress}</Text>
              {ord.notes && <Text style={s.notes}>📝 {ord.notes}</Text>}

              {/* Items */}
              {orderItems.map((it) => {
                const sc = STATUS_COLORS[it.subOrderStatus] ?? { bg: "#f3f4f6", text: "#374151" };
                return (
                  <View key={it.id} style={s.itemRow}>
                    {it.product?.imageUrl ? (
                      <Image source={{ uri: it.product.imageUrl }} style={s.itemImg} />
                    ) : (
                      <View style={s.itemImgPlaceholder}><Text>📦</Text></View>
                    )}
                    <View style={s.itemInfo}>
                      <Text style={s.itemName}>{it.product?.name ?? it.subcategory?.name ?? "Item"}</Text>
                      <Text style={s.itemMeta}>
                        Qty {it.quantity} · ₹{Number(it.unitPrice)}
                        {Number(it.deliveryCharge) > 0 ? ` · delivery ₹${Number(it.deliveryCharge)}` : ""}
                      </Text>
                    </View>
                    <View style={[s.statusPill, { backgroundColor: sc.bg }]}>
                      <Text style={[s.statusText, { color: sc.text }]}>{STATUS_LABELS[it.subOrderStatus]}</Text>
                    </View>
                  </View>
                );
              })}

              {/* Actions */}
              <View style={s.actionsRow}>
                {orderItems.filter((it) => it.subOrderStatus === "PENDING").map((it) => (
                  <TouchableOpacity key={it.id} style={s.packBtn}
                    onPress={() => Alert.alert("Mark as packed?", it.product?.name ?? "item", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Pack ✓", onPress: () => packMut.mutate(it.id) },
                    ])}
                  >
                    <Text style={s.packBtnText}>📦 Pack</Text>
                  </TouchableOpacity>
                ))}
                {orderItems.filter((it) => it.subOrderStatus === "PACKED" && Number(it.deliveryCharge) > 0 && !it.assignedDeliveryBoy).map((it) => (
                  <TouchableOpacity key={it.id} style={s.assignBtn} onPress={() => setAssignFor(it)}>
                    <Text style={s.assignBtnText}>🚴 Assign Delivery</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        }}
      />

      {/* Assign Delivery Modal */}
      <Modal visible={!!assignFor} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAssignFor(null)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Assign Delivery Partner</Text>
            <TouchableOpacity onPress={() => setAssignFor(null)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody}>
            {deliveryBoys.length === 0 ? (
              <Text style={s.emptySub}>No delivery partners linked to your shop yet.</Text>
            ) : (
              deliveryBoys.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={s.dbRow}
                  onPress={() => assignFor && assignMut.mutate({ itemId: assignFor.id, deliveryBoyId: d.id })}
                  disabled={assignMut.isPending}
                >
                  <View style={s.dbIcon}><Text style={s.dbIconText}>🚴</Text></View>
                  <View style={s.dbInfo}>
                    <Text style={s.dbName}>{d.user.name ?? d.user.email}</Text>
                    <Text style={s.dbPhone}>{d.phone}</Text>
                  </View>
                  {assignMut.isPending ? <ActivityIndicator size="small" color={BRAND_PRIMARY} /> : <Text style={s.dbChevron}>›</Text>}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 12 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderId: { fontFamily: "monospace", fontSize: 12, fontWeight: "700", color: "#111" },
  payBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  payBadgeText: { fontSize: 10, fontWeight: "700" },
  customerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  customerName: { fontSize: 14, fontWeight: "700", color: "#111" },
  phoneLink: { fontSize: 12, color: BRAND_PRIMARY, fontWeight: "600" },
  address: { fontSize: 12, color: BRAND_MUTED, marginBottom: 4 },
  notes: { fontSize: 12, color: BRAND_MUTED, fontStyle: "italic", marginBottom: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9fafb", borderRadius: 10, padding: 10, marginTop: 8, gap: 10 },
  itemImg: { width: 44, height: 44, borderRadius: 8 },
  itemImgPlaceholder: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: "600", color: "#111" },
  itemMeta: { fontSize: 11, color: BRAND_MUTED, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 14, flexWrap: "wrap" },
  packBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: `${BRAND_PRIMARY}18` },
  packBtnText: { fontSize: 13, fontWeight: "700", color: BRAND_PRIMARY },
  assignBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: "#dcfce7" },
  assignBtnText: { fontSize: 13, fontWeight: "700", color: "#15803d" },
  modal: { flex: 1, backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  modalClose: { fontSize: 20, color: BRAND_MUTED, padding: 4 },
  modalBody: { padding: 16, gap: 10 },
  dbRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9fafb", borderRadius: 14, padding: 14, gap: 12 },
  dbIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: `${BRAND_PRIMARY}18`, alignItems: "center", justifyContent: "center" },
  dbIconText: { fontSize: 20 },
  dbInfo: { flex: 1 },
  dbName: { fontSize: 14, fontWeight: "700", color: "#111" },
  dbPhone: { fontSize: 12, color: BRAND_MUTED, marginTop: 2 },
  dbChevron: { fontSize: 22, color: BRAND_MUTED },
});
