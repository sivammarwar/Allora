import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";

interface Booking {
  id: string;
  status: string;
  charge: string;
  transportCharge: string;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  hero: {
    id: string;
    shopName: string | null;
    serviceName: string | null;
    phone: string;
    user: { name: string | null; email: string };
  };
  subcategory: { id: string; name: string };
  order: {
    id: string;
    totalAmount: string;
    paymentStatus: string;
    user: { id: string; name: string | null; email: string };
  };
}

type Tab = "COMPLETED" | "CANCELLED";

export default function AgentBookingHistoryScreen() {
  const [tab, setTab] = useState<Tab>("COMPLETED");

  const { data: bookings = [], isLoading, refetch } = useQuery<Booking[]>({
    queryKey: ["agent", "booking-history", tab],
    queryFn: () => api.get(`/api/agent/booking-history?status=${tab}`) as Promise<Booking[]>,
  });

  return (
    <View style={s.screen}>
      {/* Tabs */}
      <View style={s.tabs}>
        {(["COMPLETED", "CANCELLED"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === "COMPLETED" ? "✅ Service Successful" : "❌ Service Canceled"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          onRefresh={refetch}
          refreshing={isLoading}
          contentContainerStyle={bookings.length === 0 ? s.emptyWrap : s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>{tab === "COMPLETED" ? "📋" : "🚫"}</Text>
              <Text style={s.emptyTitle}>
                {tab === "COMPLETED" ? "No completed bookings yet" : "No canceled bookings"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const heroName = item.hero.shopName ?? item.hero.serviceName ?? item.hero.user.name ?? "Hero";
            const customerName = item.order.user.name ?? item.order.user.email;
            const charge = Number(item.charge) + Number(item.transportCharge);
            const date = new Date(item.completedAt ?? item.createdAt);
            const isCompleted = item.status === "COMPLETED";

            return (
              <View style={s.card}>
                <View style={s.cardRow}>
                  <View style={[s.statusDot, { backgroundColor: isCompleted ? "#22c55e" : "#ef4444" }]} />
                  <View style={s.cardInfo}>
                    <Text style={s.serviceName}>{item.subcategory.name}</Text>
                    <Text style={s.meta}>Hero: {heroName}</Text>
                    <Text style={s.meta}>Customer: {customerName}</Text>
                    <Text style={s.meta}>
                      {date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      {" · "}
                      {date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                  <View style={s.cardRight}>
                    <Text style={[s.amount, { color: isCompleted ? "#16a34a" : "#ef4444" }]}>
                      ₹{charge.toFixed(0)}
                    </Text>
                    <View style={[s.payBadge, {
                      backgroundColor: item.order.paymentStatus === "PAID" ? "#dcfce7" : "#fef9c3",
                    }]}>
                      <Text style={[s.payBadgeText, {
                        color: item.order.paymentStatus === "PAID" ? "#15803d" : "#854d0e",
                      }]}>
                        {item.order.paymentStatus}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabs: {
    flexDirection: "row", backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  tab: {
    flex: 1, paddingVertical: 14, alignItems: "center",
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: BRAND_PRIMARY },
  tabText: { fontSize: 13, fontWeight: "600", color: BRAND_MUTED },
  tabTextActive: { color: BRAND_PRIMARY },
  list: { padding: 16, gap: 10 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  cardRow: { flexDirection: "row", alignItems: "flex-start" },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, marginRight: 12 },
  cardInfo: { flex: 1 },
  serviceName: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 4 },
  meta: { fontSize: 12, color: BRAND_MUTED, marginTop: 1 },
  cardRight: { alignItems: "flex-end" },
  amount: { fontSize: 16, fontWeight: "800" },
  payBadge: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  payBadgeText: { fontSize: 9, fontWeight: "700" },
});
