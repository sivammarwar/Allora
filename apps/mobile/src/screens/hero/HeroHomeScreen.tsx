import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, Switch, Alert, RefreshControl,
  Linking, Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";
import { connectService } from "../../lib/socket";
import { storage } from "../../lib/storage";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  ACCEPTED: "#3b82f6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

function fmtHour(h: number) {
  const ap = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:00 ${ap}`;
}

export default function HeroHomeScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

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

  const acceptMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/api/hero/service-requests/${id}/accept`) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hero-requests"] });
      qc.invalidateQueries({ queryKey: ["hero-stats"] });
    },
    onError: (e: any) => Alert.alert("Error", e?.error ?? "Could not accept request"),
  });

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
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          colors={[BRAND_PRIMARY]} tintColor={BRAND_PRIMARY} />
      }
    >
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

      {/* Pending requests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>New Requests</Text>
        {isLoading ? (
          <ActivityIndicator color={BRAND_PRIMARY} style={{ margin: 20 }} />
        ) : requests.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pending requests right now.</Text>
          </View>
        ) : (
          requests.map((req) => (
            <View key={req.id} style={styles.reqCard}>
              <View style={styles.reqTop}>
                <Text style={styles.reqService}>{req.subcategory?.name ?? "Service"}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[req.status] ?? "#9ca3af" }]}>
                  <Text style={styles.badgeText}>{req.status}</Text>
                </View>
              </View>
              <Text style={styles.reqUser}>👤 {req.user?.name ?? "Customer"}</Text>
              {req.scheduledDate && (
                <Text style={styles.reqMeta}>
                  📅 {new Date(req.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  {"  "}🕐 {fmtHour(req.scheduledHour)}
                </Text>
              )}
              <Text style={styles.reqCharge}>
                ₹{(Number(req.charge) * (1 - Number(req.discountPercent ?? 0) / 100)).toFixed(0)}
              </Text>
              <TouchableOpacity
                style={[styles.acceptBtn, acceptMutation.isPending && { opacity: 0.6 }]}
                onPress={() => acceptMutation.mutate(req.id)}
                disabled={acceptMutation.isPending}
              >
                <Text style={styles.acceptText}>
                  {acceptMutation.isPending ? "Accepting…" : "Accept Request ✓"}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
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
  reqTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  reqService: { fontSize: 15, fontWeight: "700", color: "#111", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
  reqUser: { fontSize: 12, color: BRAND_MUTED, marginBottom: 4 },
  reqMeta: { fontSize: 12, color: BRAND_MUTED, marginBottom: 4 },
  reqCharge: { fontSize: 16, fontWeight: "700", color: BRAND_PRIMARY, marginBottom: 12 },
  acceptBtn: {
    backgroundColor: BRAND_PRIMARY, borderRadius: 12,
    paddingVertical: 12, alignItems: "center",
  },
  acceptText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
