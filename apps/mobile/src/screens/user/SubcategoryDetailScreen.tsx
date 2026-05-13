import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Image, ActivityIndicator, Alert,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import type { UserStackParams } from "../../navigation/types";

type Props = NativeStackScreenProps<UserStackParams, "SubcategoryDetail">;

export default function SubcategoryDetailScreen({ route, navigation }: Props) {
  const { id, agentId } = route.params;
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const { data: sub, isLoading } = useQuery<any>({
    queryKey: ["sub", id],
    queryFn: () => api.get(`/api/user/subcategories/${id}`) as any,
  });

  const { data: heroes = [] } = useQuery<any[]>({
    queryKey: ["sub-heroes", id],
    queryFn: () => api.get(`/api/user/subcategories/${id}/heroes${agentId ? `?agentId=${agentId}` : ""}`) as any,
  });

  const bookMutation = useMutation({
    mutationFn: (payload: any) => api.post("/api/user/bookings", payload) as any,
    onSuccess: (booking: any) => {
      Alert.alert("Booked!", "Your booking has been placed.", [
        { text: "OK", onPress: () => navigation.navigate("OrderDetail", { id: booking.id }) },
      ]);
    },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed to book."),
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      {sub?.imageUrl ? (
        <Image source={{ uri: sub.imageUrl }} style={styles.hero} />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]} />
      )}

      <View style={styles.body}>
        <Text style={styles.name}>{sub?.name}</Text>
        {sub?.pricing && (
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{sub.pricing.baseServiceCharge}</Text>
            {sub.pricing.discountPercent > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{sub.pricing.discountPercent}% off</Text>
              </View>
            )}
          </View>
        )}

        {sub?.description ? (
          <Text style={styles.desc}>{sub.description}</Text>
        ) : null}

        {/* Heroes */}
        {heroes.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Available Heroes</Text>
            {heroes.map((h: any) => (
              <View key={h.id} style={styles.heroCard}>
                <View style={styles.heroAvatar}>
                  <Text style={styles.heroInitial}>{(h.name ?? "H")[0].toUpperCase()}</Text>
                </View>
                <View style={styles.heroInfo}>
                  <Text style={styles.heroName}>{h.name ?? "Hero"}</Text>
                  {h.avgRating != null && (
                    <Text style={styles.heroRating}>⭐ {h.avgRating.toFixed(1)} ({h.ratingCount})</Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        <TouchableOpacity
          style={[styles.bookBtn, bookMutation.isPending && styles.bookBtnDisabled]}
          onPress={() => bookMutation.mutate({ subcategoryId: id, agentId, slotId: selectedSlot })}
          disabled={bookMutation.isPending}
        >
          <Text style={styles.bookText}>
            {bookMutation.isPending ? "Booking…" : "Book Now →"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { width: "100%", height: 240 },
  heroPlaceholder: { backgroundColor: "#fce7f3" },
  body: { padding: 20 },
  name: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 8 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  price: { fontSize: 22, fontWeight: "700", color: BRAND_PRIMARY },
  discountBadge: { backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  discountText: { fontSize: 11, color: "#16a34a", fontWeight: "700" },
  desc: { fontSize: 14, color: "#4b5563", lineHeight: 22, marginBottom: 20 },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 10, marginTop: 8 },
  heroCard: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  heroAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  heroInitial: { color: "#fff", fontSize: 18, fontWeight: "700" },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 14, fontWeight: "600", color: "#111" },
  heroRating: { fontSize: 12, color: BRAND_MUTED, marginTop: 2 },
  bookBtn: {
    marginTop: 24, height: 54, borderRadius: 16,
    backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center",
  },
  bookBtnDisabled: { opacity: 0.6 },
  bookText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
