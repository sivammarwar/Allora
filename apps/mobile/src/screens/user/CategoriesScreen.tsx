import React, { useRef, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { api } from "../../lib/api";
import { storage } from "../../lib/storage";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";
import type { UserTabParams, UserStackParams } from "../../navigation/types";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type Props = BottomTabScreenProps<UserTabParams, "Categories">;
type StackNav = NativeStackNavigationProp<UserStackParams>;

interface StoredLocation { lat: number; lng: number; name?: string }
interface Category {
  id: string; name: string; nameHi?: string | null;
  type: "SERVICE" | "PRODUCT"; imageUrl: string | null;
}
interface BrowseResponse { services: Category[]; products: Category[] }
interface Subcategory { id: string; name: string; nameHi?: string | null; imageUrl: string | null }

export default function CategoriesScreen(_props: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNav>();
  const { lang } = useLanguage();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"SERVICE" | "PRODUCT" | null>(null);
  const [loc, setLoc] = useState<StoredLocation | null>(null);
  const [locLoaded, setLocLoaded] = useState(false);
  const gridRef = useRef<FlatList>(null);
  const prevFirstId = useRef<string | null>(null);

  // Re-read location each time tab gains focus — fixes race condition
  useFocusEffect(
    useCallback(() => {
      storage.getJSON<StoredLocation>("user_location").then((l) => {
        setLoc(l ?? null);
        setLocLoaded(true);
      });
    }, [])
  );

  // Step 1: resolve agentId for this location (mirrors web category page)
  const { data: agentData } = useQuery<{ agentId: string | null }>({
    queryKey: ["cat-agent", loc?.lat, loc?.lng],
    queryFn: () => api.get(`/api/user/my-agent?lat=${loc!.lat}&lng=${loc!.lng}`) as any,
    enabled: !!loc,
    retry: false,
  });
  const agentId = agentData?.agentId ?? null;

  // Step 2: fetch location-filtered categories via /browse (same as web dashboard)
  const { data: browseData, isLoading: browseLoading } = useQuery<BrowseResponse>({
    queryKey: ["cat-browse", loc?.lat, loc?.lng],
    queryFn: () => api.get(`/api/user/browse?lat=${loc!.lat}&lng=${loc!.lng}`) as any,
    enabled: !!loc,
  });

  // Fallback: all categories when no location stored
  const { data: allCats = [], isLoading: allCatsLoading } = useQuery<Category[]>({
    queryKey: ["all-categories-fallback"],
    queryFn: () => api.get("/api/user/categories") as any,
    enabled: locLoaded && !loc,
  });

  const sidebarCats: Category[] = loc
    ? [...(browseData?.services ?? []), ...(browseData?.products ?? [])]
    : allCats;
  const catsLoading = loc ? browseLoading : allCatsLoading;

  // Auto-select first category when list changes
  if (sidebarCats.length > 0 && prevFirstId.current !== sidebarCats[0].id) {
    prevFirstId.current = sidebarCats[0].id;
    if (!selectedId || !sidebarCats.find((c) => c.id === selectedId)) {
      setSelectedId(sidebarCats[0].id);
      setSelectedType(sidebarCats[0].type);
    }
  }

  // Step 3a: subcategories for SERVICE categories (with agentId for pricing)
  const { data: subcategories = [], isLoading: subsLoading } = useQuery<Subcategory[]>({
    queryKey: ["cat-subs", selectedId, loc?.lat, loc?.lng, agentId],
    queryFn: () => {
      const base = `/api/user/categories/${selectedId}/subcategories?lat=${loc!.lat}&lng=${loc!.lng}`;
      return api.get(agentId ? `${base}&agentId=${agentId}` : base) as any;
    },
    enabled: !!selectedId && !!loc && selectedType === "SERVICE",
  });

  // Step 3b: products for PRODUCT categories
  const { data: products = [], isLoading: productsLoading } = useQuery<Subcategory[]>({
    queryKey: ["cat-products", selectedId, loc?.lat, loc?.lng],
    queryFn: () =>
      api.get(`/api/user/categories/${selectedId}/products?lat=${loc!.lat}&lng=${loc!.lng}`) as any,
    enabled: !!selectedId && !!loc && selectedType === "PRODUCT",
  });

  const gridItems = selectedType === "PRODUCT" ? products : subcategories;
  const gridLoading = selectedType === "PRODUCT" ? productsLoading : subsLoading;

  const handleCategoryPress = (item: Category) => {
    setSelectedId(item.id);
    setSelectedType(item.type);
    gridRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const renderSidebarItem = ({ item }: { item: Category }) => {
    const active = item.id === selectedId;
    return (
      <TouchableOpacity
        style={[styles.sideItem, active && styles.sideItemActive]}
        onPress={() => handleCategoryPress(item)}
        activeOpacity={0.7}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.sideIcon}
          />
        ) : (
          <View style={[styles.sideIconPlaceholder, active && styles.sideIconPlaceholderActive]}>
            <Text style={styles.sideIconEmoji}>🗂️</Text>
          </View>
        )}
        <Text style={[styles.sideLabel, active && styles.sideLabelActive]} numberOfLines={2}>
          {lang === "hi" && item.nameHi ? item.nameHi : item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCard = ({ item }: { item: Subcategory }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("SubcategoryDetail", {
        id: item.id,
        agentId: agentId ?? undefined,
      })}
      activeOpacity={0.85}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImg} />
      ) : (
        <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
          <Text style={styles.cardEmoji}>✂️</Text>
        </View>
      )}
      <Text style={styles.cardName} numberOfLines={2}>
        {lang === "hi" && item.nameHi ? item.nameHi : item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Categories</Text>
        {catsLoading && <ActivityIndicator size="small" color={BRAND_PRIMARY} style={{ marginLeft: 8 }} />}
        {loc && (
          <Text style={styles.headerLoc} numberOfLines={1}>
            📍 {loc.name ?? `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}`}
          </Text>
        )}
      </View>

      {locLoaded && !loc && (
        <View style={styles.locBanner}>
          <Text style={styles.locBannerText}>📍 Set your location on Home tab to see services near you</Text>
        </View>
      )}
      {locLoaded && loc && !browseLoading && sidebarCats.length === 0 && (
        <View style={styles.locBanner}>
          <Text style={styles.locBannerText}>No verified heroes found in your area yet.</Text>
        </View>
      )}

      {/* ── Body: sidebar + grid ────────────────────────────────── */}
      <View style={styles.body}>
        <View style={styles.sidebarWrapper}>
          <FlatList
            data={sidebarCats}
            keyExtractor={(i) => i.id}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            renderItem={renderSidebarItem}
          />
        </View>

        <View style={styles.gridWrapper}>
          <FlatList
            ref={gridRef}
            key={selectedId ?? "empty"}
            data={gridItems}
            keyExtractor={(i) => i.id}
            numColumns={2}
            style={{ flex: 1 }}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.cardRow}
            ListEmptyComponent={
              !locLoaded || gridLoading ? (
                <View style={styles.gridLoader}>
                  <ActivityIndicator color={BRAND_PRIMARY} size="large" />
                </View>
              ) : !loc ? (
                <View style={styles.gridLoader}>
                  <Text style={styles.emptyText}>📍 Set location to see services</Text>
                </View>
              ) : (
                <View style={styles.gridLoader}>
                  <Text style={styles.emptyText}>No services in your area</Text>
                  <Text style={[styles.emptyText, { marginTop: 4, fontSize: 11 }]}>
                    {"📍 " + loc.lat.toFixed(4) + ", " + loc.lng.toFixed(4)}
                  </Text>
                </View>
              )
            }
            renderItem={renderCard}
          />
        </View>
      </View>
    </View>
  );
}

