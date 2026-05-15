import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function localDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function makeWeek(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return localDateStr(d);
  });
}

function fmtHour(h: number) {
  const ap = h < 12 ? "AM" : "PM";
  const start = h % 12 === 0 ? 12 : h % 12;
  const end = (h + 1) % 12 === 0 ? 12 : (h + 1) % 12;
  return `${start}-${end} ${ap}`;
}

export default function HeroSlotsScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const week = useMemo(makeWeek, []);
  const [selectedDate, setSelectedDate] = useState(week[0]);
  const rightScrollRef = useRef<ScrollView>(null);

  const toDate = useMemo(() => {
    const d = new Date(week[week.length - 1]); d.setDate(d.getDate() + 1);
    return localDateStr(d);
  }, [week]);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["hero-slots-cal", week[0]],
    queryFn: () => api.get(`/api/hero/slots?from=${week[0]}&to=${toDate}`) as any,
    enabled: !!user,
    retry: false,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const busyMutation = useMutation({
    mutationFn: ({ date, hour, isBusy }: { date: string; hour: number; isBusy: boolean }) =>
      api.post("/api/hero/slots/busy", { date, hour, isBusy }) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hero-slots-cal"] }),
    onError: (e: any) => Alert.alert("Error", e?.error ?? "Failed to update slot"),
  });

  const slotStart: number = data?.slotStartHour ?? 6;
  const slotEnd: number = data?.slotEndHour ?? 20;

  const slotMap = useMemo(() => {
    const map: Record<string, Record<number, any>> = {};
    for (const s of (data?.slots ?? [])) {
      const ds = new Date(s.date).toISOString().split("T")[0];
      if (!map[ds]) map[ds] = {};
      map[ds][s.hour] = s;
    }
    return map;
  }, [data]);

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = slotStart; h < slotEnd; h++) arr.push(h);
    return arr;
  }, [slotStart, slotEnd]);

  return (
    <View style={styles.screen}>

      {/* Legend bar */}
      <View style={styles.legendBar}>
        {[
          { color: "#f3f4f6", border: "#e5e7eb", label: "Available" },
          { color: "#fef9c3", border: "#fde047", label: "Busy" },
          { color: "#dcfce7", border: "#86efac", label: "Booked" },
        ].map(({ color, border, label }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendChip, { backgroundColor: color, borderColor: border }]} />
            <Text style={styles.legendLabel}>{label}</Text>
          </View>
        ))}
        <Text style={styles.legendHint}>Tap to toggle busy</Text>
      </View>

      {/* Two-column layout */}
      <View style={styles.body}>

        {/* LEFT: date sidebar */}
        <ScrollView
          style={styles.sidebar}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sidebarContent}
        >
          {week.map((d) => {
            const dt = new Date(d + "T12:00:00");
            const active = d === selectedDate;
            // count busy+booked slots for this day as a dot indicator
            const daySlots = slotMap[d] ?? {};
            const busyCount = Object.values(daySlots).filter((s: any) => s.isBusyByHero || s.isBooked).length;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.dateItem, active && styles.dateItemActive]}
                onPress={() => {
                  setSelectedDate(d);
                  rightScrollRef.current?.scrollTo({ y: 0, animated: true });
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.dateDay, active && styles.dateTextActive]}>
                  {DAYS[dt.getDay()]}
                </Text>
                <Text style={[styles.dateNum, active && styles.dateTextActive]}>
                  {dt.getDate()}
                </Text>
                <Text style={[styles.dateMon, active && styles.dateTextActive]}>
                  {MONTHS[dt.getMonth()]}
                </Text>
                {busyCount > 0 && (
                  <View style={[styles.dot, active && styles.dotActive]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* RIGHT: slot chips */}
        {isLoading ? (
          <View style={styles.rightLoader}>
            <ActivityIndicator color={BRAND_PRIMARY} />
          </View>
        ) : (
          <ScrollView
            ref={rightScrollRef}
            style={styles.slotPanel}
            contentContainerStyle={styles.slotGrid}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                colors={[BRAND_PRIMARY]} tintColor={BRAND_PRIMARY} />
            }
          >
            {hours.length === 0 ? (
              <Text style={styles.noSlots}>No slots configured</Text>
            ) : (
              hours.map((h) => {
                const slot = slotMap[selectedDate]?.[h];
                const isBooked = !!slot?.isBooked;
                const isBusy = !!slot?.isBusyByHero && !isBooked;
                const booking = slot?.serviceRequest;

                let bg = "#f3f4f6";
                let borderColor = "#e5e7eb";
                let labelColor = BRAND_MUTED;
                let statusLabel = "Free";
                if (isBooked) {
                  bg = "#dcfce7"; borderColor = "#86efac";
                  labelColor = "#15803d"; statusLabel = "Booked";
                } else if (isBusy) {
                  bg = "#fef9c3"; borderColor = "#fde047";
                  labelColor = "#92400e"; statusLabel = "Busy";
                }

                return (
                  <TouchableOpacity
                    key={h}
                    style={[styles.slotChip, { backgroundColor: bg, borderColor }]}
                    onPress={() => {
                      if (isBooked) {
                        Alert.alert(
                          "Booked slot",
                          booking
                            ? `👤 ${booking.userName ?? "Customer"}${booking.userPhone ? "\n📞 " + booking.userPhone : ""}`
                            : "This slot is booked."
                        );
                        return;
                      }
                      busyMutation.mutate({ date: selectedDate, hour: h, isBusy: !isBusy });
                    }}
                    disabled={busyMutation.isPending}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.slotTime}>
                      {fmtHour(h)}
                    </Text>
                    <Text style={[styles.slotStatus, { color: labelColor }]}>
                      {statusLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9fafb" },

  legendBar: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap",
    gap: 12, paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendChip: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5 },
  legendLabel: { fontSize: 11, fontWeight: "600", color: BRAND_MUTED },
  legendHint: { marginLeft: "auto" as any, fontSize: 10, color: "#d1d5db" },

  body: { flex: 1, flexDirection: "row" },

  /* ── Left sidebar ── */
  sidebar: {
    width: "20%",
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#f0f0f0",
  },
  sidebarContent: { paddingVertical: 8 },
  dateItem: {
    alignItems: "center", paddingVertical: 12, paddingHorizontal: 6,
    marginHorizontal: 8, marginVertical: 3,
    borderRadius: 14,
  },
  dateItemActive: { backgroundColor: BRAND_PRIMARY },
  dateDay: { fontSize: 10, fontWeight: "700", color: BRAND_MUTED, letterSpacing: 0.3 },
  dateNum: { fontSize: 20, fontWeight: "900", color: "#111", marginTop: 1 },
  dateMon: { fontSize: 9, fontWeight: "600", color: BRAND_MUTED, marginTop: 1 },
  dateTextActive: { color: "#fff" },
  dot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: BRAND_PRIMARY, marginTop: 4,
  },
  dotActive: { backgroundColor: "#fff" },

  /* ── Right slot panel ── */
  rightLoader: { flex: 1, alignItems: "center", justifyContent: "center" },
  slotPanel: { flex: 1 },
  slotGrid: {
    flexDirection: "row", flexWrap: "wrap",
    padding: 12, gap: 8,
  },
  slotChip: {
    width: "46%",
    paddingVertical: 10, paddingHorizontal: 10,
    borderRadius: 12, borderWidth: 1.5,
    alignItems: "center",
  },
  slotTime: { fontSize: 13, fontWeight: "800", color: "#111" },
  slotStatus: { fontSize: 10, fontWeight: "700", marginTop: 3 },
  noSlots: { fontSize: 13, color: BRAND_MUTED, padding: 20 },
});
