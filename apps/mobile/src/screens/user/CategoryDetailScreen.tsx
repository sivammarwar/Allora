import React from "react";
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, Image, ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import type { UserStackParams } from "../../navigation/types";

type Props = NativeStackScreenProps<UserStackParams, "CategoryDetail">;

export default function CategoryDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;

  const { data: cat, isLoading } = useQuery<any>({
    queryKey: ["category", id],
    queryFn: () => api.get(`/api/user/categories/${id}`) as any,
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }

  return (
    <FlatList
      data={cat?.subcategories ?? []}
      keyExtractor={(i: any) => i.id}
      style={styles.screen}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text style={styles.heading}>{cat?.name}</Text>
      }
      renderItem={({ item }: { item: any }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("SubcategoryDetail", { id: item.id })}
        >
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.img} />
          ) : (
            <View style={[styles.img, styles.imgPlaceholder]} />
          )}
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            {item.pricing && (
              <Text style={styles.price}>from ₹{item.pricing.baseServiceCharge}</Text>
            )}
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 10 },
  heading: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 12 },
  card: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: 14, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  img: { width: 80, height: 80 },
  imgPlaceholder: { backgroundColor: "#fce7f3" },
  info: { flex: 1, paddingHorizontal: 14 },
  name: { fontSize: 14, fontWeight: "700", color: "#111" },
  price: { fontSize: 12, color: BRAND_PRIMARY, marginTop: 3 },
  chevron: { fontSize: 22, color: BRAND_MUTED, paddingRight: 14 },
});
