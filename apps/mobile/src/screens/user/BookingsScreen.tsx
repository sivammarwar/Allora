import React, { useState, useMemo } from "react";
import {
  View, Text, FlatList, StyleSheet, Modal, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";
import type { UserStackParams } from "../../navigation/types";

type NavProp = NativeStackNavigationProp<UserStackParams>;

interface ServiceRequest {
  id: string;
  status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED";
  scheduledDate: string;
  scheduledHour: number;
  charge: string;
  discountPercent: string;
  bulkDiscountPercent: string;
  transportCharge: string;
  createdAt: string;
  subcategory: { id: string; name: string; category: { id: string; name: string } };
  hero?: {
    id: string; serviceName: string | null; shopName: string | null;
    phone: string; gender: string | null; user: { name: string | null };
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  ACCEPTED: "#3b82f6",
  COMPLETED: "#10b981",
  CANCELLED: "#9ca3af",
};

function fmtHour(h: number) {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

function calcFinal(b: ServiceRequest) {
  const afterInd = Number(b.charge) * (1 - Number(b.discountPercent) / 100);
  return afterInd * (1 - Number(b.bulkDiscountPercent) / 100);
}

function heroName(h: ServiceRequest["hero"]) {
  if (!h) return null;
  return h.user?.name ?? h.serviceName ?? h.shopName ?? null;
}

interface BookingGroup {
  key: string;
  categoryName: string;
  scheduledDate: string;
  scheduledHour: number;
  hero: ServiceRequest["hero"];
  bookings: ServiceRequest[];
  totalFinal: number;
  groupStatus: string;
}

function groupBookings(list: ServiceRequest[]): BookingGroup[] {
  const map = new Map<string, BookingGroup>();
  for (const b of list) {
    const key = `${b.subcategory.category.id}__${b.scheduledDate}__${b.scheduledHour}__${b.hero?.id ?? "none"}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        categoryName: b.subcategory.category.name,
        scheduledDate: b.scheduledDate,
        scheduledHour: b.scheduledHour,
        hero: b.hero,
        bookings: [],
        totalFinal: 0,
        groupStatus: b.status,
      });
    }
    const g = map.get(key)!;
    g.totalFinal += calcFinal(b);
    g.bookings.push(b);
    if (["PENDING", "ACCEPTED"].includes(b.status)) g.groupStatus = b.status;
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  );
}

export default function BookingsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavProp>();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"active" | "history">("active");
  const [selected, setSelected] = useState<BookingGroup | null>(null);

  const { data: bookings = [], isLoading, refetch } = useQuery<ServiceRequest[]>({
    queryKey: ["service-requests"],
    queryFn: () => api.get("/api/user/service-requests") as any,
    enabled: !!user,
  });

  const cancelAllMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/api/user/service-requests/${id}`)));
    },
    onSuccess: () => {
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["service-requests"] });
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Could not cancel bookings."),
  });

  const handleCancelAll = (group: BookingGroup) => {
    const ids = group.bookings
      .filter((b) => ["PENDING", "ACCEPTED"].includes(b.status))
      .map((b) => b.id);
    Alert.alert(
      "Cancel all bookings",
      `Cancel all ${ids.length} booking${ids.length > 1 ? "s" : ""} in this session?`,
      [
        { text: "No", style: "cancel" },
        { text: "Cancel all", style: "destructive", onPress: () => cancelAllMutation.mutate(ids) },
      ]
    );
  };

  const activeGroups = useMemo(
    () => groupBookings(bookings.filter((b) => ["PENDING", "ACCEPTED"].includes(b.status))),
    [bookings]
  );
  const historyGroups = useMemo(
    () => groupBookings(bookings.filter((b) => ["COMPLETED", "CANCELLED"].includes(b.status))),
    [bookings]
  );
  const shown = tab === "active" ? activeGroups : historyGroups;

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.guestIcon}>📋</Text>
        <Text style={styles.guestTitle}>See your bookings</Text>
        <Text style={styles.guestSub}>Sign in to view and manage your service bookings.</Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => navigation.navigate("GuestLogin", { role: "USER" })}
        >
          <Text style={styles.loginBtnText}>Sign In →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Tabs */}
      <View style={[styles.tabs, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.tab, tab === "active" && styles.tabActive]}
          onPress={() => setTab("active")}
        >
          <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>
            Active{activeGroups.length > 0 ? ` (${activeGroups.length})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "history" && styles.tabActive]}
          onPress={() => setTab("history")}
        >
          <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(g) => g.key}
          contentContainerStyle={shown.length === 0 ? styles.emptyContainer : styles.listContent}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>
                {tab === "active" ? "No active bookings" : "No booking history"}
              </Text>
              <Text style={styles.emptySub}>
                {tab === "active"
                  ? "Book a service to see it here."
                  : "Completed and cancelled bookings appear here."}
              </Text>
            </View>
          }
          renderItem={({ item: g }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(g)} activeOpacity={0.85}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryName}>{g.categoryName}</Text>
                  <Text style={styles.subcategoryName} numberOfLines={2}>
                    {g.bookings.map((b) => b.subcategory.name).join(" · ")}
                  </Text>
                  <Text style={styles.heroName}>
                    {heroName(g.hero) ? `Provider: ${heroName(g.hero)}` : "Hero not assigned yet"}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[g.groupStatus] ?? "#9ca3af" }]}>
                  <Text style={styles.badgeText}>{g.groupStatus}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.meta}>
                  {new Date(g.scheduledDate).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                  {" · "}{fmtHour(g.scheduledHour)}
                </Text>
                <Text style={styles.price}>₹{g.totalFinal.toFixed(0)}</Text>
              </View>
              <Text style={styles.tapHint}>
                {g.bookings.length} service{g.bookings.length > 1 ? "s" : ""} · tap for details
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ── Detail modal ───────────────────────────────────────────── */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{selected?.categoryName}</Text>
                <Text style={styles.sheetSub}>
                  {selected
                    ? new Date(selected.scheduledDate).toLocaleDateString("en-IN", {
                        weekday: "long", day: "numeric", month: "long",
                      })
                    : ""}
                  {selected ? ` · ${fmtHour(selected.scheduledHour)}` : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {selected?.bookings.map((b) => {
                const afterInd = Number(b.charge) * (1 - Number(b.discountPercent) / 100);
                return (
                  <View key={b.id} style={styles.lineItem}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.lineItemName}>{b.subcategory.name}</Text>
                      <View style={[styles.lineBadge, { backgroundColor: STATUS_COLORS[b.status] ?? "#9ca3af" }]}>
                        <Text style={styles.lineBadgeText}>{b.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.lineItemPrice}>₹{afterInd.toFixed(0)}</Text>
                  </View>
                );
              })}

              {selected && (() => {
                const bulkPct = Number(selected.bookings[0]?.bulkDiscountPercent ?? 0);
                if (bulkPct <= 0) return null;
                const subtotal = selected.bookings.reduce(
                  (s, b) => s + Number(b.charge) * (1 - Number(b.discountPercent) / 100), 0
                );
                return (
                  <View style={styles.summaryRow}>
                    <Text style={styles.bulkLabel}>Bulk discount ({bulkPct}% off)</Text>
                    <Text style={styles.bulkSaving}>−₹{(subtotal * bulkPct / 100).toFixed(0)}</Text>
                  </View>
                );
              })()}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>₹{selected?.totalFinal.toFixed(0)}</Text>
              </View>

              {selected?.hero && (
                <View style={styles.heroBox}>
                  <Text style={styles.heroBoxTitle}>Your provider</Text>
                  <Text style={styles.heroBoxName}>{heroName(selected.hero)}</Text>
                  <Text style={styles.heroBoxPhone}>{selected.hero.phone}</Text>
                </View>
              )}
            </ScrollView>

            {selected && cancellableIds(selected).length > 0 && (
              <TouchableOpacity
                style={[styles.cancelAllBtn, cancelAllMutation.isPending && { opacity: 0.6 }]}
                onPress={() => handleCancelAll(selected)}
                disabled={cancelAllMutation.isPending}
                activeOpacity={0.85}
              >
                {cancelAllMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.cancelAllText}>
                      Cancel all {cancellableIds(selected).length} booking{cancellableIds(selected).length > 1 ? "s" : ""}
                    </Text>
                }
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function cancellableIds(g: BookingGroup) {
  return g.bookings.filter((b) => ["PENDING", "ACCEPTED"].includes(b.status)).map((b) => b.id);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabs: {
    flexDirection: "row", backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  tab: {
    flex: 1, paddingVertical: 13, alignItems: "center",
    borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: BRAND_PRIMARY },
  tabText: { fontSize: 14, fontWeight: "600", color: BRAND_MUTED },
  tabTextActive: { color: BRAND_PRIMARY },
  listContent: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  categoryName: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 2 },
  subcategoryName: { fontSize: 12, color: "#374151", marginBottom: 3 },
  heroName: { fontSize: 12, color: BRAND_MUTED },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  meta: { fontSize: 12, color: BRAND_MUTED },
  price: { fontSize: 15, fontWeight: "700", color: BRAND_PRIMARY },
  cancelBtn: {
    borderWidth: 1.5, borderColor: "#ef4444", borderRadius: 10,
    paddingVertical: 7, alignItems: "center",
  },
  cancelText: { fontSize: 13, fontWeight: "600", color: "#ef4444" },
  guestIcon: { fontSize: 52, marginBottom: 16 },
  guestTitle: { fontSize: 20, fontWeight: "700", color: "#111", marginBottom: 8 },
  guestSub: { fontSize: 14, color: BRAND_MUTED, textAlign: "center", marginBottom: 28, paddingHorizontal: 32 },
  loginBtn: {
    height: 50, paddingHorizontal: 36, borderRadius: 14,
    backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center",
  },
  loginBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  tapHint: { fontSize: 11, color: BRAND_MUTED, marginTop: 4 },
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
  lineItemName: { fontSize: 14, fontWeight: "600", color: "#111", marginBottom: 4 },
  lineBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  lineBadgeText: { fontSize: 9, fontWeight: "700", color: "#fff" },
  lineItemPrice: { fontSize: 14, fontWeight: "700", color: "#111" },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  bulkLabel: { fontSize: 13, color: "#16a34a", fontWeight: "600" },
  bulkSaving: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, marginBottom: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#111" },
  totalAmount: { fontSize: 20, fontWeight: "800", color: "#111" },
  heroBox: {
    backgroundColor: "#f9f5ff", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#ede9fe", marginBottom: 12,
  },
  heroBoxTitle: { fontSize: 11, fontWeight: "700", color: BRAND_MUTED, marginBottom: 4, textTransform: "uppercase" },
  heroBoxName: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 2 },
  heroBoxPhone: { fontSize: 13, color: BRAND_MUTED },
  cancelAllBtn: {
    marginTop: 12, height: 52, borderRadius: 14, backgroundColor: "#ef4444",
    alignItems: "center", justifyContent: "center",
  },
  cancelAllText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
