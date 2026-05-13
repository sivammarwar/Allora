import React, { useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Linking,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Geolocation from "@react-native-community/geolocation";
import { api } from "../../lib/api";
import { connectNotifications, connectService } from "../../lib/socket";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface DeliveryItem {
  id: string;
  orderId: string;
  unitPrice: string;
  quantity: number;
  deliveryCharge: string;
  subOrderStatus: "ASSIGNED_DELIVERY" | "DELIVERED" | string;
  order: {
    paymentMethod: "ONLINE" | "COD";
    deliveryAddress: string;
    deliveryLat: number;
    deliveryLng: number;
    user: { name: string | null; phone: string | null; email: string };
  };
  hero: {
    id: string;
    shopName: string | null;
    serviceName: string;
    phone: string;
    address: string;
    locationLat: number;
    locationLng: number;
  };
  product: { name: string; imageUrl: string | null } | null;
  subcategory: { name: string } | null;
}

function openMaps(lat: number, lng: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  Linking.openURL(url).catch(() =>
    Alert.alert("Error", "Could not open maps.")
  );
}

function callPhone(phone: string) {
  Linking.openURL(`tel:${phone}`);
}

export default function DeliveryOrdersScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [], isLoading, refetch } = useQuery<DeliveryItem[]>({
    queryKey: ["delivery-orders"],
    queryFn: () => api.get("/api/delivery/orders") as any,
    enabled: !!user,
    refetchInterval: 30_000,
  });

  // Socket: new delivery assigned
  useEffect(() => {
    let socket: any;
    (async () => {
      socket = await connectNotifications();
      socket.on("delivery:assigned", () =>
        qc.invalidateQueries({ queryKey: ["delivery-orders"] })
      );
    })();
    return () => { socket?.off("delivery:assigned"); };
  }, [qc]);

  // Live location tracking for active deliveries
  useEffect(() => {
    const activeItems = items.filter((i) => i.subOrderStatus === "ASSIGNED_DELIVERY");
    if (activeItems.length === 0) return;

    let trackSocket: any;
    let watchId: number;

    (async () => {
      trackSocket = await connectService();
      watchId = Geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          for (const item of activeItems) {
            trackSocket.emit("delivery:location", {
              orderId: item.orderId,
              lat,
              lng,
            });
          }
        },
        () => {},
        { enableHighAccuracy: true, interval: 8000 }
      );
    })();

    return () => {
      if (watchId != null) Geolocation.clearWatch(watchId);
    };
  }, [items]);

  const markDelivered = useMutation({
    mutationFn: (id: string) => api.put(`/api/delivery/orders/${id}/delivered`) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery-orders"] });
      Alert.alert("✅ Delivered", "Order marked as delivered.");
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed to update."),
  });

  const active = items.filter((i) => i.subOrderStatus !== "DELIVERED");
  const past   = items.filter((i) => i.subOrderStatus === "DELIVERED");

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }

  return (
    <FlatList
      data={active}
      keyExtractor={(i) => i.id}
      style={styles.screen}
      contentContainerStyle={active.length === 0 ? styles.emptyWrap : styles.list}
      onRefresh={refetch}
      refreshing={isLoading}
      ListHeaderComponent={active.length > 0 ? (
        <Text style={styles.heading}>Active Deliveries ({active.length})</Text>
      ) : null}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🚴</Text>
          <Text style={styles.emptyTitle}>No active deliveries</Text>
          <Text style={styles.emptySub}>New jobs will appear here when assigned.</Text>
        </View>
      }
      ListFooterComponent={
        past.length > 0 ? (
          <View style={styles.pastSection}>
            <Text style={styles.pastHeading}>Past Deliveries ({past.length})</Text>
            {past.slice(0, 10).map((i) => (
              <View key={i.id} style={styles.pastCard}>
                <Text style={styles.pastOrderId}>#{i.orderId.slice(-8)}</Text>
                <Text style={styles.pastItem}>{i.product?.name ?? i.subcategory?.name}</Text>
                <Text style={styles.deliveredBadge}>DELIVERED</Text>
              </View>
            ))}
          </View>
        ) : null
      }
      renderItem={({ item }) => {
        const isCOD = item.order.paymentMethod === "COD";
        const amount = (Number(item.unitPrice) * item.quantity + Number(item.deliveryCharge)).toFixed(0);

        return (
          <View style={styles.card}>
            {/* Order ID + payment */}
            <View style={styles.cardTop}>
              <Text style={styles.orderId}>#{item.orderId.slice(-8)}</Text>
              <View style={[styles.payBadge, { backgroundColor: isCOD ? "#fef9c3" : "#dcfce7" }]}>
                <Text style={[styles.payText, { color: isCOD ? "#854d0e" : "#15803d" }]}>
                  {isCOD ? `COLLECT ₹${amount}` : "ONLINE PAID"}
                </Text>
              </View>
            </View>

            {/* Item */}
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>{item.product?.name ?? item.subcategory?.name}</Text>
              <Text style={styles.itemQty}>× {item.quantity}</Text>
            </View>

            {/* Pickup */}
            <View style={styles.locationBlock}>
              <Text style={styles.locationLabel}>PICKUP</Text>
              <Text style={styles.locationName}>{item.hero.shopName ?? item.hero.serviceName}</Text>
              <Text style={styles.locationAddr}>{item.hero.address}</Text>
              <View style={styles.locationActions}>
                <TouchableOpacity
                  style={styles.mapBtn}
                  onPress={() => openMaps(item.hero.locationLat, item.hero.locationLng)}
                >
                  <Text style={styles.mapBtnText}>📍 Navigate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => callPhone(item.hero.phone)}
                >
                  <Text style={styles.callBtnText}>📞 Call</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Drop-off */}
            <View style={styles.locationBlock}>
              <Text style={styles.locationLabel}>DROP-OFF</Text>
              <Text style={styles.locationName}>{item.order.user.name ?? item.order.user.email}</Text>
              <Text style={styles.locationAddr}>{item.order.deliveryAddress}</Text>
              <View style={styles.locationActions}>
                <TouchableOpacity
                  style={styles.mapBtn}
                  onPress={() => openMaps(item.order.deliveryLat, item.order.deliveryLng)}
                >
                  <Text style={styles.mapBtnText}>📍 Navigate</Text>
                </TouchableOpacity>
                {item.order.user.phone && (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => callPhone(item.order.user.phone!)}
                  >
                    <Text style={styles.callBtnText}>📞 {item.order.user.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.deliverBtn, markDelivered.isPending && styles.deliverBtnDisabled]}
              onPress={() => {
                Alert.alert("Mark as delivered?", "Confirm once you've handed off the order.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Confirm", onPress: () => markDelivered.mutate(item.id) },
                ]);
              }}
              disabled={markDelivered.isPending}
            >
              <Text style={styles.deliverBtnText}>
                {markDelivered.isPending ? "Updating…" : "✓ Mark Delivered"}
              </Text>
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 14 },
  emptyWrap: { flex: 1 },
  heading: { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 4 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  card: {
    backgroundColor: "#fff", borderRadius: 18, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, elevation: 3,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  orderId: { fontFamily: "monospace", fontSize: 12, color: BRAND_MUTED },
  payBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  payText: { fontSize: 10, fontWeight: "700" },
  itemRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  itemName: { flex: 1, fontSize: 15, fontWeight: "700", color: "#111" },
  itemQty: { fontSize: 13, color: BRAND_MUTED },
  locationBlock: {
    backgroundColor: "#f9fafb", borderRadius: 12, padding: 12, marginBottom: 10,
  },
  locationLabel: { fontSize: 9, fontWeight: "800", color: BRAND_PRIMARY, letterSpacing: 1.5, marginBottom: 4 },
  locationName: { fontSize: 14, fontWeight: "600", color: "#111" },
  locationAddr: { fontSize: 12, color: BRAND_MUTED, marginTop: 2 },
  locationActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  mapBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: BRAND_PRIMARY, alignItems: "center",
  },
  mapBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  callBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", alignItems: "center",
  },
  callBtnText: { color: "#15803d", fontSize: 12, fontWeight: "700" },
  deliverBtn: {
    marginTop: 6, height: 50, borderRadius: 14,
    backgroundColor: "#10b981", alignItems: "center", justifyContent: "center",
  },
  deliverBtnDisabled: { opacity: 0.5 },
  deliverBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  pastSection: { paddingTop: 20 },
  pastHeading: { fontSize: 14, fontWeight: "700", color: BRAND_MUTED, marginBottom: 10 },
  pastCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 10, padding: 12, marginBottom: 8, gap: 8,
  },
  pastOrderId: { fontFamily: "monospace", fontSize: 11, color: BRAND_MUTED },
  pastItem: { flex: 1, fontSize: 13, color: "#111" },
  deliveredBadge: { fontSize: 9, fontWeight: "800", color: "#10b981", letterSpacing: 1 },
});
