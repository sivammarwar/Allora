import React from "react";
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, Linking, Alert,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

interface AgentArea {
  id: string; name: string; code: string;
  polygon?: { coordinates: number[][][] };
}

function openAreaOnMaps(area: AgentArea) {
  if (!area.polygon?.coordinates?.[0]?.length) {
    Alert.alert("No location", "No polygon data available for this area.");
    return;
  }
  // Compute centroid of polygon for Maps link
  const coords = area.polygon.coordinates[0];
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}&z=14`);
}

export default function AgentAreasScreen() {
  const { user } = useAuth();

  const { data: areas = [], isLoading, refetch } = useQuery<AgentArea[]>({
    queryKey: ["agent-areas"],
    queryFn: () => api.get("/api/agent/areas") as any,
    enabled: !!user,
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }

  return (
    <FlatList
      data={areas}
      keyExtractor={(a) => a.id}
      style={styles.screen}
      contentContainerStyle={areas.length === 0 ? styles.emptyWrap : styles.list}
      onRefresh={refetch}
      refreshing={isLoading}
      ListHeaderComponent={
        <Text style={styles.heading}>
          {areas.length} area{areas.length !== 1 ? "s" : ""} assigned to you
        </Text>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>No areas assigned</Text>
          <Text style={styles.emptySub}>Contact your admin to get service areas assigned to you.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.areaIcon}>
              <Text style={styles.areaIconText}>{item.name[0]?.toUpperCase() ?? "A"}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.areaName}>{item.name}</Text>
              <Text style={styles.areaCode}>{item.code}</Text>
            </View>
          </View>
          {item.polygon && (
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => openAreaOnMaps(item)}
            >
              <Text style={styles.mapBtnText}>📍 View on Google Maps</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 12 },
  emptyWrap: { flex: 1 },
  heading: { fontSize: 14, color: BRAND_MUTED, marginBottom: 8 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.05, elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  areaIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: `${BRAND_PRIMARY}18`, alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  areaIconText: { fontSize: 20, fontWeight: "800", color: BRAND_PRIMARY },
  cardInfo: { flex: 1 },
  areaName: { fontSize: 16, fontWeight: "700", color: "#111" },
  areaCode: { fontFamily: "monospace", fontSize: 11, color: BRAND_MUTED, marginTop: 2 },
  mapBtn: {
    height: 42, borderRadius: 10, backgroundColor: `${BRAND_PRIMARY}14`,
    alignItems: "center", justifyContent: "center",
  },
  mapBtnText: { fontSize: 13, fontWeight: "700", color: BRAND_PRIMARY },
});
