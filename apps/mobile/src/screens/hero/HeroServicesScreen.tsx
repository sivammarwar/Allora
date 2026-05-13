import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface Subcategory {
  id: string; name: string; categoryId: string;
  category?: { id: string; name: string };
}
interface Pricing {
  subcategoryId: string; serviceCharge: number;
  deliveryCharge2km: number; deliveryCharge5km: number;
  deliveryCharge7km: number; deliveryCharge10km: number;
}

function PricingForm({
  sub, existing, onSave, saving,
}: {
  sub: Subcategory; existing?: Pricing;
  onSave: (d: Pricing) => void; saving: boolean;
}) {
  const [form, setForm] = useState<Pricing>({
    subcategoryId: sub.id,
    serviceCharge: existing?.serviceCharge ?? 0,
    deliveryCharge2km: existing?.deliveryCharge2km ?? 0,
    deliveryCharge5km: existing?.deliveryCharge5km ?? 0,
    deliveryCharge7km: existing?.deliveryCharge7km ?? 0,
    deliveryCharge10km: existing?.deliveryCharge10km ?? 0,
  });
  const set = (k: keyof Pricing) => (v: string) =>
    setForm((f) => ({ ...f, [k]: Number(v) || 0 }));

  return (
    <View style={styles.pricingCard}>
      <View style={styles.pricingHeader}>
        <Text style={styles.pricingName}>{sub.name}</Text>
        {sub.category && <Text style={styles.pricingCat}>{sub.category.name}</Text>}
      </View>
      <View style={styles.fields}>
        {([
          ["serviceCharge", "Service Charge (₹)"],
          ["deliveryCharge2km", "Delivery ≤ 2 km (₹)"],
          ["deliveryCharge5km", "Delivery ≤ 5 km (₹)"],
          ["deliveryCharge7km", "Delivery ≤ 7 km (₹)"],
          ["deliveryCharge10km", "Delivery ≤ 10 km (₹)"],
        ] as const).map(([key, label]) => (
          <View key={key} style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
              style={styles.fieldInput}
              value={String(form[key])}
              onChangeText={set(key)}
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.btnDisabled]}
        onPress={() => onSave(form)}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.saveBtnText}>💾 Save Pricing</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function HeroServicesScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: me } = useQuery<any>({
    queryKey: ["hero-me"],
    queryFn: () => api.get("/api/hero/me") as any,
    enabled: !!user,
  });

  const { data: cats = [] } = useQuery<any[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/api/user/categories") as any,
  });

  const { data: allSubs = [] } = useQuery<any[]>({
    queryKey: ["subcategories"],
    queryFn: () => api.get("/api/user/subcategories") as any,
    enabled: cats.length > 0,
  });

  const { data: pricingData } = useQuery<any>({
    queryKey: ["hero-pricing"],
    queryFn: () => api.get("/api/hero/pricing") as any,
    enabled: me?.state === "verified",
  });

  const saveMut = useMutation({
    mutationFn: (data: Pricing) => api.put("/api/hero/pricing", data) as any,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hero-pricing"] });
      Alert.alert("✓ Saved", "Pricing updated successfully.");
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed to save pricing."),
  });

  const profile = me?.profile;
  const mySubs: any[] = (allSubs as any[]).filter(
    (s: any) => profile?.subcategoryIds?.includes(s.id)
  );
  const myServiceCats: any[] = (cats as any[]).filter(
    (c: any) => c.type === "SERVICE" && profile?.categoryIds?.includes(c.id)
  );
  const pricingMap = new Map<string, Pricing>(
    (pricingData?.pricing ?? []).map((p: any) => [p.subcategoryId, p])
  );

  if (!me) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} /></View>;
  }

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>

      {/* My categories */}
      {myServiceCats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Categories</Text>
          <View style={styles.catChips}>
            {myServiceCats.map((c: any) => (
              <View key={c.id} style={styles.catChip}>
                <Text style={styles.catChipText}>{c.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Pricing per subcategory */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subcategory Pricing</Text>
        {mySubs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛠️</Text>
            <Text style={styles.emptyText}>No subcategories assigned yet.</Text>
            <Text style={styles.emptySub}>Contact your agent to get subcategories assigned.</Text>
          </View>
        ) : (
          mySubs.map((sub: any) => (
            <PricingForm
              key={sub.id}
              sub={{
                ...sub,
                category: (cats as any[]).find((c: any) => c.id === sub.categoryId),
              }}
              existing={pricingMap.get(sub.id)}
              onSave={saveMut.mutate}
              saving={saveMut.isPending}
            />
          ))
        )}
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111", marginBottom: 12 },
  catChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { backgroundColor: `${BRAND_PRIMARY}18`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  catChipText: { fontSize: 12, fontWeight: "600", color: BRAND_PRIMARY },
  empty: { alignItems: "center", padding: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 6 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  pricingCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  pricingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  pricingName: { fontSize: 15, fontWeight: "700", color: "#111" },
  pricingCat: { fontSize: 11, color: BRAND_MUTED },
  fields: { gap: 10, marginBottom: 14 },
  field: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fieldLabel: { fontSize: 12, color: "#4b5563", flex: 1 },
  fieldInput: {
    width: 100, backgroundColor: "#f9fafb", borderRadius: 8,
    borderWidth: 1.5, borderColor: "#e5e7eb",
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 14, color: "#111", textAlign: "right",
  },
  saveBtn: {
    height: 42, borderRadius: 10, backgroundColor: BRAND_PRIMARY,
    alignItems: "center", justifyContent: "center",
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