const CARD_GAP = 10;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111", flex: 1 },
  headerLoc: { fontSize: 11, color: BRAND_MUTED, maxWidth: 140 },

  body: { flex: 1, flexDirection: "row" },
  locBanner: {
    backgroundColor: "#fffbeb", paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#fde68a",
  },
  locBannerText: { fontSize: 12, color: "#92400e" },

  // ── Sidebar ──────────────────────────────────────────────────────
  sidebarWrapper: { flex: 3, backgroundColor: "#f5f5f5" },
  sideItem: {
    alignItems: "center", paddingVertical: 10, paddingHorizontal: 1,
    borderLeftWidth: 3, borderLeftColor: "transparent",
    backgroundColor: "#f5f5f5",
  },
  sideItemActive: {
    backgroundColor: "#fff",
    borderLeftColor: BRAND_PRIMARY,
  },
  sideIcon: { width: 28, height: 28, borderRadius: 5 },
  sideIconPlaceholder: {
    width: 28, height: 28, borderRadius: 5,
    backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center",
  },
  sideIconPlaceholderActive: { backgroundColor: "#ede9fe" },
  sideIconEmoji: { fontSize: 20 },
  sideLabel: {
    fontSize: 9, color: "#555", textAlign: "center",
    marginTop: 4, lineHeight: 12,
  },
  sideLabelActive: { color: BRAND_PRIMARY, fontWeight: "700" },

  // ── Right grid ───────────────────────────────────────────────────
  gridWrapper: { flex: 7, backgroundColor: "#fff" },
  gridContent: { padding: CARD_GAP },
  cardRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
  gridLoader: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyText: { fontSize: 14, color: BRAND_MUTED },

  card: {
    flex: 1,
    backgroundColor: "#fff", borderRadius: 14, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  cardImg: { width: "100%", aspectRatio: 1.2 },
  cardImgPlaceholder: { backgroundColor: "#fce7f3", alignItems: "center", justifyContent: "center" },
  cardEmoji: { fontSize: 32 },
  cardName: {
    fontSize: 12, fontWeight: "600", color: "#111",
    padding: 8, lineHeight: 16,
  },
});
