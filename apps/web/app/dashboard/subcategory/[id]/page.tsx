"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Phone,
  User, CheckCircle2, Loader2, CalendarCheck, History, X, MapPin, Check, Tag,
  CheckSquare2, Navigation, LocateFixed, Map as MapIcon
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStoredLocation, type UserLocation } from "@/lib/location";
import { getSocket } from "@/lib/socket";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { LocationPickerModal } from "@/components/shared/LocationPickerModal";
import { useCurrentUser } from "@/lib/auth";
import { useT, useLanguage } from "@/lib/i18n";

interface AgentPricing {
  id: string;
  baseServiceCharge: string;
  discountPercent: string;
  transportChargePerKm: string;
}

interface SubcategoryInfo {
  id: string;
  name: string;
  imageUrl: string | null;
  pageContent: { html?: string; htmlHi?: string } | null;
  category: { id: string; name: string; type: "PRODUCT" | "SERVICE" };
}

interface SlotState {
  slots: Record<string, { hour: number; available: boolean }[]>;
  slotStartHour: number;
  slotEndHour: number;
  slotDurationHours: number;
}

interface ServiceRequestResult {
  id: string;
  status: string;
  charge?: string;
  discountPercent?: string;
  distanceKm?: number | null;
  transportCharge?: string;
  transportTotal?: string;
  hero?: { id: string; serviceName: string | null; shopName: string | null; phone: string; gender: string | null; locationLat?: number; locationLng?: number; user: { name: string | null } } | null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function fmtH(h: number) {
  if (h === 0 || h === 24) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}
function fmtSlot(start: number, duration: number = 1) {
  const end = start + duration;
  const s12 = start === 0 ? 12 : start > 12 ? start - 12 : start;
  const e12 = end === 0 || end === 24 ? 12 : end > 12 ? end - 12 : end;
  const sSuffix = start < 12 ? "AM" : "PM";
  const eSuffix = end <= 12 ? (end < 12 ? "AM" : "PM") : "PM";
  if (sSuffix === eSuffix) return `${s12}–${e12} ${sSuffix}`;
  return `${fmtH(start)} – ${fmtH(end)}`;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function UserSubcategoryPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agentId");
  const qc = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  function requireLogin() {
    if (!currentUser) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/login?redirect=${redirect}`);
      return true;
    }
    return false;
  }

  const [loc, setLoc] = useState<UserLocation | null>(null);
  useEffect(() => setLoc(getStoredLocation()), []);

  // Fallback: resolve agentId from location when not in URL
  const { data: myAgentData } = useQuery<{ agentId: string | null }>({
    queryKey: ["user", "my-agent", loc?.lat, loc?.lng],
    queryFn: () => api.get(`/api/user/my-agent?lat=${loc!.lat}&lng=${loc!.lng}`),
    enabled: !!loc && !agentId,
    retry: false,
  });
  const resolvedAgentId = agentId ?? myAgentData?.agentId ?? null;

  // Real-time clock — updates every minute so past slots fade automatically
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const currentHour = now.getHours();

  // Slot picker state
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  // Booking form state
  const [showForm, setShowForm] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", gender: "MALE", address: "" });
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const handleGpsAutoFill = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not available"); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&types=address,poi,neighborhood,locality,place&limit=1`
          );
          const data = await res.json();
          const addr = data.features?.[0]?.place_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setForm((f) => ({ ...f, address: addr }));
        } catch {
          setForm((f) => ({ ...f, address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }));
        } finally {
          setGpsLoading(false);
        }
      },
      () => { toast.error("Could not get location"); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const handleMapPickerConfirm = async (pickedLoc: UserLocation) => {
    setShowMapPicker(false);
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${pickedLoc.lng},${pickedLoc.lat}.json?access_token=${token}&types=address,poi,neighborhood,locality,place&limit=1`
      );
      const data = await res.json();
      const addr = data.features?.[0]?.place_name ?? `${pickedLoc.lat.toFixed(5)}, ${pickedLoc.lng.toFixed(5)}`;
      setForm((f) => ({ ...f, address: addr }));
    } catch {
      setForm((f) => ({ ...f, address: `${pickedLoc.lat.toFixed(5)}, ${pickedLoc.lng.toFixed(5)}` }));
    }
  };

  // Pre-fill booking form from profile
  const { data: profile } = useQuery<{ name: string | null; phone: string | null; gender: string | null }>({
    queryKey: ["user", "profile"],
    queryFn: () => api.get("/api/user/profile"),
    enabled: !!currentUser,
  });
  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        name: f.name || profile.name || "",
        phone: f.phone || profile.phone || "",
        gender: profile.gender ?? f.gender,
      }));
    }
  }, [profile]);

  // Multi-service selection (primary subcategory always included)
  const [selectedSubIds, setSelectedSubIds] = useState<Set<string>>(new Set([id]));
  const toggleSub = (subId: string) => {
    if (subId === id) return; // primary is always selected
    setSelectedSubIds((prev) => {
      const next = new Set(prev);
      if (next.has(subId)) next.delete(subId); else next.add(subId);
      return next;
    });
  };

  // Saved addresses
  const { data: savedAddresses = [] } = useQuery<{ id: string; label: string; address: string; isDefault: boolean }[]>({
    queryKey: ["user", "saved-addresses"],
    queryFn: () => api.get("/api/user/saved-addresses"),
  });
  useEffect(() => {
    const def = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
    if (def) setForm((f) => ({ ...f, address: f.address || def.address }));
  }, [savedAddresses]);
  const [acceptedRequest, setAcceptedRequest] = useState<ServiceRequestResult | null>(null);

  // ── Data fetching ──
  const { data: sub, isLoading: subLoading } = useQuery<SubcategoryInfo>({
    queryKey: ["subcategory-info", id, loc?.lat, loc?.lng],
    queryFn: async () => {
      const res: any = await api.get(`/api/user/subcategories/${id}?lat=${loc!.lat}&lng=${loc!.lng}`);
      // API returns { subcategory, hero, pricing, heroes } or { subcategory, ... }
      if (res?.subcategory) return res.subcategory as SubcategoryInfo;
      return res as SubcategoryInfo;
    },
    enabled: !!loc,
  });

  // Fetch pricing via the subcategories endpoint (piggyback)
  const { data: pricingFromCat } = useQuery<AgentPricing | null>({
    queryKey: ["sub-pricing", resolvedAgentId, id],
    queryFn: async () => {
      if (!resolvedAgentId) return null;
      const subs = await api.get<any[]>(`/api/user/categories/${sub!.category.id}/subcategories?lat=${loc!.lat}&lng=${loc!.lng}&agentId=${resolvedAgentId}`);
      const found = subs.find((s: any) => s.id === id);
      return found?.agentPricing ?? null;
    },
    enabled: !!resolvedAgentId && !!sub && !!loc,
  });

  const pricing = pricingFromCat;
  const base = pricing ? Number(pricing.baseServiceCharge) : null;
  const disc = pricing ? Number(pricing.discountPercent) : 0;
  const discounted = base !== null ? base * (1 - disc / 100) : null;

  const fromDate = todayStr();

  const { data: slotData } = useQuery<SlotState>({
    queryKey: ["slots", id, resolvedAgentId],
    queryFn: () => api.get(`/api/user/subcategories/${id}/slots?agentId=${resolvedAgentId}&from=${fromDate}&days=7`),
    enabled: !!resolvedAgentId,
    refetchInterval: 10000,
  });

  // 7 day columns
  const days = Array.from({ length: 7 }, (_, i) => addDays(fromDate, i));

  // Real-time slot updates
  useEffect(() => {
    if (!resolvedAgentId) return;
    const s = getSocket("/service");
    s.emit("slots:watch", `${id}:${selectedDate}`);
    const onUpdate = () => qc.invalidateQueries({ queryKey: ["slots", id] });
    s.on("slot:updated", onUpdate);
    return () => { s.off("slot:updated", onUpdate); s.emit("slots:unwatch", `${id}:${selectedDate}`); };
  }, [id, resolvedAgentId, selectedDate, qc]);

  // Real-time acceptance notification
  useEffect(() => {
    const s = getSocket("/service");
    const onAccepted = (data: ServiceRequestResult) => {
      setAcceptedRequest(data);
      qc.invalidateQueries({ queryKey: ["user", "service-requests"] });
    };
    s.on("service_request:accepted", onAccepted);
    return () => { s.off("service_request:accepted", onAccepted); };
  }, [qc]);

  const bookBulk = useMutation({
    mutationFn: () =>
      api.post<any[]>("/api/user/service-requests/bulk", {
        subcategoryIds: Array.from(selectedSubIds),
        agentId: resolvedAgentId!,
        scheduledDate: selectedDate,
        scheduledHour: selectedHour!,
        userName: form.name,
        userPhone: form.phone,
        userGender: form.gender,
        userAddress: form.address,
        userLat: loc?.lat,
        userLng: loc?.lng,
      }),
    onSuccess: (data: any[]) => {
      const n = data.length;
      toast.success(`${n} booking request${n > 1 ? "s" : ""} sent! Waiting for a provider to accept.`);
      setShowForm(false);
      setSelectedSubIds(new Set([id]));
      qc.invalidateQueries({ queryKey: ["user", "service-requests"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  // Other subcategories of the same category for suggestions
  const { data: suggestions = [] } = useQuery<any[]>({
    queryKey: ["sub-suggestions", sub?.category.id, resolvedAgentId],
    queryFn: () =>
      api.get(`/api/user/categories/${sub!.category.id}/subcategories?lat=${loc!.lat}&lng=${loc!.lng}${resolvedAgentId ? `&agentId=${resolvedAgentId}` : ""}`),
    enabled: !!sub && !!loc,
  });
  const otherSubs = suggestions.filter((s: any) => s.id !== id);
  // Category-level config (transport + bulk discounts) — same for all subs in this category
  const catConfig = suggestions.find((s: any) => s.categoryConfig)?.categoryConfig ?? null;
  // Transport lives on category config; agentPricing includes it merged from API for back-compat
  const transport = catConfig ? Number(catConfig.transportChargePerKm)
    : pricing ? Number((pricing as any).transportChargePerKm) : null;

  const t = useT();
  const { lang } = useLanguage();
  if (!loc) return <Card><CardContent className="py-10 text-center text-sm">{t("booking.setLocation")}</CardContent></Card>;
  if (subLoading || !sub) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-primary" /></div>;

  const slotHours = slotData?.slots[selectedDate] ?? [];

  return (
    <div className="page-enter space-y-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft size={14} /> {t("booking.back")}</Button>

      {/* ── Pricing header ── */}
      <div className="rounded-lg border border-brand-border bg-brand-surface p-5 space-y-3">
        <h1 className="font-heading text-2xl text-brand-text">
          {lang === "hi" && (sub as any).nameHi ? (sub as any).nameHi : sub.name}
        </h1>
        <p className="text-xs text-brand-textMuted uppercase tracking-wide">{sub.category.name}</p>
        {pricing ? (
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-brand-textMuted mb-0.5">{t("booking.serviceCharge")}</p>
              <div className="flex items-center gap-2">
                {disc > 0 && <span className="line-through text-brand-textMuted text-sm">₹{base}</span>}
                <span className="text-xl font-bold text-brand-primary">₹{discounted?.toFixed(0)}</span>
                {disc > 0 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{disc}% off</span>}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-brand-textMuted mb-0.5">{t("booking.transport")}</p>
              {transport && transport > 0
                ? <span className="text-sm font-medium text-brand-text">₹{transport}/km</span>
                : <span className="text-sm font-medium text-green-600">Free</span>
              }
            </div>
          </div>
        ) : (
          <p className="text-xs text-brand-textMuted">{t("booking.noPricing")}</p>
        )}
      </div>

      {/* ── PM Page Content ── */}
      {(sub.pageContent?.html || sub.pageContent?.htmlHi) && (
        <Card>
          <CardContent className="py-5">
            <div
              className="prose max-w-none text-brand-text text-sm leading-relaxed"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html:
                  lang === "hi" && sub.pageContent?.htmlHi
                    ? sub.pageContent.htmlHi
                    : sub.pageContent?.html ?? "",
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Slot picker ── */}
      {resolvedAgentId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg text-brand-text">{t("booking.availableSlots")}</h2>
            <span className="text-xs text-brand-textMuted">
              {new Date(fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {new Date(addDays(fromDate, 6)).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          </div>

          {/* Day tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {days.map((d) => {
              const dayObj = new Date(d + "T12:00:00");
              const isPastDay = d < todayDateStr;
              const hasSlots = !isPastDay && (slotData?.slots[d] ?? []).some((s) => s.available);
              return (
                <button
                  key={d}
                  disabled={isPastDay}
                  onClick={() => { setSelectedDate(d); setSelectedHour(null); }}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg border text-xs transition-colors ${
                    isPastDay
                      ? "border-brand-border/30 text-brand-textMuted/30 cursor-not-allowed line-through"
                      : selectedDate === d
                        ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                        : "border-brand-border text-brand-textMuted hover:border-brand-primary/50"
                  } ${!hasSlots && slotData && !isPastDay ? "opacity-40" : ""}`}
                >
                  <span className="font-medium">{DAYS[dayObj.getDay()]}</span>
                  <span>{dayObj.getDate()}</span>
                </button>
              );
            })}
          </div>

          {/* Hour grid */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {slotHours.map(({ hour, available }) => {
              const isPast = selectedDate === todayDateStr && hour <= currentHour;
              const isDisabled = isPast || !available;
              return (
                <button
                  key={hour}
                  disabled={isDisabled}
                  onClick={() => setSelectedHour(hour)}
                  className={`py-2 px-1 rounded-lg border text-xs font-medium transition-colors text-center ${
                    selectedHour === hour
                      ? "border-brand-primary bg-brand-primary text-white"
                      : isPast
                        ? "border-brand-border/20 text-brand-textMuted/30 bg-gray-50 cursor-not-allowed line-through"
                        : available
                          ? "border-brand-border hover:border-brand-primary/60 text-brand-text"
                          : "border-brand-border/30 text-brand-textMuted/40 cursor-not-allowed"
                  }`}
                >
                  {fmtSlot(hour, slotData?.slotDurationHours ?? 1)}
                </button>
              );
            })}
            {slotHours.length === 0 && (
              <p className="col-span-full text-xs text-brand-textMuted text-center py-3">
                {t("booking.noSlots")}
              </p>
            )}
          </div>

          {selectedHour !== null && !showForm && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/20">
              <p className="text-sm text-brand-text">
                <CalendarCheck size={14} className="inline mr-1.5 text-brand-primary" />
                {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })} at {fmtSlot(selectedHour, slotData?.slotDurationHours ?? 1)}
              </p>
              <Button size="sm" onClick={() => { if (requireLogin()) return; setSelectedSubIds(new Set([id])); if (otherSubs.length > 0) setShowUpsell(true); else setShowForm(true); }}>{t("booking.bookThisSlot")}</Button>
            </div>
          )}
        </div>
      )}

      {/* ── Booking Form (bottom-sheet modal) ── */}
      {showForm && selectedHour !== null && (
        <div
          className="fixed inset-0 z-50 flex sm:items-center sm:justify-center"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
        <div className="bg-white flex flex-col overflow-hidden w-full h-full sm:w-auto sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <h2 className="font-heading text-lg text-brand-text">{t("booking.yourDetails")}</h2>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-full hover:bg-gray-100"><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="min-h-0 overflow-y-auto px-5 py-4 space-y-4">
            {/* Booking summary */}
            {(() => {
              const allPriceable = [
                { id, name: sub?.name ?? "", base: base ?? 0, disc, final: discounted ?? 0, hasPricing: !!pricing },
                ...otherSubs.filter((s: any) => selectedSubIds.has(s.id)).map((s: any) => {
                  const sp = s.agentPricing;
                  const sBase = sp ? Number(sp.baseServiceCharge) : 0;
                  const sDisc = sp ? Number(sp.discountPercent) : 0;
                  return { id: s.id, name: s.name, base: sBase, disc: sDisc, final: sBase * (1 - sDisc / 100), hasPricing: !!sp };
                }),
              ].filter((s) => s.hasPricing);
              const totalAfterInd = allPriceable.reduce((a, s) => a + s.final, 0);
              // Bulk discount
              const selCount = allPriceable.length;
              let bulkDiscPct = 0;
              if (catConfig) {
                if (selCount >= 4) bulkDiscPct = Number(catConfig.bulkDiscount4Plus);
                else if (selCount === 3) bulkDiscPct = Number(catConfig.bulkDiscount3);
                else if (selCount === 2) bulkDiscPct = Number(catConfig.bulkDiscount2);
              }
              const bulkSaving = totalAfterInd * (bulkDiscPct / 100);
              const totalFinal = totalAfterInd - bulkSaving;
              const totalO = allPriceable.reduce((a, s) => a + s.base, 0);
              const saved  = totalO - totalFinal;
              return (
                <div className="rounded-lg bg-brand-primary/5 border border-brand-primary/20 px-3 py-2.5 space-y-1.5">
                  {allPriceable.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-brand-text ${i === 0 ? "font-medium" : ""}`}>{s.name}</span>
                        {s.disc > 0 && (
                          <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">{s.disc}% off</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {s.disc > 0 && <span className="text-[10px] line-through text-brand-textMuted">₹{s.base}</span>}
                        <span className="font-semibold text-brand-primary">₹{s.final.toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                  {bulkDiscPct > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-brand-primary/20 text-sm">
                      <span className="text-green-600 font-medium">Bulk discount ({bulkDiscPct}% off)</span>
                      <span className="font-semibold text-green-600">−₹{bulkSaving.toFixed(0)}</span>
                    </div>
                  )}
                  {allPriceable.length > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-brand-primary/20 text-sm font-semibold">
                      <span className="text-brand-text">{t("booking.total")}</span>
                      <div className="flex items-center gap-2">
                        {saved > 0.5 && <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Save ₹{saved.toFixed(0)}</span>}
                        <span className="text-brand-primary">₹{totalFinal.toFixed(0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label={t("booking.yourName")} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input label={t("booking.phone")} type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-brand-text">{t("booking.gender")}</label>
                <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} className="w-full p-2.5 rounded-sm border border-brand-border bg-brand-surface text-sm text-brand-text">
                  <option value="MALE">{t("booking.male")}</option>
                  <option value="FEMALE">{t("booking.female")}</option>
                  <option value="OTHER">{t("booking.other")}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-brand-text">{t("booking.addressLabel")}</label>
                {savedAddresses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {savedAddresses.map((sa) => (
                      <button
                        key={sa.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, address: sa.address }))}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          form.address === sa.address
                            ? "bg-brand-primary text-white border-brand-primary"
                            : "bg-brand-surface border-brand-border text-brand-textMuted hover:border-brand-primary"
                        }`}
                      >
                        <MapPin size={10} /> {sa.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder={t("booking.addressPlaceholder")} />
                  </div>
                  <button
                    type="button"
                    onClick={handleGpsAutoFill}
                    disabled={gpsLoading}
                    title="Use current location"
                    className="shrink-0 w-10 h-10 rounded-lg border border-brand-border bg-brand-surface hover:bg-brand-primary/10 hover:border-brand-primary/50 flex items-center justify-center text-brand-textMuted hover:text-brand-primary transition-colors disabled:opacity-50"
                  >
                    {gpsLoading ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    title="Pick on map"
                    className="shrink-0 w-10 h-10 rounded-lg border border-brand-border bg-brand-surface hover:bg-brand-primary/10 hover:border-brand-primary/50 flex items-center justify-center text-brand-textMuted hover:text-brand-primary transition-colors"
                  >
                    <MapIcon size={16} />
                  </button>
                </div>
              </div>
            </div>
            <div className="pt-2 pb-4">
              <Button
                className="w-full"
                onClick={() => bookBulk.mutate()}
                loading={bookBulk.isPending}
                disabled={!form.name || !form.phone || !form.address}
              >
                <CheckCircle2 size={15} /> {selectedSubIds.size > 1 ? t("booking.confirmMultiple", { n: selectedSubIds.size }) : t("booking.sendRequest")}
              </Button>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ── Acceptance notification ── */}
      {acceptedRequest && (() => {
        const ar = acceptedRequest;
        const arDistance = ar.distanceKm ?? 0;
        const arTransport = Number(ar.transportTotal ?? 0);
        const arServiceCharge = ar.charge ? Number(ar.charge) * (1 - Number(ar.discountPercent ?? 0) / 100) : null;
        const arTotal = (arServiceCharge ?? 0) + arTransport;
        return (
          <Card className="border-brand-success/40 bg-brand-success/5">
            <CardContent className="py-5 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-brand-success" />
                <h3 className="font-medium text-brand-text">{t("booking.bookingAccepted")}</h3>
              </div>
              {ar.hero && (
                <div className="space-y-1 text-sm">
                  <p className="flex items-center gap-1.5"><User size={13} className="text-brand-textMuted" /> {ar.hero.user.name ?? ar.hero.serviceName}</p>
                  <p className="flex items-center gap-1.5"><Phone size={13} className="text-brand-textMuted" /> {ar.hero.phone}</p>
                  {ar.hero.gender && <p className="text-xs text-brand-textMuted">{ar.hero.gender}</p>}
                </div>
              )}
              {arDistance > 0 && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-brand-success/20">
                  <span className="flex items-center gap-1.5 text-blue-600"><Navigation size={12} /> Provider distance</span>
                  <span className="font-medium text-blue-600">{arDistance} km</span>
                </div>
              )}
              {arDistance > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-brand-textMuted">Travel charge</span>
                  <span className={`font-medium ${arTransport > 0 ? "text-brand-text" : "text-green-600"}`}>
                    {arTransport > 0 ? `₹${arTransport.toFixed(0)}` : "Free"}
                  </span>
                </div>
              )}
              {arServiceCharge !== null && (
                <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-brand-success/20">
                  <span className="text-brand-text">Total</span>
                  <span className="text-brand-text">₹{arTotal.toFixed(0)}</span>
                </div>
              )}
              <Button size="sm" variant="ghost" onClick={() => setAcceptedRequest(null)}>Dismiss</Button>
            </CardContent>
          </Card>
        );
      })()}

      {/* ── Other subcategories (suggestions) ── */}
      {otherSubs.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading text-lg text-brand-text">Other services in {sub.category.name}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {otherSubs.map((s: any) => {
              const sp = s.agentPricing;
              const sBase = sp ? Number(sp.baseServiceCharge) : null;
              const sDisc = sp ? Number(sp.discountPercent) : 0;
              const sFinal = sBase !== null ? sBase * (1 - sDisc / 100) : null;
              return (
                <button
                  key={s.id}
                  onClick={() => router.push(`/dashboard/subcategory/${s.id}${resolvedAgentId ? `?agentId=${resolvedAgentId}` : ""}`)}
                  className="text-left w-full"
                >
                  <Card className="hover:border-brand-primary/50 transition-colors overflow-hidden">
                    {s.imageUrl && (s.imageUrl.startsWith("http") || s.imageUrl.startsWith("/")) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.imageUrl} alt={s.name} className="w-full h-24 object-cover" />
                    ) : (
                      <div className="w-full h-16 bg-brand-surface flex items-center justify-center">
                        <CategoryIcon name={s.imageUrl} size={28} className="text-brand-primary opacity-60" />
                      </div>
                    )}
                    <CardContent className="py-2 space-y-0.5">
                      <p className="font-medium text-brand-text text-sm truncate">{s.name}</p>
                      {sFinal !== null && (
                        <p className="text-xs text-brand-primary font-medium">₹{sFinal.toFixed(0)}</p>
                      )}
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Booking history shortcut ── */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/bookings")}>
          <History size={14} /> My bookings
        </Button>
      </div>

      {/* ── Multi-service upsell modal ── */}
      {showUpsell && selectedHour !== null && (() => {
        // Compute prices for all selectable subs
        const allSelectable = [
          {
            id,
            name: sub?.name ?? "",
            imageUrl: sub?.imageUrl ?? null,
            base: base ?? 0,
            disc,
            final: discounted ?? 0,
            hasPricing: !!pricing,
            isMain: true,
          },
          ...otherSubs.map((s: any) => {
            const sp = s.agentPricing;
            const sBase = sp ? Number(sp.baseServiceCharge) : 0;
            const sDisc = sp ? Number(sp.discountPercent) : 0;
            return {
              id: s.id,
              name: s.name,
              imageUrl: s.imageUrl,
              base: sBase,
              disc: sDisc,
              final: sBase * (1 - sDisc / 100),
              hasPricing: !!sp,
              isMain: false,
            };
          }),
        ];
        const selected = allSelectable.filter((s) => selectedSubIds.has(s.id) && s.hasPricing);
        const totalOriginal = selected.reduce((sum, s) => sum + s.base, 0);
        const totalAfterIndividual = selected.reduce((sum, s) => sum + s.final, 0);

        // Bulk discount from category config
        const selCount = selected.length;
        let bulkDiscPct = 0;
        if (catConfig) {
          if (selCount >= 4) bulkDiscPct = Number(catConfig.bulkDiscount4Plus);
          else if (selCount === 3) bulkDiscPct = Number(catConfig.bulkDiscount3);
          else if (selCount === 2) bulkDiscPct = Number(catConfig.bulkDiscount2);
        }
        const bulkSavings = totalAfterIndividual * (bulkDiscPct / 100);
        const totalFinal  = totalAfterIndividual - bulkSavings;
        const savings     = totalOriginal - totalFinal;
        return (
          <div
            className="fixed inset-0 z-50 flex sm:items-center sm:justify-center"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowUpsell(false); }}
          >
            <div className="bg-white flex flex-col overflow-hidden w-full h-full sm:w-auto sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl">
              {/* Header */}
              <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="font-heading text-lg text-brand-text">Book services together</h2>
                  <p className="text-xs text-brand-textMuted mt-0.5">
                    {fmtSlot(selectedHour, slotData?.slotDurationHours ?? 1)} &bull; {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                </div>
                <button onClick={() => setShowUpsell(false)} className="ml-4 mt-0.5 p-1 rounded-full hover:bg-gray-100">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              {/* Service list */}
              <div className="min-h-0 overflow-y-auto px-4 py-3 space-y-2">
                {allSelectable.map((s) => {
                  const isSelected = selectedSubIds.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSub(s.id)}
                      disabled={s.isMain}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? "border-brand-primary bg-brand-primary/5"
                          : "border-gray-100 hover:border-gray-200 bg-white"
                      } ${s.isMain ? "cursor-default" : "cursor-pointer"}`}
                    >
                      {/* Checkbox */}
                      {isSelected
                        ? <CheckSquare2 size={20} className="text-brand-primary flex-shrink-0" />
                        : <div className="w-5 h-5 border-2 border-gray-300 rounded-sm flex-shrink-0" />
                      }

                      {/* Image */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-brand-surface">
                        {s.imageUrl && (s.imageUrl.startsWith("http") || s.imageUrl.startsWith("/")) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <CategoryIcon name={s.imageUrl} size={18} className="text-brand-primary opacity-60" />
                          </div>
                        )}
                      </div>

                      {/* Name + price */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-brand-text text-sm truncate">{s.name}</p>
                          {s.isMain && (
                            <span className="text-[9px] bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">Primary</span>
                          )}
                        </div>
                        {s.hasPricing ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {s.disc > 0 && <span className="text-[10px] line-through text-brand-textMuted">₹{s.base}</span>}
                            <span className="text-sm font-bold text-brand-primary">₹{s.final.toFixed(0)}</span>
                            {s.disc > 0 && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{s.disc}% off</span>}
                          </div>
                        ) : (
                          <p className="text-[10px] text-brand-textMuted mt-0.5">Pricing on request</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Price summary + CTA */}
              <div className="px-4 pt-3 pb-5 border-t border-gray-100 bg-gray-50 space-y-3">
                {selected.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="space-y-0.5">
                        {totalOriginal !== totalAfterIndividual && (
                          <p className="text-brand-textMuted text-xs">
                            Total MRP: <span className="line-through">₹{totalOriginal.toFixed(0)}</span>
                          </p>
                        )}
                        {bulkDiscPct > 0 && (
                          <p className="text-xs text-brand-textMuted">
                            After individual discounts: ₹{totalAfterIndividual.toFixed(0)}
                          </p>
                        )}
                        <p className="font-semibold text-brand-text">
                          Total: <span className="text-brand-primary">₹{totalFinal.toFixed(0)}</span>
                        </p>
                      </div>
                      {savings > 0.5 && (
                        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full">
                          <Tag size={11} />
                          <span className="text-xs font-semibold">You save ₹{savings.toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                    {bulkDiscPct > 0 && (
                      <div className="flex items-center gap-1.5 bg-brand-primary/8 border border-brand-primary/20 px-3 py-1.5 rounded-lg">
                        <Tag size={11} className="text-brand-primary" />
                        <span className="text-xs text-brand-primary font-semibold">
                          Extra {bulkDiscPct}% bulk discount for booking {selCount} services!
                        </span>
                        {bulkSavings > 0.5 && (
                          <span className="text-xs text-brand-primary ml-auto">−₹{bulkSavings.toFixed(0)}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => { if (requireLogin()) return; setShowUpsell(false); setShowForm(true); }}
                  disabled={selected.length === 0}
                >
                  <CalendarCheck size={15} />
                  Book {selected.length} service{selected.length !== 1 ? "s" : ""} &mdash; ₹{totalFinal.toFixed(0)}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Map picker modal ── */}
      {showMapPicker && (
        <LocationPickerModal
          initialLoc={loc}
          onConfirm={handleMapPickerConfirm}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </div>
  );
}

