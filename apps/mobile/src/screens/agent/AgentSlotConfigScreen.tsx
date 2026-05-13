import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, FlatList,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
function fmtHour(h: number) {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

export default function AgentSlotConfigScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ slotStartHour: number; slotEndHour: number }>({
    queryKey: ["agent-slot-config"],
    queryFn: () => api.get("/api/agent/slot-config") as any,
    enabled: !!user,
  });

  const startVal = start ?? data?.slotStartHour ?? 6;
  const endVal   = end   ?? data?.slotEndHour   ?? 20;

  const saveMut = useMutation({
    mutationFn: () => api.put("/api/agent/slot-config", { slotStartHour: startVal, slotEndHour: endVal }) as any,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agent-slot-config"] }); Alert.alert("✓ Saved", "Slot hours updated."); },
    onError: (e: any) => Alert.alert("Error", e?.message ?? "Failed"),
  });

  if (isLoading) return <View style={s.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;

  const windowHours = endVal > startVal ? endVal - startVal : 0;

  return (
    <ScrollView style={s.screen} showsVerticalScrollIndicator={false}>
      {/* Current window */}
      <View style={s.summaryCard}>
        <Text style={s.summaryIcon}>🕐</Text>
        <Text style={s.summaryTitle}>Current Booking Window</Text>
        <Text style={s.summaryWindow}>{fmtHour(startVal)} – {fmtHour(endVal)}</Text>
        <Text style={s.summaryHours}>{windowHours} hour{windowHours !== 1 ? "s" : ""} per day</Text>
      </View>

      {/* Start hour picker */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Opening Hour</Text>
        <FlatList
          data={HOURS}
          keyExtractor={(h) => String(h)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.hourList}
          renderItem={({ item: h }) => (
            <TouchableOpacity
              style={[s.hourChip, startVal === h && s.hourChipActive]}
              onPress={() => setStart(h)}
            >
              <Text style={[s.hourChipText, startVal === h && s.hourChipTextActive]}>{fmtHour(h)}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* End hour picker */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Closing Hour</Text>
        <FlatList
          data={HOURS}
          keyExtractor={(h) => String(h)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.hourList}
          renderItem={({ item: h }) => (
            <TouchableOpacity
              style={[s.hourChip, endVal === h && s.hourChipActive]}
              onPress={() => setEnd(h)}
            >
              <Text style={[s.hourChipText, endVal === h && s.hourChipTextActive]}>{fmtHour(h)}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={s.savePad}>
        <TouchableOpacity
          style={[s.saveBtn, (saveMut.isPending || endVal <= startVal) && s.btnDisabled]}
          onPress={() => {
            if (endVal <= startVal) { Alert.alert("Invalid", "Closing hour must be after opening hour."); return; }
            saveMut.mutate();
          }}
          disabled={saveMut.isPending || endVal <= startVal}
        >
          {saveMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>💾 Save Slot Hours</Text>}
        </TouchableOpacity>
        {endVal <= startVal && <Text style={s.warning}>⚠️ Closing must be after opening</Text>}
      </View>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  summaryCard: { backgroundColor: BRAND_PRIMARY, padding: 28, alignItems: "center" },
  summaryIcon: { fontSize: 32, marginBottom: 8 },
  summaryTitle: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 10 },
  summaryWindow: { color: "#fff", fontSize: 28, fontWeight: "800" },
  summaryHours: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 6 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 12 },
  hourList: { gap: 8, paddingRight: 16 },
  hourChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#e5e7eb" },
  hourChipActive: { backgroundColor: BRAND_PRIMARY, borderColor: BRAND_PRIMARY },
  hourChipText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  hourChipTextActive: { color: "#fff" },
  savePad: { paddingHorizontal: 16, paddingTop: 8 },
  saveBtn: { height: 52, borderRadius: 14, backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center" },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  warning: { fontSize: 12, color: "#ef4444", textAlign: "center", marginTop: 8 },
});
