import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
  Switch, ActivityIndicator, Image, RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function HeroProfileScreen() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();

  const { data: me, isLoading, refetch: refetchMe } = useQuery<any>({
    queryKey: ["hero-me"],
    queryFn: () => api.get("/api/hero/me") as any,
    enabled: !!user,
  });

  const { data: pricingData, refetch: refetchPricing } = useQuery<any>({
    queryKey: ["hero-pricing"],
    queryFn: () => api.get("/api/hero/pricing") as any,
    enabled: me?.state === "verified",
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMe(), refetchPricing()]);
    setRefreshing(false);
  }, [refetchMe, refetchPricing]);

  const toggleAvail = useMutation({
    mutationFn: (v: boolean) => api.put("/api/hero/availability", { isAvailable: v }) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hero-me"] }),
  });

  const handleLogout = () =>
    Alert.alert("Log out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }

  const profile = me?.profile;

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Profile not available.</Text>
      </View>
    );
  }

  const pricing: any[] = pricingData?.pricing ?? [];
  const grouped = pricing.reduce<Record<string, any[]>>((acc, row) => {
    const cat = row.subcategory?.category?.name ?? "Other";
    (acc[cat] = acc[cat] ?? []).push(row);
    return acc;
  }, {});

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
          colors={[BRAND_PRIMARY]} tintColor={BRAND_PRIMARY} />
      }
    >

      {/* Identity */}
      <View style={styles.header}>
        {profile.profileImageUrl ? (
          <Image source={{ uri: profile.profileImageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{(profile.user?.name ?? "H")[0].toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile.user?.name ?? "—"}</Text>
        {profile.serviceName && <Text style={styles.serviceName}>{profile.serviceName}</Text>}
        {profile.shopName && <Text style={styles.shopName}>🏪 {profile.shopName}</Text>}
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: profile.isVerifiedByAgent ? "#dcfce7" : "#fef9c3" }]}>
            <Text style={[styles.badgeText, { color: profile.isVerifiedByAgent ? "#15803d" : "#854d0e" }]}>
              {profile.isVerifiedByAgent ? "✓ Verified" : "⏳ Pending"}
            </Text>
          </View>
        </View>
      </View>

      {/* Availability toggle */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View>
            <Text style={styles.cardLabel}>Accepting bookings</Text>
            <Text style={styles.cardSub}>
              {profile.isAvailable ? "You're visible to customers" : "You're hidden from customers"}
            </Text>
          </View>
          <Switch
            value={profile.isAvailable}
            onValueChange={(v) => toggleAvail.mutate(v)}
            disabled={toggleAvail.isPending}
            trackColor={{ false: "#e5e7eb", true: `${BRAND_PRIMARY}66` }}
            thumbColor={profile.isAvailable ? BRAND_PRIMARY : "#9ca3af"}
          />
        </View>
      </View>

      {/* Contact */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contact & Location</Text>
        <InfoRow icon="�" value={profile.phone} />
        <InfoRow icon="📍" value={profile.address} />
        <InfoRow icon="✉️" value={profile.user?.email} />
      </View>

      {/* Working schedule */}
      {(profile.workingDays?.length > 0 || profile.activeFrom) && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Working Schedule</Text>
          {profile.workingDays?.length > 0 && (
            <View style={styles.daysRow}>
              {DAYS.map((d, i) => (
                <View
                  key={d}
                  style={[styles.dayChip, profile.workingDays.includes(i) && styles.dayChipActive]}
                >
                  <Text style={[styles.dayText, profile.workingDays.includes(i) && styles.dayTextActive]}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {profile.activeFrom && (
            <Text style={styles.hours}>⏰ {profile.activeFrom} – {profile.activeTo ?? "—"}</Text>
          )}
        </View>
      )}

      {/* Verification */}
      {profile.verifiedByAgent && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Verified By</Text>
          <View style={styles.agentRow}>
            <View style={styles.agentAvatar}>
              <Text style={styles.agentInitial}>
                {(profile.verifiedByAgent.user?.name ?? "A")[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.agentName}>{profile.verifiedByAgent.user?.name ?? "Agent"}</Text>
              <Text style={styles.agentEmail}>{profile.verifiedByAgent.user?.email}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Services & Pricing */}
      {Object.keys(grouped).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>My Services</Text>
          {Object.entries(grouped).map(([cat, rows]) => (
            <View key={cat} style={styles.pricingGroup}>
              <Text style={styles.pricingCat}>⭐ {cat}</Text>
              {(rows as any[]).map((row) => {
                const base = Number(row.baseServiceCharge);
                const disc = Number(row.discountPercent);
                const final = base * (1 - disc / 100);
                return (
                  <View key={row.subcategoryId} style={styles.pricingRow}>
                    <Text style={styles.pricingService}>✓ {row.subcategory?.name}</Text>
                    <View style={styles.pricingRight}>
                      <Text style={styles.pricingFinal}>₹{final.toFixed(0)}</Text>
                      {disc > 0 && (
                        <Text style={styles.pricingBase}>₹{base.toFixed(0)}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}

      <Text style={styles.memberSince}>
        Member since {new Date(profile.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
      </Text>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

function InfoRow({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { fontSize: 14, color: BRAND_MUTED },
  header: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20, backgroundColor: "#fff" },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: BRAND_PRIMARY,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarInitial: { color: "#fff", fontSize: 34, fontWeight: "800" },
  name: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 4 },
  serviceName: { fontSize: 13, color: BRAND_MUTED, marginBottom: 2 },
  shopName: { fontSize: 12, color: BRAND_MUTED, marginBottom: 10 },
  badges: { flexDirection: "row", gap: 8, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, marginHorizontal: 16,
    marginBottom: 12, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLabel: { fontSize: 14, fontWeight: "700", color: "#111" },
  cardSub: { fontSize: 12, color: BRAND_MUTED, marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: BRAND_MUTED, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  infoIcon: { fontSize: 14, marginRight: 10, marginTop: 1 },
  infoValue: { fontSize: 14, color: "#4b5563", flex: 1 },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  dayChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: "#f3f4f6" },
  dayChipActive: { backgroundColor: BRAND_PRIMARY },
  dayText: { fontSize: 11, fontWeight: "600", color: BRAND_MUTED },
  dayTextActive: { color: "#fff" },
  hours: { fontSize: 13, color: "#4b5563" },
  agentRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  agentAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#10b981", alignItems: "center", justifyContent: "center",
  },
  agentInitial: { color: "#fff", fontSize: 16, fontWeight: "700" },
  agentName: { fontSize: 14, fontWeight: "600", color: "#111" },
  agentEmail: { fontSize: 12, color: BRAND_MUTED },
  pricingGroup: { marginBottom: 14 },
  pricingCat: { fontSize: 13, fontWeight: "700", color: "#111", marginBottom: 8 },
  pricingRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6",
  },
  pricingService: { fontSize: 13, color: "#374151", flex: 1 },
  pricingRight: { alignItems: "flex-end" },
  pricingFinal: { fontSize: 14, fontWeight: "700", color: "#111" },
  pricingBase: { fontSize: 11, color: BRAND_MUTED, textDecorationLine: "line-through" },
  memberSince: { textAlign: "center", fontSize: 12, color: BRAND_MUTED, marginVertical: 8 },
  logoutBtn: {
    marginHorizontal: 16, marginTop: 4, height: 50,
    borderRadius: 14, borderWidth: 1.5, borderColor: "#ef4444",
    alignItems: "center", justifyContent: "center",
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#ef4444" },
});
