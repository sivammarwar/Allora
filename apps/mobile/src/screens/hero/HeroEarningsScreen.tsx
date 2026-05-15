import React, { useCallback, useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, FlatList, RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface HistoryEntry {
  id: string; status: string; charge: string; discountPercent: string;
  bulkDiscountPercent: string; transportCharge: string;
  scheduledDate: string; scheduledHour: number;
  subcategory: { name: string };
}

function fmtHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function earned(e: HistoryEntry) {
  const base = Number(e.charge);
  const ind  = Number(e.discountPercent);
  const bulk = Number(e.bulkDiscountPercent ?? 0);
  return base * (1 - ind / 100) * (1 - bulk / 100) + Number(e.transportCharge);
}

const COLORS = [BRAND_PRIMARY, "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#14b8a6", "#f97316"];

export default function HeroEarningsScreen() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery<{
    totalEarnings: number;
    dailyEarnings: { date: string; total: number; count: number; transactions: any[] }[];
    allTransactions: any[];
  }>({
    queryKey: ["hero-earnings"],
    queryFn: () => api.get("/api/hero/earnings") as any,
    enabled: !!user,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const dailyEarnings = data?.dailyEarnings ?? [];
  const allTransactions = data?.allTransactions ?? [];

  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
    let month = 0, week = 0;
    for (const day of dailyEarnings) {
      const d = new Date(day.date);
      if (d >= startOfMonth) month += day.total;
      if (d >= startOfWeek)  week  += day.total;
    }
    const totalJobs = dailyEarnings.reduce((sum, d) => sum + d.count, 0);
    const avg = totalJobs ? (data?.totalEarnings ?? 0) / totalJobs : 0;
    return { month, week, avg, totalJobs };
  }, [dailyEarnings, data?.totalEarnings]);

  // Last 7 days bar data
  const barData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return {
        label: d.toLocaleDateString("en-IN", { weekday: "short" }),
        date: d.toISOString().split("T")[0],
        amount: 0,
      };
    });
    for (const day of dailyEarnings) {
      const dayData = days.find((d) => d.date === day.date);
      if (dayData) dayData.amount = day.total;
    }
    return days;
  }, [dailyEarnings]);

  const maxBar = Math.max(...barData.map((d) => d.amount), 1);

  // By service breakdown
  const byService = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of allTransactions) {
      const k = tx.service;
      map.set(k, (map.get(k) ?? 0) + (tx.final || tx.charge));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [allTransactions]);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          colors={[BRAND_PRIMARY]} tintColor={BRAND_PRIMARY} />
      }
    >

      {/* Total earnings banner */}
      <View style={styles.totalBanner}>
        <Text style={styles.totalLabel}>Total Earnings</Text>
        <Text style={styles.totalAmt}>₹{(data?.totalEarnings ?? 0).toFixed(0)}</Text>
        <Text style={styles.totalSub}>{stats.totalJobs} services completed</Text>
      </View>

      {/* Stat cards */}
      <View style={styles.statsGrid}>
        {[
          { label: "This Month", value: `₹${stats.month.toFixed(0)}`, icon: "📅" },
          { label: "This Week",  value: `₹${stats.week.toFixed(0)}`,  icon: "📈" },
          { label: "Avg / Job",  value: `₹${stats.avg.toFixed(0)}`,   icon: "⭐" },
          { label: "Total Jobs", value: String(stats.totalJobs),        icon: "💼" },
        ].map(({ label, value, icon }) => (
          <View key={label} style={styles.statCard}>
            <Text style={styles.statIcon}>{icon}</Text>
            <Text style={styles.statVal}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Last 7 days chart */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last 7 Days</Text>
        <View style={styles.barChart}>
          {barData.map((d) => (
            <View key={d.date} style={styles.barCol}>
              <Text style={styles.barAmt}>
                {d.amount > 0 ? `₹${d.amount.toFixed(0)}` : ""}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { height: Math.max(4, (d.amount / maxBar) * 100) },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* By service breakdown */}
      {byService.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>By Service</Text>
          {byService.map(({ name, value }, i) => {
            const pct = Math.round((value / (data?.totalEarnings || 1)) * 100);
            return (
              <View key={name} style={styles.serviceRow}>
                <View style={[styles.serviceColor, { backgroundColor: COLORS[i % COLORS.length] }]} />
                <Text style={styles.serviceName}>{name}</Text>
                <Text style={styles.serviceAmt}>₹{value}</Text>
                <Text style={styles.servicePct}>{pct}%</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Transaction history */}
      {allTransactions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Transactions</Text>
          {allTransactions.slice(0, 20).map((e: any) => (
            <View key={e.id} style={styles.txRow}>
              <View style={styles.txIcon}>
                <Text style={styles.txIconText}>₹</Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txService}>{e.service}</Text>
                <Text style={styles.txDate}>
                  {e.completedAt ? new Date(e.completedAt).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  }) : new Date(e.scheduledDate).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </Text>
              </View>
              <Text style={styles.txAmt}>+₹{e.final || Math.round(e.charge)}</Text>
            </View>
          ))}
        </View>
      )}

      {allTransactions.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>No earnings yet</Text>
          <Text style={styles.emptySub}>Complete your first service to see earnings here.</Text>
        </View>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  totalBanner: {
    backgroundColor: BRAND_PRIMARY, padding: 28, alignItems: "center",
  },
  totalLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700", letterSpacing: 1.5, marginBottom: 6 },
  totalAmt: { color: "#fff", fontSize: 42, fontWeight: "800" },
  totalSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 10 },
  statCard: {
    width: "47%", backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statVal: { fontSize: 20, fontWeight: "800", color: "#111" },
  statLabel: { fontSize: 10, color: BRAND_MUTED, marginTop: 3, textAlign: "center" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, marginHorizontal: 16,
    marginBottom: 12, padding: 18,
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 16 },
  barChart: { flexDirection: "row", alignItems: "flex-end", height: 120, gap: 4 },
  barCol: { flex: 1, alignItems: "center" },
  barAmt: { fontSize: 8, color: BRAND_MUTED, marginBottom: 2, textAlign: "center" },
  barTrack: { width: "70%", height: 100, justifyContent: "flex-end" },
  barFill: { backgroundColor: BRAND_PRIMARY, borderRadius: 4, width: "100%" },
  barLabel: { fontSize: 9, color: BRAND_MUTED, marginTop: 4 },
  serviceRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6" },
  serviceColor: { width: 10, height: 10, borderRadius: 5 },
  serviceName: { flex: 1, fontSize: 13, color: "#374151" },
  serviceAmt: { fontSize: 13, fontWeight: "700", color: "#111" },
  servicePct: { fontSize: 11, color: BRAND_MUTED, width: 32, textAlign: "right" },
  txRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6", gap: 12 },
  txIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: `${BRAND_PRIMARY}18`, alignItems: "center", justifyContent: "center",
  },
  txIconText: { fontSize: 14, fontWeight: "700", color: BRAND_PRIMARY },
  txInfo: { flex: 1 },
  txService: { fontSize: 13, fontWeight: "600", color: "#111" },
  txDate: { fontSize: 11, color: BRAND_MUTED, marginTop: 1 },
  txAmt: { fontSize: 14, fontWeight: "700", color: "#10b981" },
  empty: { alignItems: "center", padding: 40 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 6 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
});
