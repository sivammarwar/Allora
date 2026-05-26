import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, Switch, Alert, RefreshControl,
  Linking, Platform, Modal,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";
import { connectService } from "../../lib/socket";
import { storage } from "../../lib/storage";
import { checkNotificationPermission, registerFCMToken } from "../../lib/notifications";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface RequestGroup {
  key: string;
  categoryName: string;
  scheduledDate: string;
  scheduledHour: number;
  userName: string;
  userPhone: string;
  userAddress: string;
  distanceKm: number;
  requests: any[];
  totalFinal: number;
  totalTransport: number;
}

function groupRequests(list: any[]): RequestGroup[] {
  const map = new Map<string, RequestGroup>();
  for (const r of list) {
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
        userAddress: r.userAddress ?? "",
        distanceKm: r.distanceKm ?? 0,
        requests: [],
        totalFinal: 0,
        totalTransport: 0,
      });
    }
    const g = map.get(key)!;
    const afterInd = Number(r.charge) * (1 - Number(r.discountPercent ?? 0) / 100);
    g.requests.push(r);
    g.totalFinal += afterInd * (1 - Number(r.bulkDiscountPercent ?? 0) / 100);
    g.totalTransport += Number(r.transportTotal ?? 0);
    if (r.distanceKm) g.distanceKm = r.distanceKm;
  }
  return Array.from(map.values());
}

