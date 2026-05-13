import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator,
  Alert, FlatList, Dimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { PermissionsAndroid, Platform as RNPlatform } from "react-native";
import Geolocation from "@react-native-community/geolocation";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../../lib/api";
import { storage } from "../../lib/storage";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import type { UserStackParams } from "../../navigation/types";

type NavProp = NativeStackNavigationProp<UserStackParams>;

const W = Dimensions.get("window").width;

interface Location { lat: number; lng: number; name?: string }
interface Category {
  id: string; name: string; type: string;
  imageUrl: string | null; subcategories: { id: string }[];
}
interface SubItem {
  id: string; name: string; imageUrl: string | null;
  categoryName: string; avgRating?: number; ratingCount?: number;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,locality,place&limit=1&access_token=pk.eyJ1IjoiYWxsb3JhLWFwcCIsImEiOiJjbHVzYTZlbGsxMGF4MmpxZW85aGMzaDE2In0.TEST`
    );
    const j = await res.json();
    return j?.features?.[0]?.place_name?.split(",")[0] ?? `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  } catch {
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }
}

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const [loc, setLoc] = useState<Location | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    loadStoredLocation();
  }, []);

  const loadStoredLocation = async () => {
    const stored = await storage.getJSON<Location>("user_location");
    if (stored) { setLoc(stored); return; }
    requestLocation();
  };

  const requestLocation = async () => {
    setLocating(true);
    if (RNPlatform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert("Location needed", "Please allow location access to see nearby services.");
        setLocating(false);
        return;
      }
    }
    Geolocation.getCurrentPosition(
      async (pos: { coords: { latitude: number; longitude: number } }) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const name = await reverseGeocode(lat, lng);
        const l = { lat, lng, name };
        await storage.setJSON("user_location", l);
        setLoc(l);
        setLocating(false);
      },
      () => {
        Alert.alert("Location needed", "Please allow location access to see nearby services.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const { data: viral = [], isLoading: viralLoading } = useQuery<SubItem[]>({
    queryKey: ["viral"],
    queryFn: () => api.get("/api/user/viral-subcategories") as any,
  });

  const { data: mostRated = [], isLoading: ratedLoading } = useQuery<SubItem[]>({
    queryKey: ["mostRated"],
    queryFn: () => api.get("/api/user/most-rated-subcategories") as any,
  });

  const { data: browse } = useQuery<{ services: Category[]; products: Category[] }>({
    queryKey: ["browse", loc?.lat, loc?.lng],
    queryFn: () => api.get(`/api/user/browse?lat=${loc!.lat}&lng=${loc!.lng}`) as any,
    enabled: !!loc,
  });

  const { data: agentData } = useQuery<{ agentId: string | null }>({
    queryKey: ["myAgent", loc?.lat, loc?.lng],
    queryFn: () => api.get(`/api/user/my-agent?lat=${loc!.lat}&lng=${loc!.lng}`) as any,
    enabled: !!loc,
    retry: false,
  });

  const agentId = agentData?.agentId ?? null;

  const goToSub = (id: string) =>
    navigation.navigate("SubcategoryDetail", { id, agentId: agentId ?? undefined });

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>

      {/* ── Location bar ─────────────────────────────────────────── */}
      <TouchableOpacity style={styles.locBar} onPress={requestLocation}>
        <Text style={styles.locPin}>📍</Text>
        {locating ? (
          <ActivityIndicator size="small" color={BRAND_PRIMARY} style={{ marginLeft: 6 }} />
        ) : (
          <Text style={styles.locText} numberOfLines={1}>
            {loc?.name ?? "Detecting location…"}
          </Text>
        )}
        <Text style={styles.locChevron}>⌄</Text>
      </TouchableOpacity>

      {/* ── Trending ─────────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionBadge}>TRENDING</Text>
        <Text style={styles.sectionTitle}>Most Used</Text>
      </View>

      {viralLoading ? (
        <ActivityIndicator color={BRAND_PRIMARY} style={{ marginVertical: 20 }} />
      ) : (
        <FlatList
          data={viral.slice(0, 6)}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.hList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.hCard} onPress={() => goToSub(item.id)}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.hCardImg} />
              ) : (
                <View style={[styles.hCardImg, styles.hCardPlaceholder]} />
              )}
              <Text style={styles.hCardCat} numberOfLines={1}>{item.categoryName}</Text>
              <Text style={styles.hCardName} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ── Browse Services ──────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionBadge}>BROWSE</Text>
        <Text style={styles.sectionTitle}>Services</Text>
      </View>

      {!loc ? (
        <TouchableOpacity style={styles.locPrompt} onPress={requestLocation}>
          <Text style={styles.locPromptText}>📍 Allow location to see services near you</Text>
        </TouchableOpacity>
      ) : !browse ? (
        <ActivityIndicator color={BRAND_PRIMARY} style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.grid}>
          {browse.services.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.catCard}
              onPress={() => navigation.navigate("CategoryDetail", { id: cat.id })}
            >
              {cat.imageUrl ? (
                <Image source={{ uri: cat.imageUrl }} style={styles.catImg} />
              ) : (
                <View style={[styles.catImg, styles.catPlaceholder]} />
              )}
              <View style={styles.catOverlay}>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catCount}>{cat.subcategories.length} services</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Most Rated ───────────────────────────────────────────── */}
      {mostRated.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionBadge}>TOP RATED</Text>
            <Text style={styles.sectionTitle}>Most Rated</Text>
          </View>
          <FlatList
            data={mostRated}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.hList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.ratedCard} onPress={() => goToSub(item.id)}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.ratedImg} />
                ) : (
                  <View style={[styles.ratedImg, styles.hCardPlaceholder]} />
                )}
                <View style={styles.ratedInfo}>
                  <Text style={styles.hCardCat} numberOfLines={1}>{item.categoryName}</Text>
                  <Text style={styles.hCardName} numberOfLines={2}>{item.name}</Text>
                  {item.avgRating != null && (
                    <Text style={styles.star}>⭐ {item.avgRating.toFixed(1)} ({item.ratingCount})</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        </>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  locBar: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "#fff5f7", borderRadius: 50,
    borderWidth: 1, borderColor: "#fecdd3",
  },
  locPin: { fontSize: 14 },
  locText: { flex: 1, marginLeft: 6, fontSize: 13, fontWeight: "600", color: "#111" },
  locChevron: { fontSize: 16, color: BRAND_PRIMARY },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 6 },
  sectionBadge: { fontSize: 10, fontWeight: "700", color: BRAND_PRIMARY, letterSpacing: 1.5 },
  sectionTitle: { fontSize: 26, fontWeight: "800", color: "#111", lineHeight: 30 },
  hList: { paddingHorizontal: 16, gap: 12, paddingVertical: 4 },
  hCard: { width: 140, borderRadius: 16, overflow: "hidden", backgroundColor: "#f9fafb" },
  hCardImg: { width: 140, height: 110 },
  hCardPlaceholder: { backgroundColor: "#fce7f3" },
  hCardCat: { fontSize: 9, color: BRAND_MUTED, paddingHorizontal: 10, paddingTop: 8, textTransform: "uppercase", letterSpacing: 0.8 },
  hCardName: { fontSize: 13, fontWeight: "700", color: "#111", paddingHorizontal: 10, paddingBottom: 10, lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10, paddingTop: 8 },
  catCard: {
    width: (W - 44) / 2, borderRadius: 18, overflow: "hidden",
    backgroundColor: "#f3f4f6", minHeight: 160,
  },
  catImg: { width: "100%", height: 160 },
  catPlaceholder: { backgroundColor: "#fce7f3" },
  catOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 12, paddingVertical: 10,
  },
  catName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  catCount: { color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 2 },
  ratedCard: { width: 160, borderRadius: 16, overflow: "hidden", backgroundColor: "#f9fafb" },
  ratedImg: { width: 160, height: 110 },
  ratedInfo: { padding: 10 },
  star: { fontSize: 11, color: "#92400e", marginTop: 4 },
  locPrompt: {
    marginHorizontal: 16, marginTop: 12, padding: 16,
    backgroundColor: "#fff5f7", borderRadius: 14,
    borderWidth: 1, borderColor: "#fecdd3", borderStyle: "dashed",
  },
  locPromptText: { textAlign: "center", fontSize: 13, color: BRAND_MUTED },
});
