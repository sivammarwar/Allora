import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, FlatList,
  TouchableOpacity, Image, ActivityIndicator, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, PermissionsAndroid, Dimensions,
} from "react-native";
import WebView from "react-native-webview";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Geolocation from "@react-native-community/geolocation";
import { api } from "../../lib/api";
import { storage } from "../../lib/storage";
import { connectService, disconnectAll } from "../../lib/socket";
import { BRAND_PRIMARY, BRAND_MUTED, MAPBOX_TOKEN } from "../../lib/config";
import LocationPickerModal, { PickedLocation } from "../../components/LocationPickerModal";
import { useLanguage } from "../../lib/i18n";
import { useAuth } from "../../auth/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
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

export default function SubcategoryDetailScreen({ route, navigation }: Props) {
  const { id, agentId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { lang, t } = useLanguage();
  const qc = useQueryClient();

  const [loc, setLoc] = useState<StoredLocation | null>(null);
  const [locLoaded, setLocLoaded] = useState(false);
  const weekDates = makeWeekDates();
  const [selectedDate, setSelectedDate] = useState(weekDates[0]);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [pageHtmlHeight, setPageHtmlHeight] = useState(0);
  const [showUpsell, setShowUpsell] = useState(false);
  const [selectedSubIds, setSelectedSubIds] = useState<Set<string>>(new Set([id]));
  const [form, setForm] = useState({ name: "", phone: "", address: "", gender: "" });
  const [formPrefilled, setFormPrefilled] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const toggleSub = (subId: string) => {
    if (subId === id) return;
    setSelectedSubIds((prev) => {
      const next = new Set(prev);
      if (next.has(subId)) next.delete(subId); else next.add(subId);
      return next;
    });
  };

  const handleUseCurrentLocation = useCallback(async () => {
    setGpsLoading(true);
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          { title: "Location Permission", message: "Bharat Services needs your location to auto-fill service address.", buttonPositive: "Allow" },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("Location needed", "Please allow location to auto-fill your address.");
          setGpsLoading(false);
          return;
        }
      }
      Geolocation.getCurrentPosition(
        async (pos: { coords: { latitude: number; longitude: number } }) => {
          const { latitude, longitude } = pos.coords;
          const addr = await reverseGeocode(latitude, longitude);
          setForm((f) => ({ ...f, address: addr }));
          setGpsLoading(false);
        },
        (err) => {
          console.warn("[geo] error:", err.code, err.message);
          Alert.alert("Location error", err.message || "Could not get location. Please ensure GPS is enabled.");
          setGpsLoading(false);
        },
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 },
      );
    } catch (e) {
      console.warn("[geo]", e);
      setGpsLoading(false);
    }
  }, []);

  const handleMapPickerConfirm = useCallback((picked: PickedLocation) => {
    setMapPickerVisible(false);
    setForm((f) => ({ ...f, address: picked.name }));
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

  // ── Real-time slot updates (socket) ───────────────────────────────────────
  useEffect(() => {
    if (!resolvedAgentId) return;
    let mounted = true;
    const setupSocket = async () => {
      try {
        const socket = await connectService();
        if (!mounted) return;
        const key = `${id}:${selectedDate}`;
        socket.emit("slots:watch", key);
        const onUpdate = () => {
          if (mounted) qc.invalidateQueries({ queryKey: ["slots", id, resolvedAgentId] });
        };
        socket.on("slot:updated", onUpdate);
        return () => {
          socket.emit("slots:unwatch", key);
          socket.off("slot:updated", onUpdate);
        };
      } catch (e) {
        console.warn("[Socket] failed to connect:", e);
      }
    };
    const cleanupPromise = setupSocket();
    return () => {
      mounted = false;
      cleanupPromise.then(cleanup => cleanup?.()).catch(() => {});
    };
  }, [id, resolvedAgentId, selectedDate, qc]);

  // ── Other services in same category (with agent pricing + catConfig) ─────
  const categoryId = sub?.categoryId;
  const { data: catSubsRaw = [] } = useQuery<any[]>({
    queryKey: ["cat-subs", categoryId, loc?.lat, loc?.lng, resolvedAgentId],
    queryFn: () =>
      api.get(`/api/user/categories/${categoryId}/subcategories?lat=${loc!.lat}&lng=${loc!.lng}${resolvedAgentId ? `&agentId=${resolvedAgentId}` : ""}`) as any,
    enabled: !!categoryId && !!loc,
  });
  const otherServices = catSubsRaw.filter((s: any) => s.id !== id);
  const catConfig = catSubsRaw.find((s: any) => s.categoryConfig)?.categoryConfig ?? null;

  // ── Booking (bulk API — same as web) ────────────────────────────────────────
  const bookMutation = useMutation({
    mutationFn: (payload: any) => api.post("/api/user/service-requests/bulk", payload) as any,
    onSuccess: (bookings: any) => {
      setBookingModal(false);
      setSelectedSubIds(new Set([id]));
      const n = Array.isArray(bookings) ? bookings.length : 1;
      Alert.alert("Confirmed! 🎉", `${n} booking request${n > 1 ? "s" : ""} sent! Waiting for a provider to accept.`, [
        { text: "OK" },
      ]);
    },
    onError: (e: any) => {
      console.warn("[Booking Error]", JSON.stringify(e));
      const msg = e?.error ?? e?.message ?? "Something went wrong. Please try again.";
      Alert.alert("Booking failed", msg);
    },
  });

  const handleBookNow = () => {
    if (!user) { navigation.navigate("GuestLogin", { role: "USER" }); return; }
    if (selectedHour === null) {
      Alert.alert("Select a slot", "Please pick a date and time slot first.");
      return;
    }
    // Show upsell if there are other services in same category, otherwise go directly to form
    setSelectedSubIds(new Set([id]));
    if (otherServices.length > 0) {
      setShowUpsell(true);
    } else {
      openBookingForm();
    }
  };

  const openBookingForm = () => {
    setShowUpsell(false);
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
    if (!resolvedAgentId) {
      Alert.alert("Error", "Unable to determine service provider. Please go back and try again.");
      return;
    }
    if (selectedHour === null) {
      Alert.alert("Error", "Please select a time slot first.");
      return;
    }
    const payload = {
      subcategoryIds: Array.from(selectedSubIds),
      agentId: resolvedAgentId,
      scheduledDate: selectedDate,
      scheduledHour: selectedHour,
      userName: form.name.trim(),
      userPhone: form.phone.trim(),
      userAddress: form.address.trim(),
      userGender: form.gender.trim() || undefined,
      userLat: loc?.lat,
      userLng: loc?.lng,
    };
    console.log("[Booking] payload:", JSON.stringify(payload));
    bookMutation.mutate(payload);
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

          {/* ── Service page content (from PM page builder) ────── */}
          {(sub.pageContent?.html || sub.pageContent?.htmlHi) ? (() => {
            const htmlContent = lang === "hi" && sub.pageContent?.htmlHi
              ? sub.pageContent.htmlHi
              : sub.pageContent?.html ?? "";
            return (
              <View style={styles.pageContentWrap}>
                <WebView
                  scrollEnabled={false}
                  originWhitelist={["*"]}
                  onMessage={(e) => {
                    const h = parseInt(e.nativeEvent.data, 10);
                    if (!isNaN(h) && h > 0) setPageHtmlHeight((prev) => Math.max(prev, h + 32));
                  }}
                  source={{
                    html: `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#1f2937;background:transparent;padding:0 2px}
h1,h2,h3,h4{color:#7c2d12;margin:16px 0 8px;font-weight:700}
h1{font-size:19px}h2{font-size:16px}h3{font-size:15px}
p{margin:8px 0;line-height:1.65;color:#374151}
ul,ol{padding-left:18px;margin:8px 0}
li{margin:6px 0;line-height:1.55;color:#374151}
strong,b{color:#111827;font-weight:700}
hr{border:none;border-top:1px solid #f3f4f6;margin:14px 0}
img{max-width:100%;border-radius:10px;margin:8px 0}
table{width:100%;border-collapse:collapse;margin:10px 0}
td,th{padding:8px 10px;border:1px solid #e5e7eb;font-size:13px;text-align:left}
th{background:#fef2f2;font-weight:700;color:#7c2d12}
.section,blockquote{background:#fff7f7;border-left:3px solid #c2410c;border-radius:8px;padding:12px 14px;margin:12px 0}
</style>
</head><body>
${htmlContent.replace(/`/g, '\\`')}
<script>
function ph(){window.ReactNativeWebView.postMessage(String(document.documentElement.scrollHeight));}
ph();
window.addEventListener('load',function(){ph();setTimeout(ph,300);setTimeout(ph,800);setTimeout(ph,1500);});
document.querySelectorAll('img').forEach(function(img){img.addEventListener('load',function(){setTimeout(ph,100);});if(img.complete)setTimeout(ph,100);});
</script>
</body></html>`,
                  }}
                  style={{ width: Dimensions.get("window").width - 40, height: pageHtmlHeight || 200 }}
                />
              </View>
            );
          })() : null}

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

      {/* ── Upsell modal (multi-service selection like web) ─────────── */}
      <Modal visible={showUpsell} animationType="slide" transparent onRequestClose={() => setShowUpsell(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.upsellSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <View>
                <Text style={styles.modalTitle}>Book services together</Text>
                <Text style={styles.modalSub}>
                  {selectedHour !== null ? formatHour(selectedHour, slotDur) : ""} · {formatDateTab(selectedDate).day} {formatDateTab(selectedDate).num} {formatDateTab(selectedDate).mon}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowUpsell(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 20, color: BRAND_MUTED }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {/* Primary service */}
              {(() => {
                const allSubs = [
                  { id, name: sub.name, nameHi: sub.nameHi, base: baseCharge ?? 0, disc: discountPercent, final: finalCharge ?? 0, hasPricing: !!pricing, isMain: true },
                  ...otherServices.map((s: any) => {
                    const sp = s.agentPricing;
                    const sBase = sp ? Number(sp.baseServiceCharge) : 0;
                    const sDisc = sp ? Number(sp.discountPercent) : 0;
                    return { id: s.id, name: s.name, nameHi: s.nameHi, base: sBase, disc: sDisc, final: sBase * (1 - sDisc / 100), hasPricing: !!sp, isMain: false };
                  }),
                ];
                return allSubs.map((s) => {
                  const isSelected = selectedSubIds.has(s.id);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.upsellItem, isSelected && styles.upsellItemSelected]}
                      onPress={() => toggleSub(s.id)}
                      activeOpacity={s.isMain ? 1 : 0.7}
                      disabled={s.isMain}
                    >
                      <View style={[styles.upsellCheck, isSelected && styles.upsellCheckActive]}>
                        {isSelected && <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.upsellName}>{lang === "hi" && s.nameHi ? s.nameHi : s.name}</Text>
                          {s.isMain && <View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>Primary</Text></View>}
                        </View>
                        {s.hasPricing && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                            {s.disc > 0 && <Text style={{ fontSize: 11, color: BRAND_MUTED, textDecorationLine: "line-through" }}>₹{s.base}</Text>}
                            <Text style={{ fontSize: 13, fontWeight: "700", color: BRAND_PRIMARY }}>₹{s.final.toFixed(0)}</Text>
                            {s.disc > 0 && <View style={styles.discBadgeSm}><Text style={styles.discTextSm}>{s.disc}% off</Text></View>}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>

            {/* Price summary */}
            {(() => {
              const selected = [
                { base: baseCharge ?? 0, disc: discountPercent, final: finalCharge ?? 0, hasPricing: !!pricing },
                ...otherServices.filter((s: any) => selectedSubIds.has(s.id)).map((s: any) => {
                  const sp = s.agentPricing;
                  const sBase = sp ? Number(sp.baseServiceCharge) : 0;
                  const sDisc = sp ? Number(sp.discountPercent) : 0;
                  return { base: sBase, disc: sDisc, final: sBase * (1 - sDisc / 100), hasPricing: !!sp };
                }),
              ].filter((s) => s.hasPricing);
              const selCount = selected.length;
              const totalAfterInd = selected.reduce((a, s) => a + s.final, 0);
              let bulkPct = 0;
              if (catConfig) {
                if (selCount >= 4) bulkPct = Number(catConfig.bulkDiscount4Plus ?? 0);
                else if (selCount === 3) bulkPct = Number(catConfig.bulkDiscount3 ?? 0);
                else if (selCount === 2) bulkPct = Number(catConfig.bulkDiscount2 ?? 0);
              }
              const bulkSaving = totalAfterInd * (bulkPct / 100);
              const totalFinal = totalAfterInd - bulkSaving;
              const totalOrig = selected.reduce((a, s) => a + s.base, 0);
              const savings = totalOrig - totalFinal;
              return (
                <View style={styles.upsellFooter}>
                  {bulkPct > 0 && (
                    <View style={styles.bulkBanner}>
                      <Text style={styles.bulkBannerText}>Extra {bulkPct}% bulk discount for {selCount} services!</Text>
                      {bulkSaving > 0.5 && <Text style={styles.bulkBannerSaving}>−₹{bulkSaving.toFixed(0)}</Text>}
                    </View>
                  )}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: "#111" }}>₹{totalFinal.toFixed(0)}</Text>
                      {savings > 0.5 && <Text style={{ fontSize: 11, color: "#16a34a", fontWeight: "600" }}>You save ₹{savings.toFixed(0)}</Text>}
                    </View>
                    <Text style={{ fontSize: 12, color: BRAND_MUTED }}>{selCount} service{selCount > 1 ? "s" : ""}</Text>
                  </View>
                  <TouchableOpacity style={styles.bookBtn} onPress={openBookingForm} activeOpacity={0.85}>
                    <Text style={styles.bookText}>Book {selCount} service{selCount > 1 ? "s" : ""} — ₹{totalFinal.toFixed(0)}</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Booking form modal ──────────────────────────────────────── */}
      <Modal visible={bookingModal} animationType="slide" transparent onRequestClose={() => setBookingModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Confirm Booking</Text>
            <Text style={styles.modalSub}>
              {formatDateTab(selectedDate).day} {formatDateTab(selectedDate).num}{" "}
              {formatDateTab(selectedDate).mon} · {selectedHour !== null ? formatHour(selectedHour, slotDur) : ""}
            </Text>

            {/* Pricing summary — all selected services */}
            <View style={styles.priceSummary}>
              {(() => {
                const allPriceable = [
                  { id, name: sub.name, nameHi: sub.nameHi, base: baseCharge ?? 0, disc: discountPercent, final: finalCharge ?? 0, hasPricing: !!pricing },
                  ...otherServices.filter((s: any) => selectedSubIds.has(s.id)).map((s: any) => {
                    const sp = s.agentPricing;
                    const sBase = sp ? Number(sp.baseServiceCharge) : 0;
                    const sDisc = sp ? Number(sp.discountPercent) : 0;
                    return { id: s.id, name: s.name, nameHi: s.nameHi, base: sBase, disc: sDisc, final: sBase * (1 - sDisc / 100), hasPricing: !!sp };
                  }),
                ].filter((s) => s.hasPricing);
                const totalAfterInd = allPriceable.reduce((a, s) => a + s.final, 0);
                const selCount = allPriceable.length;
                let bulkPct = 0;
                if (catConfig) {
                  if (selCount >= 4) bulkPct = Number(catConfig.bulkDiscount4Plus ?? 0);
                  else if (selCount === 3) bulkPct = Number(catConfig.bulkDiscount3 ?? 0);
                  else if (selCount === 2) bulkPct = Number(catConfig.bulkDiscount2 ?? 0);
                }
                const bulkSaving = totalAfterInd * (bulkPct / 100);
                const totalFinal = totalAfterInd - bulkSaving;
                const totalOrig = allPriceable.reduce((a, s) => a + s.base, 0);
                const savings = totalOrig - totalFinal;
                return (
                  <>
                    {allPriceable.map((s) => (
                      <View key={s.id} style={styles.priceSummaryRow}>
                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 6 }}>
                          <Text style={styles.priceSummaryName} numberOfLines={1}>{lang === "hi" && s.nameHi ? s.nameHi : s.name}</Text>
                          {s.disc > 0 && <View style={styles.discBadgeSm}><Text style={styles.discTextSm}>{s.disc}% off</Text></View>}
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          {s.disc > 0 && <Text style={styles.priceStrike}>₹{s.base.toFixed(0)}</Text>}
                          <Text style={styles.priceSummaryPrice}>₹{s.final.toFixed(0)}</Text>
                        </View>
                      </View>
                    ))}
                    {bulkPct > 0 && (
                      <View style={[styles.priceSummaryRow, { borderTopWidth: 1, borderTopColor: "#e0e7ff", paddingTop: 8 }]}>
                        <Text style={{ fontSize: 12, color: "#16a34a", fontWeight: "600" }}>Bulk discount ({bulkPct}%)</Text>
                        <Text style={{ fontSize: 12, color: "#16a34a", fontWeight: "700" }}>−₹{bulkSaving.toFixed(0)}</Text>
                      </View>
                    )}
                    <View style={[styles.priceSummaryRow, { borderTopWidth: 1, borderTopColor: "#e0e7ff", paddingTop: 8, marginTop: 4 }]}>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#111" }}>Total</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        {savings > 0.5 && <Text style={{ fontSize: 10, color: "#16a34a", fontWeight: "600" }}>Save ₹{savings.toFixed(0)}</Text>}
                        <Text style={{ fontSize: 16, fontWeight: "800", color: BRAND_PRIMARY }}>₹{totalFinal.toFixed(0)}</Text>
                      </View>
                    </View>
                    {transportPerKm > 0 && (
                      <View style={styles.priceSummaryRow}>
                        <Text style={styles.priceSummaryLabel}>Transport</Text>
                        <Text style={styles.priceSummaryLabel}>₹{transportPerKm}/km (on acceptance)</Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>

            <Text style={styles.fieldLabel}>Your name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              returnKeyType="next"
              blurOnSubmit={false}
              autoCorrect={false}
            />

            <Text style={styles.fieldLabel}>Phone number *</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 XXXXX XXXXX"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
              returnKeyType="next"
              blurOnSubmit={false}
            />

            <Text style={styles.fieldLabel}>Gender (optional)</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
              {["MALE", "FEMALE", "OTHER"].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderChip, form.gender === g && styles.genderChipActive]}
                  onPress={() => setForm((f) => ({ ...f, gender: g }))}
                >
                  <Text style={[styles.genderChipText, form.gender === g && styles.genderChipTextActive]}>
                    {g === "MALE" ? "Male" : g === "FEMALE" ? "Female" : "Other"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Service address *</Text>
            <View style={styles.addressRow}>
              <TextInput
                style={[styles.input, styles.inputMulti, { flex: 1 }]}
                placeholder="Full address / landmark"
                multiline
                numberOfLines={2}
                value={form.address}
                onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                blurOnSubmit={true}
                autoCorrect={false}
              />
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

            <TouchableOpacity
              style={[styles.bookBtn, { marginTop: 16 }, bookMutation.isPending && styles.bookBtnDisabled]}
              onPress={handleSubmit}
              disabled={bookMutation.isPending}
            >
              <Text style={styles.bookText}>
                {bookMutation.isPending ? "Confirming…" : `Confirm ${selectedSubIds.size > 1 ? selectedSubIds.size + " bookings" : "Booking"}`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setBookingModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Map picker (reuse proven LocationPickerModal from HomeScreen) ── */}
      <LocationPickerModal
        visible={mapPickerVisible}
        initialLoc={loc}
        onConfirm={handleMapPickerConfirm}
        onClose={() => setMapPickerVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  pageContentWrap: { marginBottom: 24, borderRadius: 14, overflow: "hidden", backgroundColor: "#fff" },
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
  // Upsell modal
  upsellSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: "90%",
  },
  upsellItem: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    borderRadius: 14, borderWidth: 2, borderColor: "#f0f0f0", marginBottom: 8,
    backgroundColor: "#fff",
  },
  upsellItemSelected: { borderColor: BRAND_PRIMARY, backgroundColor: "#f0f4ff" },
  upsellCheck: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#d1d5db",
    alignItems: "center", justifyContent: "center",
  },
  upsellCheckActive: { backgroundColor: BRAND_PRIMARY, borderColor: BRAND_PRIMARY },
  upsellName: { fontSize: 14, fontWeight: "600", color: "#111" },
  upsellFooter: { borderTopWidth: 1, borderTopColor: "#f0f0f0", paddingTop: 14, marginTop: 8 },
  primaryBadge: { backgroundColor: "#ede9fe", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  primaryBadgeText: { fontSize: 9, fontWeight: "700", color: "#7c3aed" },
  bulkBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#f0f4ff", borderWidth: 1, borderColor: "#c7d2fe",
    borderRadius: 10, padding: 10, marginBottom: 10,
  },
  bulkBannerText: { fontSize: 12, fontWeight: "600", color: BRAND_PRIMARY, flex: 1 },
  bulkBannerSaving: { fontSize: 12, fontWeight: "700", color: BRAND_PRIMARY },
  // Gender chips
  genderChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
  },
  genderChipActive: { backgroundColor: BRAND_PRIMARY, borderColor: BRAND_PRIMARY },
  genderChipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  genderChipTextActive: { color: "#fff" },
});
