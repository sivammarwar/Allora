import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator, Modal,
  Alert, FlatList, Dimensions, TextInput, RefreshControl,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PermissionsAndroid, Platform as RNPlatform } from "react-native";
import Geolocation from "@react-native-community/geolocation";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/api";
import { storage } from "../../lib/storage";
import { BRAND_PRIMARY, BRAND_MUTED, MAPBOX_TOKEN } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";
import LocationPickerModal, { PickedLocation } from "../../components/LocationPickerModal";
import type { UserStackParams } from "../../navigation/types";

type NavProp = NativeStackNavigationProp<UserStackParams>;
const W = Dimensions.get("window").width;

// ── Types matching the API exactly ──────────────────────────────────────────
interface UserLocation { lat: number; lng: number; name?: string }

interface Pricing {
  baseServiceCharge: number;
  discountPercent: number;
  transportChargePerKm: number | null;
}
interface SubcategoryCategory {
  id: string; name: string; type: string; imageUrl: string | null;
}
interface ViralItem {
  id: string; name: string; nameHi?: string | null; imageUrl: string | null; viralImageUrl?: string | null;
  viralPosition: number | null; category: SubcategoryCategory; pricing: Pricing | null;
}
interface NewlyAddedItem {
  id: string; name: string; nameHi?: string | null; imageUrl: string | null; viralImageUrl?: string | null;
  newlyAddedPosition: number | null; category: SubcategoryCategory; pricing: Pricing | null;
}
interface MostRatedItem {
  id: string; name: string; nameHi?: string | null; imageUrl: string | null;
  categoryName: string; categoryType: string;
  avgRating: number; ratingCount: number;
}
interface BrowseCategory {
  id: string; name: string; nameHi?: string | null; type: string;
  imageUrl: string | null; subcategories: { id: string }[];
}
interface BrowseResponse { services: BrowseCategory[]; products: BrowseCategory[] }
type AvgRatings = Record<string, { avg: number; count: number }>

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // Try Mapbox first
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,locality,place&limit=1&access_token=${MAPBOX_TOKEN}`,
      { headers: { Accept: "application/json" } }
    );
    const j = await res.json();
    const name = j?.features?.[0]?.place_name?.split(",").slice(0, 2).join(",").trim();
    if (name) return name;
  } catch {}
  // Fallback: OpenStreetMap Nominatim (free, no key needed)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en", "User-Agent": "BharatServicesApp/1.0" } }
    );
    const j = await res.json();
    const a = j?.address;
    const name = a?.neighbourhood ?? a?.suburb ?? a?.city_district ?? a?.city ?? a?.town ?? a?.village;
    if (name) return `${name}${a?.city ? ", " + a.city : ""}`;
  } catch {}
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
}

type Lang = "en" | "hi";

function getGreetingKey(): "greeting.morning" | "greeting.afternoon" | "greeting.evening" {
  const h = new Date().getHours();
  if (h < 12) return "greeting.morning";
  if (h < 17) return "greeting.afternoon";
  return "greeting.evening";
}

interface SearchSub {
  id: string; name: string; nameHi: string | null;
  categoryId: string; categoryName: string; categoryType: string;
  imageUrl: string | null; isPinned: boolean; viralPosition: number | null; isActive: boolean;
}

// ── Pricing pill helper ──────────────────────────────────────────────────────
function PricingPill({ pricing }: { pricing: Pricing }) {
  const final = pricing.baseServiceCharge * (1 - pricing.discountPercent / 100);
  return (
    <View style={styles.pricePill}>
      <View style={styles.priceRow}>
        {pricing.discountPercent > 0 && (
          <Text style={styles.priceOld}>₹{pricing.baseServiceCharge.toFixed(0)}</Text>
        )}
        <Text style={styles.priceFinal}>₹{final.toFixed(0)}</Text>
        {pricing.discountPercent > 0 && (
          <View style={styles.discBadge}>
            <Text style={styles.discText}>{pricing.discountPercent}% off</Text>
          </View>
        )}
      </View>
      {pricing.transportChargePerKm != null && (
        <Text style={styles.transport}>· ₹{pricing.transportChargePerKm}/km</Text>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loc, setLoc] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const queryClient = useQueryClient();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  useEffect(() => { loadStoredLocation(); }, []);

  const loadStoredLocation = async () => {
    const stored = await storage.getJSON<UserLocation>("user_location");
    if (stored) setLoc(stored);
    requestLocation();
  };

  const requestLocation = async () => {
    setLocating(true);
    try {
      if (RNPlatform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          { title: "Location Permission", message: "Bharat Services needs your location to show nearby services.", buttonPositive: "Allow" }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("Location needed", "Please allow location to see services near you.");
          setLocating(false); return;
        }
      }
      Geolocation.getCurrentPosition(
        async (pos: { coords: { latitude: number; longitude: number } }) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const name = await reverseGeocode(lat, lng);
          const l = { lat, lng, name };
          await storage.setJSON("user_location", l);
          setLoc(l); setLocating(false);
        },
        (err) => {
          console.warn("[geo] error:", err.code, err.message);
          setLocating(false);
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
      );
    } catch (e) { console.warn("[geo]", e); setLocating(false); }
  };

  // ── API Queries ─────────────────────────────────────────────────────────────
  const { data: viral = [], isLoading: viralLoading, isError: viralError, error: viralErr } = useQuery<ViralItem[]>({
    queryKey: ["viral-subcategories"],
    queryFn: () => api.get("/api/user/viral-subcategories") as any,
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: newlyAdded = [], isLoading: newlyLoading, isError: newlyError } = useQuery<NewlyAddedItem[]>({
    queryKey: ["newly-added-subcategories"],
    queryFn: () => api.get("/api/user/newly-added-subcategories") as any,
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: mostRated = [], isLoading: ratedLoading, isError: ratedError } = useQuery<MostRatedItem[]>({
    queryKey: ["most-rated-subcategories"],
    queryFn: () => api.get("/api/user/most-rated-subcategories") as any,
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const apiDown = viralError && !viralLoading;

  const { data: avgRatings = {} } = useQuery<AvgRatings>({
    queryKey: ["categories-avg-ratings"],
    queryFn: () => api.get("/api/user/categories/avg-ratings") as any,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: browse, isLoading: browseLoading } = useQuery<BrowseResponse>({
    queryKey: ["browse", loc?.lat, loc?.lng],
    queryFn: () => api.get(`/api/user/browse?lat=${loc!.lat}&lng=${loc!.lng}`) as any,
    enabled: !!loc,
    staleTime: 2 * 60 * 1000, // 2 minutes (location-based, shorter cache)
  });

  const { data: allSubs = [] } = useQuery<SearchSub[]>({
    queryKey: ["all-subs-search"],
    queryFn: () => api.get("/api/user/subcategories") as any,
    staleTime: 5 * 60 * 1000,
  });

  const activeSubs = allSubs.filter((s) => s.isActive);
  const trimmed = searchQuery.trim();
  const searchResults = trimmed.length < 2
    ? []
    : activeSubs.filter((s) =>
        s.name.toLowerCase().includes(trimmed.toLowerCase()) ||
        (s.nameHi ?? "").includes(trimmed) ||
        s.categoryName.toLowerCase().includes(trimmed.toLowerCase())
      ).slice(0, 20);
  const trendingChips = activeSubs
    .filter((s) => s.isPinned || s.viralPosition != null)
    .sort((a, b) => (a.viralPosition ?? 999) - (b.viralPosition ?? 999))
    .slice(0, 8);
  const grouped = searchResults.reduce<Record<string, { catName: string; catType: string; items: SearchSub[] }>>(
    (acc, s) => {
      if (!acc[s.categoryId]) acc[s.categoryId] = { catName: s.categoryName, catType: s.categoryType, items: [] };
      acc[s.categoryId].items.push(s);
      return acc;
    }, {});

  const { data: agentData } = useQuery<{ agentId: string | null }>({
    queryKey: ["my-agent", loc?.lat, loc?.lng],
    queryFn: () => api.get(`/api/user/my-agent?lat=${loc!.lat}&lng=${loc!.lng}`) as any,
    enabled: !!loc,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes (location-based)
  });

  const agentId = agentData?.agentId ?? null;
  const goToSub = (id: string) =>
    navigation.navigate("SubcategoryDetail", { id, agentId: agentId ?? undefined });

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND_PRIMARY]} tintColor={BRAND_PRIMARY} />
        }
      >

        {/* ── Brand header ──────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerTopRow}>
            <Text style={styles.greeting}>{t(getGreetingKey())} 👋</Text>
            <View style={styles.headerActions}>
              {!user && (
                <>
                  <TouchableOpacity
                    style={styles.heroLoginBtn}
                    onPress={() => navigation.navigate("GuestLogin", { role: "HERO" })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.heroLoginText}>Hero Login</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.agentLoginBtn}
                    onPress={() => navigation.navigate("GuestLogin", { role: "AGENT" })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.agentLoginText}>Regional Officer</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={styles.langToggle}
                onPress={() => setLang(lang === "en" ? "hi" : "en")}
                activeOpacity={0.7}
              >
                <Text style={styles.langToggleText}>
                  {lang === "en" ? t("common.switchToHindi") : t("common.switchToEnglish")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}><Text style={styles.logoPin}>📍</Text></View>
            <Text style={styles.logoText}>Bharat Services</Text>
          </View>
          <Text style={styles.tagline}>{t("home.tagline")}</Text>
          <TouchableOpacity style={styles.searchBar} onPress={() => setSearchOpen(true)} activeOpacity={0.85}>
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchPlaceholder}>{t("search.pill")}</Text>
          </TouchableOpacity>
        </View>

        {/* ── API error / dev diagnostic banner ────────────────── */}
        {apiDown && (
          <View style={styles.apiBanner}>
            <Text style={styles.apiBannerTitle}>⚠️ Cannot reach the API server</Text>
            <Text style={styles.apiBannerMsg}>
              {"URL: " + (require("../../lib/config").API_URL) + "\n" +
               "Error: " + ((viralErr as any)?.message ?? (viralErr as any)?.error ?? JSON.stringify(viralErr)) + "\n\n" +
               "Android emulator? Change API_URL to http://10.0.2.2:4000\n" +
               "Physical device? Use your Mac's local IP (e.g. http://192.168.x.x:4000)\n" +
               "Or point to production: https://api.bharat333.com"}
            </Text>
          </View>
        )}

        {/* ── Location card (floats over header bottom) ─────────── */}
        <View style={styles.locBar}>
          <View style={styles.locLeft}>
            <View style={styles.locIconBox}><Text style={styles.locIconText}>📍</Text></View>
            <View style={styles.locTextBox}>
              <Text style={styles.locLabel}>{t("home.yourLocation")}</Text>
              {locating ? (
                <View style={styles.locatingRow}>
                  <ActivityIndicator size="small" color={BRAND_PRIMARY} />
                  <Text style={styles.locatingText}> {t("home.detecting")}</Text>
                </View>
              ) : (
                <Text style={styles.locAddress} numberOfLines={1}>
                  {loc?.name ?? t("home.tapToSet")}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.locActions}>
            <TouchableOpacity style={styles.locMapBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
              <Text style={styles.locMapBtnText}>🗺️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.locRefresh} onPress={requestLocation} activeOpacity={0.7}>
              <Text style={styles.locRefreshText}>↻</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Section 1: TRENDING / Most Used ───────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionBadge}>📈  {t("home.trending")}</Text>
          <Text style={styles.sectionTitle}>{t("home.mostUsed")}</Text>
        </View>
        {viralLoading ? (
          <ActivityIndicator color={BRAND_PRIMARY} style={{ marginVertical: 20 }} />
        ) : viral.length === 0 ? (
          <Text style={styles.emptyNote}>{t("home.noFeatured")}</Text>
        ) : (
          <FlatList
            data={viral}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.hList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.hCard} onPress={() => goToSub(item.id)} activeOpacity={0.85}>
                {(item.viralImageUrl ?? item.imageUrl) ? (
                  <Image source={{ uri: (item.viralImageUrl ?? item.imageUrl)! }} style={styles.hCardImg} />
                ) : (
                  <View style={[styles.hCardImg, styles.hCardPlaceholder]} />
                )}
                <View style={styles.hCardBody}>
                  <Text style={styles.hCardCat} numberOfLines={1}>{item.category.name}</Text>
                  <Text style={styles.hCardName} numberOfLines={2}>{lang === "hi" && item.nameHi ? item.nameHi : item.name}</Text>
                  {item.pricing && <PricingPill pricing={item.pricing} />}
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        {/* ── Section 2: BROWSE SERVICES (location-dependent) ───── */}
        <View style={styles.divider} />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionBadge}>📦  {t("home.browse")}</Text>
          <Text style={styles.sectionTitle}>{t("home.services")}</Text>
          {browse?.services && (
            <Text style={styles.sectionCount}>{browse.services.length} {t("home.categories")}</Text>
          )}
        </View>
        {!loc ? (
          <TouchableOpacity style={styles.locPrompt} onPress={requestLocation} activeOpacity={0.8}>
            <Text style={styles.locPromptText}>📍 Allow location to see services near you</Text>
          </TouchableOpacity>
        ) : browseLoading ? (
          <View style={styles.grid}>
            {[1, 2, 3, 4].map((k) => <View key={k} style={styles.catSkeleton} />)}
          </View>
        ) : !browse?.services?.length ? (
          <Text style={styles.emptyNote}>{t("home.noServices")}</Text>
        ) : (
          <View style={styles.grid}>
            {browse.services.map((cat) => {
              const rating = avgRatings[cat.id];
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.catCard}
                  onPress={() => navigation.navigate("CategoryDetail", { id: cat.id })}
                  activeOpacity={0.9}
                >
                  {cat.imageUrl ? (
                    <Image source={{ uri: cat.imageUrl }} style={styles.catImg} />
                  ) : (
                    <View style={[styles.catImg, styles.catPlaceholder]} />
                  )}
                  {rating && (
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingBadgeText}>⭐ {rating.avg.toFixed(1)}</Text>
                    </View>
                  )}
                  <View style={styles.catOverlay}>
                    <Text style={styles.catName}>{lang === "hi" && cat.nameHi ? cat.nameHi : cat.name}</Text>
                    <Text style={styles.catCount}>{cat.subcategories.length} {t("home.servicesAvailable")}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Section 3: NEWLY ADDED ────────────────────────────── */}
        {(newlyLoading || newlyAdded.length > 0 || newlyError) && (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionBadge}>✨  {t("home.newlyAdded").toUpperCase()}</Text>
              <Text style={styles.sectionTitle}>{t("home.newlyAdded")}</Text>
            </View>
            {newlyLoading ? (
              <ActivityIndicator color={BRAND_PRIMARY} style={{ marginVertical: 20 }} />
            ) : newlyError ? (
              <Text style={styles.emptyNote}>Could not load — check API connection</Text>
            ) : newlyAdded.length === 0 ? (
              <Text style={styles.emptyNote}>{t("home.noFeatured")}</Text>
            ) : (
              <FlatList
                data={newlyAdded}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(i) => i.id}
                contentContainerStyle={styles.hList}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.hCard} onPress={() => goToSub(item.id)} activeOpacity={0.85}>
                    {(item.viralImageUrl ?? item.imageUrl) ? (
                      <Image source={{ uri: (item.viralImageUrl ?? item.imageUrl)! }} style={styles.hCardImg} />
                    ) : (
                      <View style={[styles.hCardImg, styles.hCardPlaceholder]} />
                    )}
                    <View style={styles.hCardBody}>
                      <Text style={styles.hCardCat} numberOfLines={1}>{item.category.name}</Text>
                      <Text style={styles.hCardName} numberOfLines={2}>{lang === "hi" && item.nameHi ? item.nameHi : item.name}</Text>
                      {item.pricing && <PricingPill pricing={item.pricing} />}
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </>
        )}

        {/* ── Section 4: MOST RATED ─────────────────────────────── */}
        {(ratedLoading || mostRated.length > 0 || ratedError) && (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionBadge}>⭐  {t("home.topRated").toUpperCase()}</Text>
              <Text style={styles.sectionTitle}>{t("home.topRated")}</Text>
            </View>
            {ratedLoading ? (
              <ActivityIndicator color={BRAND_PRIMARY} style={{ marginVertical: 20 }} />
            ) : ratedError ? (
              <Text style={styles.emptyNote}>Could not load — check API connection</Text>
            ) : (
              <FlatList
                data={mostRated}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(i) => i.id}
                contentContainerStyle={styles.hList}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.ratedCard} onPress={() => goToSub(item.id)} activeOpacity={0.85}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.ratedImg} />
                    ) : (
                      <View style={[styles.ratedImg, styles.hCardPlaceholder]} />
                    )}
                    <View style={styles.ratedInfo}>
                      <Text style={styles.hCardCat} numberOfLines={1}>{item.categoryName}</Text>
                      <Text style={styles.hCardName} numberOfLines={2}>{lang === "hi" && item.nameHi ? item.nameHi : item.name}</Text>
                      <View style={styles.starRow}>
                        <Text style={styles.starText}>⭐ {item.avgRating.toFixed(1)}</Text>
                        <Text style={styles.ratingCount}>({item.ratingCount})</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Search Overlay ────────────────────────────────────── */}
      <Modal visible={searchOpen} animationType="slide" transparent onRequestClose={() => setSearchOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.overlayPanel}>
            {/* Top bar */}
            <View style={styles.overlayTopBar}>
              <View style={styles.overlayInput}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  autoFocus
                  style={styles.overlayInputText}
                  placeholder={t("search.placeholder")}
                  placeholderTextColor={BRAND_MUTED}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Text style={{ fontSize: 16, color: BRAND_MUTED }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.overlayCancelBtn} onPress={() => { setSearchOpen(false); setSearchQuery(""); }}>
                <Text style={styles.overlayCancelText}>{t("search.cancel")}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              {/* Trending chips — shown when no query */}
              {trimmed.length < 2 && trendingChips.length > 0 && (
                <>
                  <Text style={styles.overlaySectionLabel}>✨ {t("search.trending")}</Text>
                  <View style={styles.trendingRow}>
                    {trendingChips.map((s) => (
                      <TouchableOpacity key={s.id} style={styles.trendingChip} onPress={() => setSearchQuery(lang === "hi" && s.nameHi ? s.nameHi : s.name)}>
                        <Text style={styles.trendingChipText}>{lang === "hi" && s.nameHi ? s.nameHi : s.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* No results */}
              {trimmed.length >= 2 && searchResults.length === 0 && (
                <View style={styles.noResultsBox}>
                  <Text style={{ fontSize: 32 }}>🔍</Text>
                  <Text style={styles.noResultsText}>{t("search.noResults", { query: trimmed })}</Text>
                  <Text style={styles.noResultsHint}>{t("search.tryDifferent")}</Text>
                </View>
              )}

              {/* Grouped results */}
              {Object.entries(grouped).map(([catId, group]) => (
                <View key={catId}>
                  <View style={styles.resultCatHeader}>
                    <Text style={styles.resultCatLabel}>{group.catName}</Text>
                    <View style={[styles.resultTypeBadge, { backgroundColor: group.catType === "SERVICE" ? "#eff6ff" : "#fff7ed" }]}>
                      <Text style={[styles.resultTypeBadgeText, { color: group.catType === "SERVICE" ? "#3b82f6" : "#f97316" }]}>
                        {group.catType === "SERVICE" ? t("search.service") : t("search.product")}
                      </Text>
                    </View>
                  </View>
                  {group.items.map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      style={styles.resultRow}
                      onPress={() => { setSearchOpen(false); setSearchQuery(""); goToSub(sub.id); }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.resultThumb}>
                        {sub.imageUrl
                          ? <Image source={{ uri: sub.imageUrl }} style={styles.resultThumbImg} />
                          : <Text style={styles.resultThumbEmoji}>✂️</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName} numberOfLines={1}>
                          {lang === "hi" && sub.nameHi ? sub.nameHi : sub.name}
                        </Text>
                        <Text style={styles.resultCat}>{group.catName}</Text>
                      </View>
                      <Text style={{ color: BRAND_MUTED, fontSize: 16 }}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
          {/* Tap outside to close */}
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { setSearchOpen(false); setSearchQuery(""); }} />
        </View>
      </Modal>

      {/* ── Location Picker Modal ──────────────────────────────── */}
      <LocationPickerModal
        visible={pickerOpen}
        initialLoc={loc}
        onConfirm={async (picked: PickedLocation) => {
          const l: UserLocation = { lat: picked.lat, lng: picked.lng, name: picked.name };
          await storage.setJSON("user_location", l);
          setLoc(l);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  // ── Header ──────────────────────────────────────────────────────────────
  header: { backgroundColor: BRAND_PRIMARY, paddingHorizontal: 20, paddingBottom: 28 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  greeting: { fontSize: 14, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  langToggle: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  langToggleText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  logoRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  logoBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginRight: 8 },
  logoPin: { fontSize: 18 },
  logoText: { fontSize: 30, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: "rgba(255,255,255,0.75)", marginBottom: 18 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 14, height: 48, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchPlaceholder: { flex: 1, fontSize: 14, color: BRAND_MUTED },
  searchInput: { flex: 1, fontSize: 14, color: "#111" },
  // ── Search overlay ───────────────────────────────────────────────────────
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  overlayPanel: { backgroundColor: "#fff", maxHeight: "88%" },
  overlayTopBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  overlayInput: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f3f4f6", borderRadius: 20, paddingHorizontal: 14, height: 42 },
  overlayInputText: { flex: 1, fontSize: 14, color: "#111" },
  overlayCancelBtn: { paddingHorizontal: 4 },
  overlayCancelText: { fontSize: 14, fontWeight: "600", color: BRAND_PRIMARY },
  overlayScroll: { padding: 16 },
  overlaySectionLabel: { fontSize: 10, fontWeight: "800", color: BRAND_MUTED, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, marginTop: 6 },
  trendingRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  trendingChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  trendingChipText: { fontSize: 13, color: "#333" },
  resultCatHeader: { backgroundColor: "#f9fafb", paddingHorizontal: 14, paddingVertical: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#f0f0f0", flexDirection: "row", alignItems: "center", gap: 6 },
  resultCatLabel: { fontSize: 10, fontWeight: "700", color: BRAND_MUTED, textTransform: "uppercase", letterSpacing: 1 },
  resultTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  resultTypeBadgeText: { fontSize: 9, fontWeight: "700" },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  resultThumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fce7f3", overflow: "hidden" },
  resultThumbImg: { width: 44, height: 44 },
  resultThumbEmoji: { fontSize: 22, textAlign: "center", lineHeight: 44 },
  resultName: { fontSize: 14, fontWeight: "600", color: "#111" },
  resultCat: { fontSize: 11, color: BRAND_MUTED, marginTop: 2 },
  noResultsBox: { alignItems: "center", paddingVertical: 48, gap: 8 },
  noResultsText: { fontSize: 14, fontWeight: "600", color: "#555" },
  noResultsHint: { fontSize: 12, color: BRAND_MUTED },
  // ── Location bar ─────────────────────────────────────────────────────────
  locBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginTop: -18, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fff", borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  locLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  locIconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#fff5f7", alignItems: "center", justifyContent: "center", marginRight: 12 },
  locIconText: { fontSize: 18 },
  locTextBox: { flex: 1 },
  locLabel: { fontSize: 10, color: BRAND_MUTED, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  locAddress: { fontSize: 14, fontWeight: "700", color: "#111" },
  locatingRow: { flexDirection: "row", alignItems: "center" },
  locatingText: { fontSize: 13, color: BRAND_MUTED },
  locActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  locMapBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#fff5f7", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#fecdd3" },
  locMapBtnText: { fontSize: 16 },
  locRefresh: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  locRefreshText: { fontSize: 18, color: BRAND_PRIMARY, fontWeight: "700" },
  // ── Section headers ──────────────────────────────────────────────────────
  divider: { height: 1, backgroundColor: "#f3f4f6", marginHorizontal: 16, marginVertical: 8 },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 },
  sectionBadge: { fontSize: 10, fontWeight: "700", color: BRAND_PRIMARY, letterSpacing: 1.5, marginBottom: 2 },
  sectionTitle: { fontSize: 26, fontWeight: "800", color: "#111", lineHeight: 30 },
  sectionCount: { fontSize: 12, color: BRAND_MUTED, marginTop: 4 },
  emptyNote: { marginHorizontal: 16, marginTop: 8, marginBottom: 8, fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  // ── Horizontal cards (viral / newly-added) ───────────────────────────────
  hList: { paddingHorizontal: 16, gap: 12, paddingVertical: 8 },
  hCard: { width: 148, borderRadius: 16, overflow: "hidden", backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  hCardImg: { width: 148, height: 110 },
  hCardPlaceholder: { backgroundColor: "#fce7f3" },
  hCardBody: { padding: 10 },
  hCardCat: { fontSize: 9, color: BRAND_MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  hCardName: { fontSize: 13, fontWeight: "700", color: "#111", lineHeight: 18, marginBottom: 6 },
  // ── Pricing pill ─────────────────────────────────────────────────────────
  pricePill: { gap: 2 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  priceOld: { fontSize: 11, color: BRAND_MUTED, textDecorationLine: "line-through" },
  priceFinal: { fontSize: 13, fontWeight: "800", color: BRAND_PRIMARY },
  discBadge: { backgroundColor: "#dcfce7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  discText: { fontSize: 10, fontWeight: "700", color: "#16a34a" },
  transport: { fontSize: 10, color: BRAND_MUTED, marginTop: 1 },
  // ── Browse grid ──────────────────────────────────────────────────────────
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10, paddingTop: 8 },
  catCard: { width: (W - 44) / 2, borderRadius: 18, overflow: "hidden", backgroundColor: "#f3f4f6", minHeight: 160 },
  catSkeleton: { width: (W - 44) / 2, height: 160, borderRadius: 18, backgroundColor: "#f3f4f6" },
  catImg: { width: "100%", height: 160 },
  catPlaceholder: { backgroundColor: "#fce7f3" },
  ratingBadge: { position: "absolute", top: 10, left: 10, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  ratingBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  catOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 12, paddingVertical: 10 },
  catName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  catCount: { color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 2 },
  // ── Most rated cards ─────────────────────────────────────────────────────
  ratedCard: { width: 160, borderRadius: 16, overflow: "hidden", backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  ratedImg: { width: 160, height: 110 },
  ratedInfo: { padding: 10 },
  starRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  starText: { fontSize: 12, fontWeight: "700", color: "#92400e" },
  ratingCount: { fontSize: 11, color: BRAND_MUTED },
  // ── Location prompt ──────────────────────────────────────────────────────
  locPrompt: { marginHorizontal: 16, marginTop: 12, padding: 16, backgroundColor: "#fff5f7", borderRadius: 14, borderWidth: 1, borderColor: "#fecdd3", borderStyle: "dashed" },
  locPromptText: { textAlign: "center", fontSize: 13, color: BRAND_MUTED },
  // ── API error banner ──────────────────────────────────────────────────────
  apiBanner: { margin: 16, padding: 14, backgroundColor: "#fef2f2", borderRadius: 12, borderWidth: 1, borderColor: "#fca5a5" },
  apiBannerTitle: { fontSize: 13, fontWeight: "700", color: "#dc2626", marginBottom: 6 },
  apiBannerMsg: { fontSize: 11, color: "#7f1d1d", lineHeight: 17 },
  // ── Header actions row ────────────────────────────────────────────────────
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroLoginBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: BRAND_PRIMARY, borderRadius: 20 },
  heroLoginText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  agentLoginBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#f3f4f6", borderRadius: 20, marginLeft: 8 },
  agentLoginText: { fontSize: 12, fontWeight: "700", color: "#374151" },
});
