import React from "react";
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import type { UserStackParams } from "../../navigation/types";

type Props = NativeStackScreenProps<UserStackParams, "OrderDetail">;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  IN_PROGRESS: "#8b5cf6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Waiting for hero",
  CONFIRMED: "Hero confirmed",
  IN_PROGRESS: "Service in progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function OrderDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery<any>({
    queryKey: ["order", id],
    queryFn: () => api.get(`/api/user/bookings/${id}`) as any,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.patch(`/api/user/bookings/${id}/cancel`) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      Alert.alert("Cancelled", "Your booking has been cancelled.");
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Cannot cancel."),
  });

  const handleCancel = () => {
    Alert.alert("Cancel booking?", "This action cannot be undone.", [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel booking", style: "destructive", onPress: () => cancelMutation.mutate() },
    ]);
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Order not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[order.status] ?? "#9ca3af";

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>

      {/* Status banner */}
      <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
        <Text style={styles.statusEmoji}>
          {order.status === "COMPLETED" ? "✅" : order.status === "CANCELLED" ? "❌" : "⏳"}
        </Text>
        <View>
          <Text style={styles.statusLabel}>{STATUS_LABELS[order.status] ?? order.status}</Text>
          <Text style={styles.statusSub}>Booking #{order.id.slice(-6).toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Service */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service</Text>
          <Text style={styles.bigText}>{order.subcategory?.name ?? "Service"}</Text>
          <Text style={styles.meta}>{order.subcategory?.category?.name}</Text>
        </View>

        <View style={styles.divider} />

        {/* Hero */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hero</Text>
          {order.hero ? (
            <View style={styles.heroRow}>
              <View style={styles.heroAvatar}>
                <Text style={styles.heroInitial}>{(order.hero.name ?? "H")[0].toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.bigText}>{order.hero.name ?? "Hero"}</Text>
                <Text style={styles.meta}>{order.hero.email}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.meta}>Hero not assigned yet</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scheduled</Text>
          <Text style={styles.bigText}>
            {order.scheduledAt
              ? new Date(order.scheduledAt).toLocaleDateString("en-IN", { dateStyle: "full" })
              : "To be confirmed"}
          </Text>
          {order.scheduledAt && (
            <Text style={styles.meta}>
              {new Date(order.scheduledAt).toLocaleTimeString("en-IN", { timeStyle: "short" })}
            </Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Service charge</Text>
            <Text style={styles.priceVal}>₹{order.baseCharge ?? "—"}</Text>
          </View>
          {order.transportCharge > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Transport</Text>
              <Text style={styles.priceVal}>₹{order.transportCharge}</Text>
            </View>
          )}
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>₹{order.totalCharge ?? "—"}</Text>
          </View>
          <View style={styles.payStatusRow}>
            <View style={[styles.payBadge, { backgroundColor: order.isPaid ? "#dcfce7" : "#fef9c3" }]}>
              <Text style={[styles.payBadgeText, { color: order.isPaid ? "#16a34a" : "#854d0e" }]}>
                {order.isPaid ? "Paid" : "Payment pending"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Rate button for completed bookings */}
      {order.status === "COMPLETED" && !order.userReview && (
        <TouchableOpacity
          style={styles.rateBtn}
          onPress={() =>
            navigation.navigate("Rate", {
              bookingId: order.id,
              heroName: order.hero?.name ?? undefined,
              serviceName: order.subcategory?.name ?? undefined,
            })
          }
        >
          <Text style={styles.rateBtnText}>⭐ Leave a Review</Text>
        </TouchableOpacity>
      )}

      {/* Cancel button */}
      {["PENDING", "CONFIRMED"].includes(order.status) && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
          disabled={cancelMutation.isPending}
        >
          <Text style={styles.cancelText}>
            {cancelMutation.isPending ? "Cancelling…" : "Cancel Booking"}
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { fontSize: 16, color: BRAND_MUTED, marginBottom: 16 },
  backBtn: { paddingVertical: 10 },
  backText: { color: BRAND_PRIMARY, fontSize: 14, fontWeight: "600" },
  statusBanner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 20, paddingTop: 28,
  },
  statusEmoji: { fontSize: 36 },
  statusLabel: { color: "#fff", fontSize: 16, fontWeight: "700" },
  statusSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  body: { backgroundColor: "#fff", margin: 16, borderRadius: 20, overflow: "hidden" },
  section: { padding: 18 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: BRAND_MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  bigText: { fontSize: 17, fontWeight: "700", color: "#111" },
  meta: { fontSize: 13, color: BRAND_MUTED, marginTop: 2 },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginHorizontal: 18 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center",
  },
  heroInitial: { color: "#fff", fontSize: 18, fontWeight: "700" },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  priceLabel: { fontSize: 14, color: BRAND_MUTED },
  priceVal: { fontSize: 14, color: "#111", fontWeight: "500" },
  totalRow: { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: "700", color: "#111" },
  totalVal: { fontSize: 17, fontWeight: "800", color: BRAND_PRIMARY },
  payStatusRow: { marginTop: 6 },
  payBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  payBadgeText: { fontSize: 12, fontWeight: "700" },
  rateBtn: {
    marginHorizontal: 16, marginTop: 8, height: 50,
    borderRadius: 14, backgroundColor: "#f59e0b",
    alignItems: "center", justifyContent: "center",
  },
  rateBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cancelBtn: {
    marginHorizontal: 16, marginTop: 8, height: 50,
    borderRadius: 14, borderWidth: 1.5, borderColor: "#ef4444",
    alignItems: "center", justifyContent: "center",
  },
  cancelText: { color: "#ef4444", fontSize: 15, fontWeight: "700" },
});
