import React from "react";
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";

interface MyReview {
  id: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  category?: { name: string; imageUrl?: string | null };
}

function Stars({ rating }: { rating: number }) {
  return (
    <Text style={styles.stars}>
      {Array.from({ length: 5 }, (_, i) => (i < rating ? "★" : "☆")).join("")}
    </Text>
  );
}

export default function MyReviewsScreen() {
  const { t } = useLanguage();

  const { data: reviews = [], isLoading } = useQuery<MyReview[]>({
    queryKey: ["my-reviews"],
    queryFn: () => api.get("/api/user/my-reviews") as any,
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }

  return (
    <FlatList
      style={styles.screen}
      data={reviews}
      keyExtractor={(r) => r.id}
      contentContainerStyle={reviews.length === 0 ? styles.emptyWrap : styles.list}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyTitle}>{t("reviews.empty")}</Text>
          <Text style={styles.emptySub}>{t("reviews.emptySub")}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            {item.category?.imageUrl ? (
              <Image source={{ uri: item.category.imageUrl }} style={styles.catImg} />
            ) : (
              <View style={styles.catImgPlaceholder}><Text style={{ fontSize: 18 }}>🛠️</Text></View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.catName}>{item.category?.name ?? "Service"}</Text>
              <Text style={styles.date}>
                {t("reviews.on")} {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
            <Stars rating={item.rating} />
          </View>
          {!!item.reviewText && (
            <Text style={styles.reviewText}>{item.reviewText}</Text>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  list: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  catImg: { width: 44, height: 44, borderRadius: 10, marginRight: 12 },
  catImgPlaceholder: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: "#f3f4f6",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  cardInfo: { flex: 1 },
  catName: { fontSize: 14, fontWeight: "700", color: "#111", marginBottom: 2 },
  date: { fontSize: 11, color: BRAND_MUTED },
  stars: { fontSize: 16, color: "#f59e0b", letterSpacing: 1 },
  reviewText: { fontSize: 13, color: "#374151", lineHeight: 19, borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 10 },
});
