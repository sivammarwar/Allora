import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface SecretOrderItem {
  id: string; quantity: number; unitPrice: number; isRejected: boolean;
  inventoryItem: { item: { name: string; brandName: string | null } };
}
interface SecretOrder {
  id: string; status: string; totalAmount: number;
  paymentMode: "COD" | "ONLINE"; paymentStatus: "PENDING" | "PAID" | "FAILED";
  createdAt: string;
  shop: { id: string; shopName: string; phone: string };
  items: SecretOrderItem[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PLACED:           { bg: "#dbeafe", text: "#1d4ed8" },
  RECEIVED:         { bg: "#ede9fe", text: "#6d28d9" },
  PACKED:           { bg: "#fef9c3", text: "#854d0e" },
  OUT_FOR_DELIVERY: { bg: "#fff7ed", text: "#c2410c" },
  DELIVERED:        { bg: "#dcfce7", text: "#15803d" },
  CANCELLED:        { bg: "#fee2e2", text: "#b91c1c" },
};
const PAY_COLORS: Record<string, { bg: string; text: string }> = {
  PAID:    { bg: "#dcfce7", text: "#15803d" },
  FAILED:  { bg: "#fee2e2", text: "#b91c1c" },
  PENDING: { bg: "#fef9c3", text: "#854d0e" },
};

function effectiveTotal(items: SecretOrderItem[]) {
  return items.filter((i) => !i.isRejected).reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0);
}

export default function AgentPaymentHistoryScreen() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading, refetch } = useQuery<SecretOrder[]>({
    queryKey: ["agent-payment-history"],
    queryFn: () => api.get("/api/agent/secret-orders?all=true") as any,
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter((o) =>
      o.shop.shopName.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) ||
      o.shop.phone.includes(q)
    );
  }, [orders, search]);

  const totalPaid = useMemo(() =>
    orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + effectiveTotal(o.items), 0),
    [orders]
  );
  const totalPending = useMemo(() =>
    orders.filter((o) => o.paymentStatus === "PENDING" && o.status !== "CANCELLED").reduce((s, o) => s + effectiveTotal(o.items), 0),
    [orders]
  );

  return (
    <View style={s.screen}>
      {/* Summary banner */}
      <View style={s.summaryBar}>
        <View style={s.summaryItem}>
          <Text style={s.summaryVal}>₹{totalPaid.toFixed(0)}</Text>
          <Text style={s.summaryLabel}>Collected</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={[s.summaryVal, { color: "#f59e0b" }]}>₹{totalPending.toFixed(0)}</Text>
          <Text style={s.summaryLabel}>Pending</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryVal}>{orders.length}</Text>
          <Text style={s.summaryLabel}>Total Orders</Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by shop, order ID…"
          placeholderTextColor="#9ca3af"
          clearButtonMode="while-editing"
        />
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.id}
          onRefresh={refetch}
          refreshing={isLoading}
          contentContainerStyle={filtered.length === 0 ? s.emptyWrap : s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>💳</Text>
              <Text style={s.emptyTitle}>No payment records</Text>
            </View>
          }
          renderItem={({ item: o }) => {
            const sc  = STATUS_COLORS[o.status]        ?? { bg: "#f3f4f6", text: "#374151" };
            const pc  = PAY_COLORS[o.paymentStatus]    ?? { bg: "#f3f4f6", text: "#374151" };
            const amt = effectiveTotal(o.items);
            return (
              <View style={s.row}>
                <View style={s.rowLeft}>
                  <Text style={s.rowShop}>{o.shop.shopName}</Text>
                  <Text style={s.rowId}>#{o.id.slice(-8).toUpperCase()} · {new Date(o.createdAt).toLocaleDateString("en-IN")}</Text>
                  <View style={s.badges}>
                    <View style={[s.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[s.badgeText, { color: sc.text }]}>{o.status.replace(/_/g, " ")}</Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: pc.bg }]}>
                      <Text style={[s.badgeText, { color: pc.text }]}>{o.paymentMode} · {o.paymentStatus}</Text>
                    </View>
                  </View>
                </View>
                <Text style={[s.rowAmt, { color: o.paymentStatus === "PAID" ? "#16a34a" : o.paymentStatus === "FAILED" ? "#ef4444" : "#f59e0b" }]}>
                  ₹{amt.toFixed(0)}
                </Text>
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
  summaryBar: { flexDirection: "row", backgroundColor: "#fff", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryVal: { fontSize: 18, fontWeight: "800", color: "#111" },
  summaryLabel: { fontSize: 10, color: BRAND_MUTED, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: "#f3f4f6" },
  searchWrap: { padding: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  searchInput: { backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 14, height: 42, fontSize: 14, color: "#111" },
  list: { padding: 16, gap: 10 },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 12, shadowColor: "#000", shadowOpacity: 0.04, elevation: 2 },
  rowLeft: { flex: 1 },
  rowShop: { fontSize: 14, fontWeight: "700", color: "#111" },
  rowId: { fontSize: 11, color: BRAND_MUTED, marginTop: 2, fontFamily: "monospace" },
  badges: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 9, fontWeight: "700" },
  rowAmt: { fontSize: 16, fontWeight: "800" },
});
