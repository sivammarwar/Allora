import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Switch,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function HeroSlotsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  const { data: slots = [], isLoading } = useQuery<any[]>({
    queryKey: ["hero-slots", user?.id],
    queryFn: () => api.get("/api/hero/slots") as any,
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/api/hero/slots/${id}`, { isActive }) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hero-slots"] }),
    onError: () => Alert.alert("Error", "Failed to update slot."),
  });

  const daySlots = slots.filter((s) => s.dayOfWeek === selectedDay);

  return (
    <View style={styles.screen}>
      {/* Day picker */}
      <View style={styles.dayRow}>
        {DAYS.map((d, i) => (
          <TouchableOpacity
            key={d}
            style={[styles.dayBtn, selectedDay === i && styles.dayBtnActive]}
            onPress={() => setSelectedDay(i)}
          >
            <Text style={[styles.dayText, selectedDay === i && styles.dayTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={BRAND_PRIMARY} style={{ marginTop: 40 }} />
      ) : daySlots.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🗓️</Text>
          <Text style={styles.emptyTitle}>No slots for {DAYS[selectedDay]}</Text>
          <Text style={styles.emptySub}>Your agent configures slots for you.</Text>
        </View>
      ) : (
        <FlatList
          data={daySlots}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.slotCard}>
              <View style={styles.slotInfo}>
                <Text style={styles.slotTime}>
                  {item.startTime} – {item.endTime}
                </Text>
                <Text style={styles.slotSub}>
                  {item.maxBookings} max · {item.currentBookings ?? 0} booked
                </Text>
              </View>
              <View style={styles.slotRight}>
                <Text style={[styles.slotStatus, { color: item.isActive ? "#10b981" : BRAND_MUTED }]}>
                  {item.isActive ? "Active" : "Off"}
                </Text>
                <Switch
                  value={item.isActive}
                  onValueChange={(val) => toggleMutation.mutate({ id: item.id, isActive: val })}
                  trackColor={{ false: "#e5e7eb", true: `${BRAND_PRIMARY}55` }}
                  thumbColor={item.isActive ? BRAND_PRIMARY : "#9ca3af"}
                />
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  dayRow: {
    flexDirection: "row", backgroundColor: "#fff",
    paddingHorizontal: 12, paddingVertical: 12, gap: 6,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  dayBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    alignItems: "center", backgroundColor: "#f3f4f6",
  },
  dayBtnActive: { backgroundColor: BRAND_PRIMARY },
  dayText: { fontSize: 11, fontWeight: "600", color: BRAND_MUTED },
  dayTextActive: { color: "#fff" },
  list: { padding: 16, gap: 10 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: { fontSize: 44, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#111", marginBottom: 6 },
  emptySub: { fontSize: 13, color: BRAND_MUTED, textAlign: "center" },
  slotCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.04, elevation: 2,
  },
  slotInfo: { flex: 1 },
  slotTime: { fontSize: 15, fontWeight: "700", color: "#111" },
  slotSub: { fontSize: 12, color: BRAND_MUTED, marginTop: 3 },
  slotRight: { alignItems: "center", gap: 4 },
  slotStatus: { fontSize: 11, fontWeight: "700" },
});
