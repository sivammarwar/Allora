import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, FlatList, Dimensions,
  TouchableOpacity, Image, ActivityIndicator, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, PermissionsAndroid,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Geolocation from "@react-native-community/geolocation";
import { WebView } from "react-native-webview";
import { api } from "../../lib/api";
import { storage } from "../../lib/storage";
import { BRAND_PRIMARY, BRAND_MUTED, MAPBOX_TOKEN } from "../../lib/config";
import { useLanguage } from "../../lib/i18n";
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

const SCREEN_W = Dimensions.get("window").width;

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=address,poi,neighborhood,locality,place&limit=1&access_token=${MAPBOX_TOKEN}`,
    );
    const j = await res.json();
    const name = j?.features?.[0]?.place_name;
    if (name) return name;
  } catch {}
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en", "User-Agent": "BharatServicesApp/1.0" } },
    );
    const j = await res.json();
    return j?.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {}
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function buildMapHtml(lat: number, lng: number) {
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<script src="https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js"></script>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css" rel="stylesheet"/>
<style>*{margin:0;padding:0}body,#map{width:100%;height:100%}
.pin{position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);z-index:10;pointer-events:none;font-size:36px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))}
#btn{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);z-index:10;background:${BRAND_PRIMARY};color:#fff;border:none;padding:14px 32px;border-radius:14px;font-size:15px;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,.2);cursor:pointer}
</style></head><body>
<div id="map"></div>
<div class="pin">📍</div>
<button id="btn" onclick="confirm()">Confirm Location</button>
<script>
mapboxgl.accessToken='${MAPBOX_TOKEN}';
var map=new mapboxgl.Map({container:'map',style:'mapbox://styles/mapbox/streets-v12',center:[${lng},${lat}],zoom:15});
map.addControl(new mapboxgl.NavigationControl(),'top-right');
function confirm(){
  var c=map.getCenter();
  window.ReactNativeWebView.postMessage(JSON.stringify({lat:c.lat,lng:c.lng}));
}
</script></body></html>`;
}

