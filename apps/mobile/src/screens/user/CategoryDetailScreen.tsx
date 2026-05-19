import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, Image, ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { storage } from "../../lib/storage";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";
import type { UserStackParams } from "../../navigation/types";

type Props = NativeStackScreenProps<UserStackParams, "CategoryDetail">;

interface StoredLocation { lat: number; lng: number; name?: string }
interface Subcategory {
  id: string; name: string; nameHi?: string | null;
  imageUrl: string | null; isActive: boolean;
  category: { id: string; name: string; type: string };
  agentPricing?: { baseServiceCharge: string; discountPercent: string; transportChargePerKm?: string } | null;
}
interface Category { id: string; name: string; nameHi?: string | null; type: string; imageUrl: string | null }

export default function CategoryDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const { lang, t } = useLanguage();
  const [loc, setLoc] = useState<StoredLocation | null>(null);
  const [locLoaded, setLocLoaded] = useState(false);

  useEffect(() => {
    storage.getJSON<StoredLocation>("user_location").then((l) => {
      setLoc(l ?? null);
      setLocLoaded(true);
    });
  }, []);

  const { data: cat } = useQuery<Category>({
    queryKey: ["category-info", id],
    queryFn: () => api.get(`/api/user/categories/${id}`) as any,
  });

  const { data: subcategories = [], isLoading, isError } = useQuery<Subcategory[]>({
    queryKey: ["category-subs", id, loc?.lat, loc?.lng],
    queryFn: () =>
      api.get(`/api/user/categories/${id}/subcategories?lat=${loc!.lat}&lng=${loc!.lng}`) as any,
    enabled: locLoaded && !!loc,
  });

  const renderHeader = () => (
    <View style={styles.header}>
      {cat?.imageUrl && (
        <Image source={{ uri: cat.imageUrl }} style={styles.catBanner} />
      )}
      <View style={styles.headerInfo}>
        <Text style={styles.heading}>{lang === "hi" && cat?.nameHi ? cat.nameHi : (cat?.name ?? (lang === "hi" ? "सेवाएं" : "Services"))}</Text>
        <Text style={styles.subheading}>
          {isLoading ? t("common.loading") : `${subcategories.length} ${t("home.servicesAvailable")}`}
        </Text>
      </View>
    </View>
  );

  if (!locLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={BRAND_PRIMARY} size="large" />
      </View>
    );
  }

  if (!loc) {
    return (
      <View style={styles.center}>
        <Text style={styles.locIcon}>📍</Text>
        <Text style={styles.locTitle}>Location required</Text>
        <Text style={styles.locMsg}>Go back to Home and set your location to browse services.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={subcategories}
      keyExtractor={(i) => i.id}
      style={styles.screen}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={
        isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={BRAND_PRIMARY} size="large" />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.locMsg}>Failed to load services. Check your connection.</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.locIcon}>🔍</Text>
            <Text style={styles.locTitle}>No services here yet</Text>
            <Text style={styles.locMsg}>No heroes offer this service in your area yet.</Text>
          </View>
        )
      }
      renderItem={({ item }) => {
        const ap = item.agentPricing;
        const base = ap ? parseFloat(ap.baseServiceCharge) : null;
        const disc = ap ? parseFloat(ap.discountPercent) : 0;
        const final = base != null ? base * (1 - disc / 100) : null;
        const transport = ap?.transportChargePerKm ? parseFloat(ap.transportChargePerKm) : null;

        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("SubcategoryDetail", { id: item.id })}
            activeOpacity={0.85}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.img} />
            ) : (
              <View style={[styles.img, styles.imgPlaceholder]}>
                <Text style={styles.imgEmoji}>✂️</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name}>{lang === "hi" && item.nameHi ? item.nameHi : item.name}</Text>
              {lang === "en" && item.nameHi && <Text style={styles.nameHi}>{item.nameHi}</Text>}
              {final != null ? (
                <View style={styles.priceRow}>
                  {disc > 0 && (
                    <Text style={styles.priceOld}>₹{base!.toFixed(0)}</Text>
                  )}
                  <Text style={styles.priceFinal}>₹{final.toFixed(0)}</Text>
                  {disc > 0 && (
                    <View style={styles.discBadge}>
                      <Text style={styles.discText}>{disc}% off</Text>
                    </View>
                  )}
                  {transport != null && transport > 0 && (
                    <Text style={styles.transport}>· ₹{transport}/km</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.priceTap}>Tap to view pricing</Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, marginTop: 60 },
  locIcon: { fontSize: 40, marginBottom: 12 },
  locTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  locMsg: { fontSize: 14, color: BRAND_MUTED, textAlign: "center", lineHeight: 20 },
  list: { padding: 16, gap: 10 },
  header: { marginBottom: 16 },
  catBanner: { width: "100%", height: 160, borderRadius: 16, marginBottom: 12 },
  headerInfo: { paddingHorizontal: 4 },
  heading: { fontSize: 26, fontWeight: "800", color: "#111" },
  subheading: { fontSize: 13, color: BRAND_MUTED, marginTop: 4 },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  img: { width: 88, height: 88 },
  imgPlaceholder: { backgroundColor: "#fce7f3", alignItems: "center", justifyContent: "center" },
  imgEmoji: { fontSize: 28 },
  info: { flex: 1, paddingHorizontal: 14, paddingVertical: 10 },
  name: { fontSize: 15, fontWeight: "700", color: "#111" },
  nameHi: { fontSize: 12, color: BRAND_MUTED, marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" },
  priceOld: { fontSize: 11, color: BRAND_MUTED, textDecorationLine: "line-through" },
  priceFinal: { fontSize: 14, fontWeight: "800", color: BRAND_PRIMARY },
  discBadge: { backgroundColor: "#dcfce7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  discText: { fontSize: 10, fontWeight: "700", color: "#16a34a" },
  transport: { fontSize: 11, color: BRAND_MUTED },
  priceTap: { fontSize: 12, color: BRAND_MUTED, marginTop: 6 },
  chevron: { fontSize: 22, color: BRAND_MUTED, paddingRight: 16 },
});
