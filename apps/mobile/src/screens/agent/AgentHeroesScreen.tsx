import React, { useState } from "react";
import {
  View, Text, ScrollView, Switch, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Ionicons from "react-native-vector-icons/Ionicons";
import { api } from "../../lib/api";
import { BRAND_PRIMARY } from "../../lib/config";

interface Hero {
  id: string;
  shopName: string | null;
  serviceName: string | null;
  phone: string;
  user: { name: string | null; email: string };
  hasPaidOnboardingFee: boolean;
  onboardingPaidAt: string | null;
  onboardingExpiresAt: string | null;
  onboardingFeePaid: number | null;
  onboardingValidityMonths: number | null;
}

export default function AgentHeroesScreen() {
  const qc = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data: heroes = [], isLoading } = useQuery<Hero[]>({
    queryKey: ["agent", "verified-heroes"],
    queryFn: () => api.get("/api/agent/verified-heroes").then((r) => r.data),
  });

  const toggle = useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) =>
      api.patch(`/api/agent/verified-heroes/${id}/payment-status`, { paid }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent", "verified-heroes"] });
      setPendingId(null);
    },
    onError: () => {
      Alert.alert("Error", "Failed to update payment status");
      setPendingId(null);
    },
  });

  const handleToggle = (hero: Hero) => {
    const isActive = hero.hasPaidOnboardingFee &&
      (!hero.onboardingExpiresAt || new Date(hero.onboardingExpiresAt).getTime() > Date.now());
    const next = !isActive;

    if (!next) {
      Alert.alert(
        "Mark Unpaid?",
        `${hero.shopName ?? hero.user.name ?? "This hero"} will lose dashboard access.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Confirm", style: "destructive", onPress: () => { setPendingId(hero.id); toggle.mutate({ id: hero.id, paid: false }); } },
        ]
      );
    } else {
      setPendingId(hero.id);
      toggle.mutate({ id: hero.id, paid: true });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BRAND_PRIMARY} />
      </View>
    );
  }

  if (heroes.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="people-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>No verified heroes yet</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {heroes.map((hero) => {
        const expiresAt = hero.onboardingExpiresAt ? new Date(hero.onboardingExpiresAt) : null;
        const expired = expiresAt !== null && expiresAt.getTime() < Date.now();
        const active = hero.hasPaidOnboardingFee && !expired;

        return (
          <View key={hero.id} style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {hero.shopName ?? hero.serviceName ?? hero.user.name ?? "—"}
                </Text>
                <Text style={styles.meta}>{hero.user.email}</Text>
                <Text style={styles.meta}>{hero.phone}</Text>
              </View>
              {pendingId === hero.id ? (
                <ActivityIndicator size="small" color={BRAND_PRIMARY} />
              ) : (
                <Switch
                  value={active}
                  onValueChange={() => handleToggle(hero)}
                  trackColor={{ true: "#22c55e", false: "#d1d5db" }}
                  thumbColor="#fff"
                />
              )}
            </View>

            {/* Status badge */}
            <View style={[styles.badge, active ? styles.badgeActive : styles.badgeInactive]}>
              <Ionicons
                name={active ? "checkmark-circle" : "alert-circle"}
                size={14}
                color={active ? "#16a34a" : "#d97706"}
              />
              <Text style={[styles.badgeText, active ? styles.badgeTextActive : styles.badgeTextInactive]}>
                {active ? "Paid · Active" : expired ? "Expired" : "Unpaid"}
              </Text>
            </View>

            {/* Validity details */}
            {hero.hasPaidOnboardingFee && expiresAt && (
              <View style={styles.details}>
                <Text style={styles.detailText}>
                  Valid until{" "}
                  <Text style={{ fontWeight: "600", color: expired ? "#d97706" : "#111" }}>
                    {expiresAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </Text>
                  {hero.onboardingValidityMonths ? ` (${hero.onboardingValidityMonths} mo)` : ""}
                </Text>
                {hero.onboardingFeePaid !== null && (
                  <Text style={styles.detailText}>
                    Paid ₹{hero.onboardingFeePaid}
                    {hero.onboardingPaidAt &&
                      ` · ${new Date(hero.onboardingPaidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`}
                  </Text>
                )}
              </View>
            )}

            {!hero.hasPaidOnboardingFee && (
              <Text style={styles.hint}>
                Toggle ON only after the hero has paid you offline.
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  emptyText: { marginTop: 12, fontSize: 14, color: "#9ca3af" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  name: { fontSize: 15, fontWeight: "600", color: "#111827" },
  meta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
  badgeActive: { backgroundColor: "#dcfce7" },
  badgeInactive: { backgroundColor: "#fef3c7" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  badgeTextActive: { color: "#16a34a" },
  badgeTextInactive: { color: "#d97706" },
  details: { marginTop: 8, gap: 2 },
  detailText: { fontSize: 11, color: "#6b7280" },
  hint: { marginTop: 8, fontSize: 11, color: "#d97706", fontStyle: "italic" },
});