export default function SubcategoryDetailScreen({ route, navigation }: Props) {
  const { id, agentId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { lang, t } = useLanguage();

  const [loc, setLoc] = useState<StoredLocation | null>(null);
  const [locLoaded, setLocLoaded] = useState(false);
  const weekDates = makeWeekDates();
  const [selectedDate, setSelectedDate] = useState(weekDates[0]);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", gender: "" });
  const [formPrefilled, setFormPrefilled] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const handleUseCurrentLocation = useCallback(async () => {
    setGpsLoading(true);
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("Permission denied", "Location permission is required.");
          setGpsLoading(false);
          return;
        }
      }
      Geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const addr = await reverseGeocode(latitude, longitude);
          setForm((f) => ({ ...f, address: addr }));
          setGpsLoading(false);
        },
        (err) => {
          Alert.alert("Location error", err.message || "Could not get location.");
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch {
      setGpsLoading(false);
    }
  }, []);

  const handleMapConfirm = useCallback(async (data: { lat: number; lng: number }) => {
    setMapPickerVisible(false);
    const addr = await reverseGeocode(data.lat, data.lng);
    setForm((f) => ({ ...f, address: addr }));
  }, []);

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
          <Text style={styles.title}>{lang === "hi" && sub.nameHi ? sub.nameHi : sub.name}</Text>

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
              <Text style={styles.sectionTitle}>{t("common.otherServices")} {sub.category?.name}</Text>
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
                    <Text style={styles.otherName} numberOfLines={2}>{lang === "hi" && (item as any).nameHi ? (item as any).nameHi : item.name}</Text>
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
              {formatDateTab(selectedDate).day} {formatDateTab(selectedDate).num}{" "}
              {formatDateTab(selectedDate).mon} · {selectedHour !== null ? formatHour(selectedHour, slotDur) : ""}
            </Text>

            {/* Pricing summary */}
            <View style={styles.priceSummary}>
              <View style={styles.priceSummaryRow}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 6 }}>
                  <Text style={styles.priceSummaryName}>{lang === "hi" && sub.nameHi ? sub.nameHi : sub.name}</Text>
                  {discountPercent > 0 && (
                    <View style={styles.discBadgeSm}>
                      <Text style={styles.discTextSm}>{discountPercent}% off</Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {discountPercent > 0 && baseCharge != null && (
                    <Text style={styles.priceStrike}>₹{baseCharge.toFixed(0)}</Text>
                  )}
                  <Text style={styles.priceSummaryPrice}>₹{finalCharge?.toFixed(0) ?? "—"}</Text>
                </View>
              </View>
              {transportPerKm > 0 && (
                <View style={styles.priceSummaryRow}>
                  <Text style={styles.priceSummaryLabel}>Transport</Text>
                  <Text style={styles.priceSummaryLabel}>₹{transportPerKm}/km</Text>
                </View>
              )}
            </View>

            <Text style={styles.fieldLabel}>Your name *</Text>
            <TextInput style={styles.input} placeholder="Full name"
              value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />

            <Text style={styles.fieldLabel}>Phone number *</Text>
            <TextInput style={styles.input} placeholder="+91 XXXXX XXXXX"
              keyboardType="phone-pad" value={form.phone}
              onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />

            <Text style={styles.fieldLabel}>Service address *</Text>
            <View style={styles.addressRow}>
              <TextInput style={[styles.input, styles.inputMulti, { flex: 1 }]} placeholder="Full address"
                multiline numberOfLines={2} value={form.address}
                onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} />
              <View style={styles.addressIcons}>
                <TouchableOpacity
                  style={styles.addrIconBtn}
                  onPress={handleUseCurrentLocation}
                  disabled={gpsLoading}
                  activeOpacity={0.7}
                >
                  {gpsLoading
                    ? <ActivityIndicator size="small" color={BRAND_PRIMARY} />
                    : <Text style={styles.addrIcon}>📍</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addrIconBtn}
                  onPress={() => setMapPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addrIcon}>🗺️</Text>
                </TouchableOpacity>
              </View>
            </View>

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

      {/* ── Map picker modal ──────────────────────────────────────── */}
      <Modal visible={mapPickerVisible} animationType="slide" onRequestClose={() => setMapPickerVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={styles.mapHeader}>
            <TouchableOpacity onPress={() => setMapPickerVisible(false)}>
              <Text style={{ fontSize: 16, color: BRAND_PRIMARY, fontWeight: "600" }}>✕ Close</Text>
            </TouchableOpacity>
            <Text style={styles.mapHeaderTitle}>Pick location on map</Text>
            <View style={{ width: 60 }} />
          </View>
          <WebView
            originWhitelist={["*"]}
            source={{ html: buildMapHtml(loc?.lat ?? 20.5937, loc?.lng ?? 78.9629) }}
            style={{ flex: 1 }}
            javaScriptEnabled
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.lat && data.lng) handleMapConfirm(data);
              } catch {}
            }}
          />
        </View>
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
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  addressIcons: { gap: 6, paddingTop: 2 },
  addrIconBtn: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: "#f3f4f6",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e5e7eb",
  },
  addrIcon: { fontSize: 18 },
  mapHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  mapHeaderTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  cancelBtn: { alignItems: "center", paddingVertical: 14 },
  cancelText: { fontSize: 15, color: BRAND_MUTED, fontWeight: "600" },
  priceSummary: {
    backgroundColor: "#f0f4ff", borderRadius: 12, padding: 12,
    marginBottom: 4, borderWidth: 1, borderColor: "#e0e7ff",
  },
  priceSummaryRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 6,
  },
  priceSummaryName: { fontSize: 14, fontWeight: "600", color: "#111" },
  priceSummaryPrice: { fontSize: 15, fontWeight: "700", color: BRAND_PRIMARY },
  priceSummaryLabel: { fontSize: 12, color: BRAND_MUTED },
  priceStrike: { fontSize: 12, color: BRAND_MUTED, textDecorationLine: "line-through" },
  discBadgeSm: { backgroundColor: "#dcfce7", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  discTextSm: { fontSize: 10, fontWeight: "700", color: "#16a34a" },
});
