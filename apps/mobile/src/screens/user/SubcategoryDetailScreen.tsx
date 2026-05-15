import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, FlatList,
  TouchableOpacity, Image, ActivityIndicator, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { storage } from "../../lib/storage";
import { BRAND_PRIMARY, BRAND_MUTED } from "../../lib/config";
import { useAuth } from "../../auth/AuthContext";
import type { UserStackParams } from "../../navigation/types";

type Props = NativeStackScreenProps<UserStackParams, "SubcategoryDetail">;
interface StoredLocation { lat: number; lng: number; name?: string }

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function makeWeekDates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return localDateStr(d);
  });
}

function formatDateTab(s: string): { day: string; num: string; mon: string } {
  const d = new Date(s + "T12:00:00");
  return { day: DAYS[d.getDay()], num: String(d.getDate()), mon: MONTHS[d.getMonth()] };
}

function formatHour(h: number, dur = 1): string {
  const fmt = (n: number) => {
    const ap = n < 12 ? "AM" : "PM";
    const h12 = n % 12 || 12;
    return `${h12} ${ap}`;
  };
  return `${fmt(h)} – ${fmt(h + dur)}`;
}

export default function SubcategoryDetailScreen({ route, navigation }: Props) {
  const { id, agentId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [loc, setLoc] = useState<StoredLocation | null>(null);
  const [locLoaded, setLocLoaded] = useState(false);
  const weekDates = makeWeekDates();
  const [selectedDate, setSelectedDate] = useState(weekDates[0]);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", gender: "" });
  const [formPrefilled, setFormPrefilled] = useState(false);

  useEffect(() => {
    storage.getJSON<StoredLocation>("user_location").then((l) => {
      setLoc(l ?? null); setLocLoaded(true);
    });
  }, []);

  const { data: profile } = useQuery<any>({
    queryKey: ["user-profile"],
    queryFn: () => api.get("/api/user/profile") as any,
    enabled: !!user,
  });

  // Self-resolve agentId from location if not passed as a nav param
  const { data: agentResolve } = useQuery<{ agentId: string | null }>({
    queryKey: ["sub-agent", loc?.lat, loc?.lng],
    queryFn: () => api.get(`/api/user/my-agent?lat=${loc!.lat}&lng=${loc!.lng}`) as any,
    enabled: locLoaded && !!loc && !agentId,
  });
  const resolvedAgentId: string | undefined = agentId ?? agentResolve?.agentId ?? undefined;

  // ── Subcategory detail ─────────────────────────────────────────────────────
  const { data: detail, isLoading } = useQuery<any>({
    queryKey: ["sub", id, loc?.lat, loc?.lng],
    queryFn: () => api.get(`/api/user/subcategories/${id}?lat=${loc!.lat}&lng=${loc!.lng}`) as any,
    enabled: locLoaded && !!loc,
  });

  const sub = detail?.subcategory;
  const pricing = detail?.pricing;
  const discountPercent: number = detail?.discountPercent ?? 0;
  const transportPerKm: number = detail?.transportChargePerKm ?? 0;
  const baseCharge = pricing ? Number(pricing.serviceCharge) : null;
  const finalCharge = baseCharge != null
    ? baseCharge * (1 - discountPercent / 100)
    : null;

  // ── Slots ─────────────────────────────────────────────────────────────────
  const { data: slotData } = useQuery<any>({
    queryKey: ["slots", id, resolvedAgentId],
    queryFn: () =>
      api.get(`/api/user/subcategories/${id}/slots?agentId=${resolvedAgentId}&from=${weekDates[0]}&days=7`) as any,
    enabled: !!resolvedAgentId,
  });
  const slots: Record<string, { hour: number; available: boolean }[]> = slotData?.slots ?? {};
  const slotDur: number = slotData?.slotDurationHours ?? 1;
  const todaySlots = slots[selectedDate] ?? [];

  // ── Other services in same category ───────────────────────────────────────
  const categoryId = sub?.categoryId;
  const { data: otherServices = [] } = useQuery<any[]>({
    queryKey: ["cat-subs", categoryId, loc?.lat, loc?.lng],
    queryFn: () =>
      api.get(`/api/user/categories/${categoryId}/subcategories?lat=${loc!.lat}&lng=${loc!.lng}`) as any,
    enabled: !!categoryId && !!loc,
    select: (data: any[]) => data.filter((s) => s.id !== id),
  });

  // ── Booking ────────────────────────────────────────────────────────────────
  const bookMutation = useMutation({
    mutationFn: (payload: any) => api.post("/api/user/service-requests", payload) as any,
    onSuccess: (booking: any) => {
      setBookingModal(false);
      Alert.alert("Confirmed! 🎉", "Your booking is placed.", [
        { text: "View Order", onPress: () => navigation.navigate("OrderDetail", { id: booking.id }) },
        { text: "OK" },
      ]);
    },
    onError: (e: any) =>
      Alert.alert("Booking failed", e?.message ?? "Something went wrong. Please try again."),
  });

  const handleBookNow = () => {
    if (!user) { navigation.navigate("GuestLogin", { role: "USER" }); return; }
    if (selectedHour === null) {
      Alert.alert("Select a slot", "Please pick a date and time slot first.");
      return;
    }
    if (!formPrefilled && profile) {
      const defaultAddr =
        profile.savedAddresses?.find((a: any) => a.isDefault)?.address ??
        profile.savedAddresses?.[0]?.address ??
        "";
      setForm({
        name: profile.name ?? "",
        phone: profile.phone ?? "",
        address: defaultAddr,
        gender: profile.gender ?? "",
      });
      setFormPrefilled(true);
    }
    setBookingModal(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      Alert.alert("Required", "Name, phone and address are required.");
      return;
    }
    bookMutation.mutate({
      subcategoryId: id,
      agentId: resolvedAgentId!,
      scheduledDate: selectedDate,
      scheduledHour: selectedHour!,
      userName: form.name.trim(),
      userPhone: form.phone.trim(),
      userAddress: form.address.trim(),
      userGender: form.gender.trim() || undefined,
      userLat: loc?.lat,
      userLng: loc?.lng,
    });
  };

  if (!locLoaded || isLoading) {
    return <View style={styles.center}><ActivityIndicator color={BRAND_PRIMARY} size="large" /></View>;
  }

  if (!loc) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📍</Text>
        <Text style={styles.emptyTitle}>Location required</Text>
        <Text style={styles.emptyMsg}>Go back to Home and set your location first.</Text>
      </View>
    );
  }

  if (!sub) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>😕</Text>
        <Text style={styles.emptyTitle}>Not available here</Text>
        <Text style={styles.emptyMsg}>No heroes offer this service in your area yet.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>

        {/* ── Hero image ──────────────────────────────────────────── */}
        {sub.imageUrl
          ? <Image source={{ uri: sub.imageUrl }} style={styles.banner} />
          : <View style={[styles.banner, styles.bannerPlaceholder]} />
        }

        <View style={styles.body}>
          {/* ── Breadcrumb + title ──────────────────────────────── */}
          <Text style={styles.breadcrumb}>{sub.category?.name}</Text>
          <Text style={styles.title}>{sub.name}</Text>

          {/* ── Pricing card ────────────────────────────────────── */}
          {baseCharge != null && (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Service charge</Text>
              </View>
              <View style={styles.priceRow}>
                {discountPercent > 0 && (
                  <Text style={styles.priceOld}>₹{baseCharge.toFixed(0)}</Text>
                )}
                <Text style={styles.priceFinal}>₹{finalCharge!.toFixed(0)}</Text>
                {discountPercent > 0 && (
                  <View style={styles.discBadge}>
                    <Text style={styles.discText}>{discountPercent}% off</Text>
                  </View>
                )}
              </View>
              {transportPerKm > 0 && (
                <View style={[styles.cardRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 10 }]}>
                  <Text style={styles.cardLabel}>Transport</Text>
                  <Text style={styles.transportVal}>₹{transportPerKm}/km</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Available Slots ──────────────────────────────────── */}
          {resolvedAgentId ? (
            <>
              <Text style={styles.sectionTitle}>Available Slots</Text>
              <Text style={styles.sectionSub}>
                {formatDateTab(weekDates[0]).num} {formatDateTab(weekDates[0]).mon} –{" "}
                {formatDateTab(weekDates[6]).num} {formatDateTab(weekDates[6]).mon}
              </Text>

              {/* Date tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
                {weekDates.map((d) => {
                  const { day, num, mon } = formatDateTab(d);
                  const active = d === selectedDate;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[styles.dateTab, active && styles.dateTabActive]}
                      onPress={() => { setSelectedDate(d); setSelectedHour(null); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.dateTabDay, active && styles.dateTabTextActive]}>{day}</Text>
                      <Text style={[styles.dateTabNum, active && styles.dateTabTextActive]}>{num}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Time slots */}
              <View style={styles.slotGrid}>
                {todaySlots.length === 0 ? (
                  <Text style={styles.noSlots}>No slots for this day</Text>
                ) : (
                  (() => {
                    const now = new Date();
                    const todayLocal = localDateStr(now);
                    const currentHour = now.getHours();
                    return todaySlots.map(({ hour, available }) => {
                      const isPast = selectedDate === todayLocal && hour <= currentHour;
                      const disabled = !available || isPast;
                      const sel = selectedHour === hour;
                      return (
                        <TouchableOpacity
                          key={hour}
                          style={[
                            styles.slotChip,
                            disabled && styles.slotChipUnavailable,
                            isPast && styles.slotChipPast,
                            sel && styles.slotChipSelected,
                          ]}
                          onPress={() => !disabled && setSelectedHour(sel ? null : hour)}
                          activeOpacity={disabled ? 1 : 0.75}
                          disabled={disabled}
                        >
                          <Text style={[
                            styles.slotText,
                            disabled && styles.slotTextUnavailable,
                            sel && styles.slotTextSelected,
                          ]}>
                            {formatHour(hour, slotDur)}
                          </Text>
                          {isPast && (
                            <Text style={styles.slotPastLabel}>past</Text>
                          )}
                        </TouchableOpacity>
                      );
                    });
                  })()
                )}
              </View>
            </>
          ) : null}

          {/* ── Other services ──────────────────────────────────── */}
          {otherServices.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Other services in {sub.category?.name}</Text>
              <FlatList
                data={otherServices}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.otherCard}
                    onPress={() => navigation.replace("SubcategoryDetail", { id: item.id, agentId: resolvedAgentId })}
                    activeOpacity={0.85}
                  >
                    {item.imageUrl
                      ? <Image source={{ uri: item.imageUrl }} style={styles.otherImg} />
                      : <View style={[styles.otherImg, styles.otherImgPlaceholder]} />
                    }
                    <Text style={styles.otherName} numberOfLines={2}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Sticky Book Now ─────────────────────────────────────────── */}
      <View style={[styles.stickyBar, { paddingBottom: insets.bottom + 8 }]}>
        {selectedHour !== null && (
          <Text style={styles.selectedSlotLabel}>
            {formatDateTab(selectedDate).day} {formatDateTab(selectedDate).num}{" "}
            {formatDateTab(selectedDate).mon} · {formatHour(selectedHour, slotDur)}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.bookBtn, bookMutation.isPending && styles.bookBtnDisabled]}
          onPress={handleBookNow}
          disabled={bookMutation.isPending}
          activeOpacity={0.85}
        >
          <Text style={styles.bookText}>
            {bookMutation.isPending
              ? "Booking…"
              : selectedHour === null
              ? "Select a slot to book"
              : !user
              ? "Sign in to book →"
              : "Book Now →"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Booking form modal ──────────────────────────────────────── */}
      <Modal visible={bookingModal} animationType="slide" transparent onRequestClose={() => setBookingModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Confirm Booking</Text>
            <Text style={styles.modalSub}>
              {sub.name} · {formatDateTab(selectedDate).day} {formatDateTab(selectedDate).num}{" "}
              {formatDateTab(selectedDate).mon} · {selectedHour !== null ? formatHour(selectedHour, slotDur) : ""}
            </Text>

            <Text style={styles.fieldLabel}>Your name *</Text>
            <TextInput style={styles.input} placeholder="Full name"
              value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />

            <Text style={styles.fieldLabel}>Phone number *</Text>
            <TextInput style={styles.input} placeholder="+91 XXXXX XXXXX"
              keyboardType="phone-pad" value={form.phone}
              onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />

            <Text style={styles.fieldLabel}>Service address *</Text>
            <TextInput style={[styles.input, styles.inputMulti]} placeholder="Full address"
              multiline numberOfLines={2} value={form.address}
              onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} />

            <Text style={styles.fieldLabel}>Gender (optional)</Text>
            <TextInput style={styles.input} placeholder="e.g. Female"
              value={form.gender} onChangeText={(v) => setForm((f) => ({ ...f, gender: v }))} />

            <TouchableOpacity
              style={[styles.bookBtn, { marginTop: 16 }, bookMutation.isPending && styles.bookBtnDisabled]}
              onPress={handleSubmit}
              disabled={bookMutation.isPending}
            >
              <Text style={styles.bookText}>{bookMutation.isPending ? "Confirming…" : "Confirm Booking"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setBookingModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  emptyMsg: { fontSize: 14, color: BRAND_MUTED, textAlign: "center", lineHeight: 20 },
  banner: { width: "100%", height: 220 },
  bannerPlaceholder: { backgroundColor: "#fce7f3" },
  body: { padding: 20 },
  breadcrumb: { fontSize: 12, color: BRAND_MUTED, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 16 },
  card: {
    backgroundColor: "#f9fafb", borderRadius: 16, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: "#f0f0f0",
  },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLabel: { fontSize: 13, color: BRAND_MUTED, fontWeight: "600" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" },
  priceOld: { fontSize: 16, color: BRAND_MUTED, textDecorationLine: "line-through" },
  priceFinal: { fontSize: 26, fontWeight: "900", color: "#111" },
  discBadge: { backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  discText: { fontSize: 12, fontWeight: "700", color: "#16a34a" },
  transportVal: { fontSize: 15, fontWeight: "700", color: "#111" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111", marginBottom: 2, marginTop: 4 },
  sectionSub: { fontSize: 12, color: BRAND_MUTED, marginBottom: 4 },
  dateTab: {
    width: 52, paddingVertical: 10, borderRadius: 14,
    alignItems: "center", backgroundColor: "#f3f4f6",
  },
  dateTabActive: { backgroundColor: BRAND_PRIMARY },
  dateTabDay: { fontSize: 11, fontWeight: "600", color: BRAND_MUTED },
  dateTabNum: { fontSize: 18, fontWeight: "800", color: "#111", marginTop: 2 },
  dateTabTextActive: { color: "#fff" },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 8 },
  slotChip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb",
  },
  slotChipUnavailable: { backgroundColor: "#f9fafb", borderColor: "#f0f0f0" },
  slotChipPast: { opacity: 0.45 },
  slotChipSelected: { backgroundColor: BRAND_PRIMARY, borderColor: BRAND_PRIMARY },
  slotText: { fontSize: 13, fontWeight: "600", color: "#111" },
  slotTextUnavailable: { color: "#d1d5db" },
  slotTextSelected: { color: "#fff" },
  slotPastLabel: { fontSize: 9, color: "#d1d5db", fontWeight: "600", marginTop: 2, textAlign: "center" },
  noSlots: { fontSize: 13, color: BRAND_MUTED, marginTop: 8 },
  otherCard: { width: 120, borderRadius: 14, overflow: "hidden", backgroundColor: "#f9fafb" },
  otherImg: { width: 120, height: 90 },
  otherImgPlaceholder: { backgroundColor: "#fce7f3" },
  otherName: { fontSize: 12, fontWeight: "600", color: "#111", padding: 8 },
  stickyBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: "#f0f0f0",
    shadowColor: "#000", shadowOpacity: 0.08, shadowOffset: { width: 0, height: -3 }, elevation: 8,
  },
  selectedSlotLabel: { fontSize: 12, color: BRAND_MUTED, textAlign: "center", marginBottom: 8 },
  bookBtn: { height: 54, borderRadius: 16, backgroundColor: BRAND_PRIMARY, alignItems: "center", justifyContent: "center" },
  bookBtnDisabled: { opacity: 0.6 },
  bookText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: "#e5e7eb", borderRadius: 4, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 4 },
  modalSub: { fontSize: 13, color: BRAND_MUTED, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111",
  },
  inputMulti: { height: 72, textAlignVertical: "top" },
  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelText: { fontSize: 15, color: BRAND_MUTED, fontWeight: "600" },
});