function fmtHour(h: number) {
  const ap = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:00 ${ap}`;
}

export default function HeroHomeScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user?.id) return;
    let socket: any;
    const onNew = () => qc.invalidateQueries({ queryKey: ["hero-requests", "INCOMING"] });
    const onTaken = () => qc.invalidateQueries({ queryKey: ["hero-requests", "INCOMING"] });
    (async () => {
      socket = await connectService();
      socket.on("service_request:new", onNew);
      socket.on("service_request:taken", onTaken);
    })();
    return () => {
      if (socket) {
        socket.off("service_request:new", onNew);
        socket.off("service_request:taken", onTaken);
      }
    };
  }, [user?.id, qc]);

  const { data: me, refetch: refetchMe } = useQuery<any>({
    queryKey: ["hero-me"],
    queryFn: () => api.get("/api/hero/me") as any,
    enabled: !!user,
    retry: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { data: stats, refetch: refetchStats } = useQuery<any>({
    queryKey: ["hero-stats"],
    queryFn: () => api.get("/api/hero/stats") as any,
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const { data: requests = [], isLoading, refetch: refetchRequests } = useQuery<any[]>({
    queryKey: ["hero-requests", "INCOMING"],
    queryFn: () => api.get("/api/hero/service-requests/incoming") as any,
    enabled: !!user,
    refetchInterval: 60_000, // 60 seconds (reduced from 15 seconds to save network calls)
  });

  const availMutation = useMutation({
    mutationFn: (isAvailable: boolean) =>
      api.put("/api/hero/availability", { isAvailable }) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hero-me"] }),
    onError: (e: any) => Alert.alert("Error", e?.error ?? "Could not update availability"),
  });

  const [selected, setSelected] = useState<RequestGroup | null>(null);
  const groups = useMemo(() => groupRequests(requests), [requests]);

  const acceptAllMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      let count = 0;
      for (const id of ids) {
        try { await api.post(`/api/hero/service-requests/${id}/accept`); count++; } catch {}
      }
      if (count === 0) throw new Error("All requests already taken");
      return count;
    },
    onSuccess: (count) => {
      setSelected(null);
      Alert.alert("Accepted! \u2713", `${count} booking${count > 1 ? "s" : ""} accepted.`);
      qc.invalidateQueries({ queryKey: ["hero-requests"] });
      qc.invalidateQueries({ queryKey: ["hero-stats"] });
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Could not accept request"),
  });

  const declineAllMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        try { await api.post(`/api/hero/service-requests/${id}/decline`); } catch {}
      }
    },
    onSuccess: () => { setSelected(null); qc.invalidateQueries({ queryKey: ["hero-requests"] }); },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Action failed."),
  });

  const handleAcceptAll = (g: RequestGroup) => {
    const ids = g.requests.filter((r) => r.status === "PENDING").map((r) => r.id);
    Alert.alert("Accept all?", `Accept all ${ids.length} service${ids.length > 1 ? "s" : ""} in this booking?`, [
      { text: "No", style: "cancel" },
      { text: "Accept All", onPress: () => acceptAllMutation.mutate(ids) },
    ]);
  };

  const handleDeclineAll = (g: RequestGroup) => {
    const ids = g.requests.filter((r) => r.status === "PENDING").map((r) => r.id);
    Alert.alert("Decline all?", `Decline all ${ids.length} service${ids.length > 1 ? "s" : ""} in this booking?`, [
      { text: "No", style: "cancel" },
      { text: "Decline All", style: "destructive", onPress: () => declineAllMutation.mutate(ids) },
    ]);
  };

  const isMutating = acceptAllMutation.isPending || declineAllMutation.isPending;

  // ── Notification permission banner ──────────────────────────────────────
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  useEffect(() => {
    checkNotificationPermission().then((allowed) => {
      if (!allowed) setShowNotifBanner(true);
      registerFCMToken().catch(() => {}); // always re-register token on every open
    });
  }, []);
  const openNotifSettings = () => {
    setShowNotifBanner(false);
    Linking.openSettings();
  };

  // ── Battery optimisation banner ─────────────────────────────────────────
  const [showBatteryBanner, setShowBatteryBanner] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    storage.get("battery_opt_dismissed").then((v) => {
      if (!v) setShowBatteryBanner(true);
    });
  }, []);
  const dismissBatteryBanner = async () => {
    await storage.set("battery_opt_dismissed", "1");
    setShowBatteryBanner(false);
  };
  const openBatterySettings = async () => {
    await storage.set("battery_opt_dismissed", "1");
    setShowBatteryBanner(false);
    Linking.openURL(`android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS?package=com.bharat333`)
      .catch(() => Linking.openSettings());
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMe(), refetchStats(), refetchRequests()]);
    setRefreshing(false);
  }, [refetchMe, refetchStats, refetchRequests]);

  const isAvailable: boolean = me?.profile?.isAvailable ?? false;
  const isVerified: boolean = me?.state === "verified";

  return (
    <View style={styles.screen}>
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          colors={[BRAND_PRIMARY]} tintColor={BRAND_PRIMARY} />
      }
    >
      {/* Notification permission banner — shown whenever notifications are blocked */}
      {showNotifBanner && (
        <View style={styles.notifBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifTitle}>🔔 Notifications are blocked</Text>
            <Text style={styles.notifBody}>
              You won't receive alerts for new service requests. Tap "Fix Now" to enable notifications.
            </Text>
          </View>
          <TouchableOpacity style={styles.notifFixBtn} onPress={openNotifSettings}>
            <Text style={styles.notifFixText}>Fix Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Battery optimisation banner — shown once until dismissed */}
      {showBatteryBanner && (
        <View style={styles.batteryBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.batteryTitle}>⚡ Enable unrestricted battery access</Text>
            <Text style={styles.batteryBody}>
              Your phone may delay or block notifications when the app is closed. Tap "Fix Now" to allow always-on delivery.
            </Text>
          </View>
          <View style={styles.batteryActions}>
            <TouchableOpacity style={styles.batteryFixBtn} onPress={openBatterySettings}>
              <Text style={styles.batteryFixText}>Fix Now</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismissBatteryBanner} style={{ padding: 6 }}>
              <Text style={{ color: "#92400e", fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Availability toggle */}
      {isVerified && (
        <View style={styles.availRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.availLabel}>Availability</Text>
            <Text style={styles.availSub}>
              {isAvailable ? "You're visible — users can book you" : "You're hidden — users cannot book you"}
            </Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={(val) => availMutation.mutate(val)}
            trackColor={{ false: "#e5e7eb", true: `${BRAND_PRIMARY}55` }}
            thumbColor={isAvailable ? BRAND_PRIMARY : "#9ca3af"}
            disabled={availMutation.isPending}
          />
        </View>
      )}

      {/* Validity badge */}
      {isVerified && me?.profile?.onboardingExpiresAt && (() => {
        const expiresAt = new Date(me.profile.onboardingExpiresAt);
        const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const expiringSoon = daysLeft <= 30;
        return (
          <View style={[
            styles.validityRow,
            expiringSoon ? styles.validityRowWarning : styles.validityRowActive,
          ]}>
            <View style={styles.validityIcon}>
              <Text style={{ fontSize: 16 }}>🛡️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[
                styles.validityTitle,
                expiringSoon ? styles.validityTitleWarning : styles.validityTitleActive,
              ]}>
                Subscription valid until {expiresAt.toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </Text>
              {expiringSoon && daysLeft > 0 && (
                <Text style={styles.validitySub}>
                  {daysLeft} day{daysLeft === 1 ? "" : "s"} left
                </Text>
              )}
            </View>
          </View>
        );
      })()}

      {/* Stats strip */}
      <View style={styles.statsRow}>
        {[
          { label: "Completed", value: stats?.completedCount ?? 0 },
          { label: "Pending", value: stats?.pendingCount ?? 0 },
          { label: "Rating", value: stats?.avgRating ? stats.avgRating.toFixed(1) : "—" },
          { label: "Earnings", value: stats?.totalEarnings ? `₹${stats.totalEarnings}` : "₹0" },
        ].map(({ label, value }) => (
          <View key={label} style={styles.statCard}>
            <Text style={styles.statVal}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* New Requests — grouped */}
      <View style={[styles.section, { paddingBottom: 32 }]}>
        <Text style={styles.sectionTitle}>
          New Requests{groups.length > 0 ? ` (${groups.length})` : ""}
        </Text>
        {isLoading ? (
          <ActivityIndicator color={BRAND_PRIMARY} style={{ margin: 20 }} />
        ) : groups.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pending requests right now.</Text>
          </View>
        ) : (
          groups.map((g) => {
            const grandTotal = g.totalFinal + g.totalTransport;
            const dateStr = g.scheduledDate
              ? new Date(g.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : null;
            return (
              <TouchableOpacity key={g.key} style={styles.reqCard} onPress={() => setSelected(g)} activeOpacity={0.85}>
                <View style={styles.reqTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reqService}>{g.categoryName}</Text>
                    <Text style={styles.reqServiceList} numberOfLines={2}>
                      {g.requests.map((r) => r.subcategory?.name).join(" · ")}
                    </Text>
                  </View>
                  <View style={styles.serviceCountBadge}>
                    <Text style={styles.serviceCountText}>
                      {g.requests.length} service{g.requests.length > 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reqUser}>👤 {g.userName}</Text>
                {dateStr && (
                  <Text style={styles.reqMeta}>📅 {dateStr}  🕐 {fmtHour(g.scheduledHour)}</Text>
                )}
                {g.userAddress ? <Text style={styles.reqMeta}>📍 {g.userAddress}</Text> : null}
                {g.distanceKm > 0 && (
                  <Text style={styles.reqMeta}>📍 {g.distanceKm} km away</Text>
                )}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={styles.reqCharge}>₹{grandTotal.toFixed(0)}</Text>
                  {g.totalTransport > 0 && (
                    <Text style={styles.transportTag}>incl. ₹{g.totalTransport.toFixed(0)} travel</Text>
                  )}
                </View>
                <Text style={styles.tapHint}>Tap to view & accept →</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>

    {/* ── Group detail bottom-sheet modal ─────────────────────────────── */}
    <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
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

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
            {selected?.requests.map((r) => {
              const afterInd = Number(r.charge) * (1 - Number(r.discountPercent ?? 0) / 100);
              return (
                <View key={r.id} style={styles.lineItem}>
                  <Text style={styles.lineItemName}>{r.subcategory?.name ?? "Service"}</Text>
                  <Text style={styles.lineItemPrice}>₹{afterInd.toFixed(0)}</Text>
                </View>
              );
            })}

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

            {selected && selected.distanceKm > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Distance to user</Text>
                <Text style={styles.summaryValue}>{selected.distanceKm} km</Text>
              </View>
            )}
            {selected && selected.totalTransport > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Travel charge</Text>
                <Text style={styles.summaryValue}>₹{selected.totalTransport.toFixed(0)}</Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>
                ₹{((selected?.totalFinal ?? 0) + (selected?.totalTransport ?? 0)).toFixed(0)}
              </Text>
            </View>

            {selected && (
              <View style={styles.customerBox}>
                <Text style={styles.customerBoxTitle}>CUSTOMER</Text>
                <Text style={styles.customerBoxLine}>👤 {selected.userName}</Text>
                <Text style={styles.customerBoxLine}>📞 {selected.userPhone}</Text>
                {selected.userAddress ? <Text style={styles.customerBoxLine}>📍 {selected.userAddress}</Text> : null}
              </View>
            )}
          </ScrollView>

          {selected && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtnSheet]}
                onPress={() => handleAcceptAll(selected)}
                disabled={isMutating}
              >
                {acceptAllMutation.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.acceptText}>Accept All ({selected.requests.length}) ✓</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtnSheet]}
                onPress={() => handleDeclineAll(selected)}
                disabled={isMutating}
              >
                {declineAllMutation.isPending
                  ? <ActivityIndicator color="#ef4444" size="small" />
                  : <Text style={styles.declineText}>Decline All</Text>}
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
  notifBanner: {
    margin: 16, marginBottom: 0, backgroundColor: "#fee2e2",
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#fecaca",
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  notifTitle: { fontSize: 13, fontWeight: "700", color: "#991b1b", marginBottom: 4 },
  notifBody: { fontSize: 12, color: "#7f1d1d", lineHeight: 17 },
  notifFixBtn: {
    backgroundColor: "#dc2626", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, alignSelf: "center",
  },
  notifFixText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  batteryBanner: {
    margin: 16, marginBottom: 0, backgroundColor: "#fef3c7",
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#fde68a",
    flexDirection: "row", alignItems: "flex-start", gap: 10,
  },
  batteryTitle: { fontSize: 13, fontWeight: "700", color: "#92400e", marginBottom: 4 },
  batteryBody: { fontSize: 12, color: "#78350f", lineHeight: 17 },
  batteryActions: { alignItems: "flex-end", gap: 8, justifyContent: "center" },
  batteryFixBtn: {
    backgroundColor: "#d97706", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  batteryFixText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  availRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2, gap: 12,
  },
  availLabel: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 2 },
  availSub: { fontSize: 13, color: "#6b7280" },
  validityRow: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, padding: 14, shadowColor: "#000", shadowOpacity: 0.04, elevation: 2, gap: 12,
  },
  validityRowActive: { backgroundColor: "#dcfce7" },
  validityRowWarning: { backgroundColor: "#fef3c7" },
  validityIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  validityTitle: { fontSize: 13, fontWeight: "600" },
  validityTitleActive: { color: "#16a34a" },
  validityTitleWarning: { color: "#d97706" },
  validitySub: { fontSize: 11, color: "#d97706", marginTop: 2 },
  statsRow: { flexDirection: "row", padding: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14,
    padding: 14, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  statVal: { fontSize: 20, fontWeight: "800", color: BRAND_PRIMARY },
  statLabel: { fontSize: 10, color: BRAND_MUTED, marginTop: 2, textAlign: "center" },
  section: { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 12 },
  empty: { padding: 24, alignItems: "center" },
  emptyText: { color: BRAND_MUTED, fontSize: 14 },
  reqCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.05, elevation: 2,
  },
  reqTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8, gap: 10 },
  reqService: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 2 },
  reqServiceList: { fontSize: 12, color: "#374151" },
  serviceCountBadge: {
    backgroundColor: BRAND_PRIMARY + "18", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start",
  },
  serviceCountText: { fontSize: 11, fontWeight: "700", color: BRAND_PRIMARY },
  reqUser: { fontSize: 12, color: BRAND_MUTED, marginBottom: 3 },
  reqMeta: { fontSize: 12, color: BRAND_MUTED, marginBottom: 3 },
  reqCharge: { fontSize: 16, fontWeight: "800", color: BRAND_PRIMARY },
  transportTag: { fontSize: 11, color: BRAND_MUTED },
  tapHint: { fontSize: 11, color: BRAND_MUTED, marginTop: 8 },
  // ── Bottom-sheet modal ───────────────────────────
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
  lineItemName: { fontSize: 14, fontWeight: "600", color: "#111", flex: 1 },
  lineItemPrice: { fontSize: 14, fontWeight: "700", color: "#111" },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  bulkLabel: { fontSize: 13, color: "#16a34a", fontWeight: "600" },
  bulkSaving: { fontSize: 13, fontWeight: "700", color: "#16a34a" },
  summaryLabel: { fontSize: 13, color: BRAND_MUTED },
  summaryValue: { fontSize: 13, fontWeight: "700", color: "#111" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, marginBottom: 4 },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#111" },
  totalAmount: { fontSize: 20, fontWeight: "800", color: "#111" },
  customerBox: {
    backgroundColor: "#f9f5ff", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#ede9fe", marginBottom: 12,
  },
  customerBoxTitle: { fontSize: 11, fontWeight: "700", color: BRAND_MUTED, marginBottom: 4, textTransform: "uppercase" },
  customerBoxLine: { fontSize: 13, color: "#111", marginBottom: 2 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  acceptBtnSheet: { backgroundColor: BRAND_PRIMARY },
  acceptText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  declineBtnSheet: { borderWidth: 1.5, borderColor: "#ef4444" },
  declineText: { fontSize: 14, fontWeight: "700", color: "#ef4444" },
});
