import React from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface PricingRow {
  id: string; subcategoryId: string;
  serviceCharge: string; deliveryCharge2km: string; deliveryCharge5km: string;
  deliveryCharge7km: string; deliveryCharge10km: string;
  subcategory: { id: string; name: string; category: { name: string; type: string } };
}
interface HeroProduct {
  id: string; sellingPrice: number; isAvailable: boolean;
  product: { name: string; imageUrl: string | null; category: { name: string } };
}
interface PricingResponse {
  heroId: string; subcategoryIds: string[]; requiresDelivery: boolean;
  pricing: PricingRow[]; subcategories: any[]; agentPricing: any[];
}

export default function HeroStoreScreen() {
  const { user } = useAuth();

  const { data: pricingData, isLoading: lp } = useQuery<PricingResponse>({
    queryKey: ["hero-pricing"],
    queryFn: () => api.get("/api/hero/pricing") as any,
    enabled: !!user,
  });

  const { data: myProducts = [], isLoading: lpr } = useQuery<HeroProduct[]>({
    queryKey: ["hero-my-products"],
    queryFn: () => api.get("/api/hero/my-products") as any,
    enabled: !!user,
  });

  const { data: me } = useQuery<any>({
    queryKey: ["hero-me"],
    queryFn: () => api.get("/api/hero/me") as any,
    enabled: !!user,
  });

  if (lp || lpr) return <View style={s.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;

  const servicePricing = (pricingData?.pricing ?? []).filter(
    (p) => p.subcategory.category.type === "SERVICE"
  );
  const productPricing = (pricingData?.pricing ?? []).filter(
    (p) => p.subcategory.category.type === "PRODUCT"
  );
  const activeProducts = myProducts.filter((p) => p.isAvailable);

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      {/* Summary cards */}
      <View style={s.statsRow}>
        {[
          { label: "Service Subcategories", value: String(servicePricing.length), icon: "🛠️" },
          { label: "Active Products", value: String(activeProducts.length), icon: "📦" },
          { label: "Delivery Enabled", value: pricingData?.requiresDelivery ? "Yes" : "No", icon: "🚴" },
          { label: "Total Products", value: String(myProducts.length), icon: "🛍️" },
        ].map(({ label, value, icon }) => (
          <View key={label} style={s.statCard}>
            <Text style={s.statIcon}>{icon}</Text>
            <Text style={s.statValue}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Hero info */}
      {me?.profile && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Store Info</Text>
          <View style={s.infoRow}><Text style={s.infoLabel}>Service Name</Text><Text style={s.infoVal}>{me.profile.serviceName ?? "—"}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLabel}>Shop Name</Text><Text style={s.infoVal}>{me.profile.shopName ?? "—"}</Text></View>
          <View style={s.infoRow}><Text style={s.infoLabel}>Status</Text>
            <View style={[s.statusBadge, { backgroundColor: me.state === "verified" ? "#dcfce7" : "#fef9c3" }]}>
              <Text style={[s.statusText, { color: me.state === "verified" ? "#15803d" : "#854d0e" }]}>
                {me.state?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Service pricing */}
      {servicePricing.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Service Pricing</Text>
          {servicePricing.map((p) => (
            <View key={p.id} style={s.pricingRow}>
              <View style={s.pricingLeft}>
                <Text style={s.pricingName}>{p.subcategory.name}</Text>
                <Text style={s.pricingCat}>{p.subcategory.category.name}</Text>
              </View>
              <Text style={s.pricingCharge}>₹{Number(p.serviceCharge)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Products */}
      {myProducts.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>My Products ({myProducts.length})</Text>
          {myProducts.map((p) => (
            <View key={p.id} style={s.productRow}>
              <View style={s.productLeft}>
                <Text style={s.productName}>{p.product.name}</Text>
                <Text style={s.productCat}>{p.product.category.name}</Text>
              </View>
              <View style={s.productRight}>
                <Text style={s.productPrice}>₹{p.sellingPrice}</Text>
                <View style={[s.availBadge, { backgroundColor: p.isAvailable ? "#dcfce7" : "#f3f4f6" }]}>
                  <Text style={[s.availText, { color: p.isAvailable ? "#15803d" : BRAND_MUTED }]}>
                    {p.isAvailable ? "Live" : "Off"}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 10 },
  statCard: { width: "47%", backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.04, elevation: 2 },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: "800", color: "#111" },
  statLabel: { fontSize: 10, color: BRAND_MUTED, marginTop: 3, textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 16, marginHorizontal: 16, marginBottom: 12, padding: 18, shadowColor: "#000", shadowOpacity: 0.04, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 14 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6" },
  infoLabel: { fontSize: 13, color: BRAND_MUTED },
  infoVal: { fontSize: 13, fontWeight: "600", color: "#111" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: "700" },
  pricingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6" },
  pricingLeft: {},
  pricingName: { fontSize: 13, fontWeight: "600", color: "#111" },
  pricingCat: { fontSize: 11, color: BRAND_MUTED },
  pricingCharge: { fontSize: 15, fontWeight: "800", color: BRAND_PRIMARY },
  productRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f3f4f6" },
  productLeft: { flex: 1 },
  productName: { fontSize: 13, fontWeight: "600", color: "#111" },
  productCat: { fontSize: 11, color: BRAND_MUTED },
  productRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  productPrice: { fontSize: 14, fontWeight: "800", color: BRAND_PRIMARY },
  availBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  availText: { fontSize: 9, fontWeight: "700" },
});
