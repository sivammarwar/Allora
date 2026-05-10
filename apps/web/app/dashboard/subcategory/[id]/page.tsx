"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Phone,
  User, CheckCircle2, Loader2, CalendarCheck, History, X, MapPin, Check, Tag,
  CheckSquare2
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStoredLocation, type UserLocation } from "@/lib/location";
import { getSocket } from "@/lib/socket";
import { CategoryIcon } from "@/components/shared/CategoryIcon";

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
  pageContent: { html?: string } | null;
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
  hero?: { id: string; serviceName: string | null; shopName: string | null; phone: string; gender: string | null; user: { name: string | null } } | null;
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
function todayStr() { return new Date().toISOString().split("T")[0]; }
function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0];
}

export default function UserSubcategoryPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agentId");
  const qc = useQueryClient();

  const [loc, setLoc] = useState<UserLocation | null>(null);
  useEffect(() => setLoc(getStoredLocation()), []);

  // Real-time clock — updates every minute so past slots fade automatically
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const todayDateStr = now.toISOString().split("T")[0];
  const currentHour = now.getHours();

  // Slot picker state
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  // Booking form state
  const [showForm, setShowForm] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", gender: "MALE", address: "" });

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
    queryKey: ["sub-pricing", agentId, id],
    queryFn: async () => {
      if (!agentId) return null;
      const subs = await api.get<any[]>(`/api/user/categories/${sub!.category.id}/subcategories?lat=${loc!.lat}&lng=${loc!.lng}&agentId=${agentId}`);
      const found = subs.find((s: any) => s.id === id);
      return found?.agentPricing ?? null;
    },
    enabled: !!agentId && !!sub && !!loc,
  });

  const pricing = pricingFromCat;
  const base = pricing ? Number(pricing.baseServiceCharge) : null;
  const disc = pricing ? Number(pricing.discountPercent) : 0;
  const discounted = base !== null ? base * (1 - disc / 100) : null;
  const transport = pricing ? Number(pricing.transportChargePerKm) : null;

  const fromDate = todayStr();

  const { data: slotData } = useQuery<SlotState>({
    queryKey: ["slots", id, agentId],
    queryFn: () => api.get(`/api/user/subcategories/${id}/slots?agentId=${agentId}&from=${fromDate}&days=7`),
    enabled: !!agentId,
    refetchInterval: 30000,
  });

  // 7 day columns
  const days = Array.from({ length: 7 }, (_, i) => addDays(fromDate, i));

  // Real-time slot updates
  useEffect(() => {
    if (!agentId) return;
    const s = getSocket("/service");
    s.emit("slots:watch", `${id}:${selectedDate}`);
    const onUpdate = () => qc.invalidateQueries({ queryKey: ["slots", id] });
    s.on("slot:updated", onUpdate);
    return () => { s.off("slot:updated", onUpdate); s.emit("slots:unwatch", `${id}:${selectedDate}`); };
  }, [id, agentId, selectedDate, qc]);

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
        agentId: agentId!,
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
    queryKey: ["sub-suggestions", sub?.category.id, agentId],
    queryFn: () =>
      api.get(`/api/user/categories/${sub!.category.id}/subcategories?lat=${loc!.lat}&lng=${loc!.lng}${agentId ? `&agentId=${agentId}` : ""}`),
    enabled: !!sub && !!loc,
  });
  const otherSubs = suggestions.filter((s: any) => s.id !== id);

  if (!loc) return <Card><CardContent className="py-10 text-center text-sm">Set location first.</CardContent></Card>;
  if (subLoading || !sub) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-primary" /></div>;

  const slotHours = slotData?.slots[selectedDate] ?? [];

  return (
    <div className="page-enter space-y-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft size={14} /> Back</Button>

      {/* ── Pricing header ── */}
      <div className="rounded-lg border border-brand-border bg-brand-surface p-5 space-y-3">
        <h1 className="font-heading text-2xl text-brand-text">{sub.name}</h1>
        <p className="text-xs text-brand-textMuted uppercase tracking-wide">{sub.category.name}</p>
        {pricing ? (
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-brand-textMuted mb-0.5">Service charge</p>
              <div className="flex items-center gap-2">
                {disc > 0 && <span className="line-through text-brand-textMuted text-sm">₹{base}</span>}
                <span className="text-xl font-bold text-brand-primary">₹{discounted?.toFixed(0)}</span>
                {disc > 0 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{disc}% off</span>}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-brand-textMuted mb-0.5">Transport</p>
              <span className="text-sm font-medium text-brand-text">₹{transport}/km</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-brand-textMuted">Pricing not set for your area yet.</p>
        )}
      </div>

      {/* ── PM Page Content ── */}
      {sub.pageContent?.html && (
        <Card>
          <CardContent className="py-5">
            <div
              className="prose max-w-none text-brand-text text-sm leading-relaxed"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: sub.pageContent.html }}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Slot picker ── */}
      {agentId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg text-brand-text">Available Slots</h2>
            <span className="text-xs text-brand-textMuted">
              {new Date(fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {new Date(addDays(fromDate, 6)).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          </div>

          {/* Day tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {days.map((d) => {
              const dayObj = new Date(d);
              const hasSlots = (slotData?.slots[d] ?? []).some((s) => s.available);
              return (
                <button
                  key={d}
                  onClick={() => { setSelectedDate(d); setSelectedHour(null); }}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg border text-xs transition-colors ${
                    selectedDate === d
                      ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                      : "border-brand-border text-brand-textMuted hover:border-brand-primary/50"
                  } ${!hasSlots && slotData ? "opacity-40" : ""}`}
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
                No slots available on this day.
              </p>
            )}
          </div>

          {selectedHour !== null && !showForm && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/20">
              <p className="text-sm text-brand-text">
                <CalendarCheck size={14} className="inline mr-1.5 text-brand-primary" />
                {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })} at {fmtSlot(selectedHour, slotData?.slotDurationHours ?? 1)}
              </p>
              <Button size="sm" onClick={() => { setSelectedSubIds(new Set([id])); if (otherSubs.length > 0) setShowUpsell(true); else setShowForm(true); }}>Book this slot</Button>
            </div>
          )}
        </div>
      )}

      {/* ── Booking Form ── */}
      {showForm && selectedHour !== null && (
        <Card className="border-brand-primary/30">
          <CardContent className="py-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg text-brand-text">Your details</h2>
              <button onClick={() => setShowForm(false)}><X size={16} className="text-brand-textMuted" /></button>
            </div>
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
              const totalO = allPriceable.reduce((a, s) => a + s.base, 0);
              const totalF = allPriceable.reduce((a, s) => a + s.final, 0);
              const saved  = totalO - totalF;
              return (
                <div className="rounded-lg bg-brand-primary/5 border border-brand-primary/20 px-3 py-2.5 space-y-1.5">
                  {allPriceable.map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <span className={`text-brand-text ${i === 0 ? "font-medium" : ""}`}>{s.name}</span>
                      <div className="flex items-center gap-1.5">
                        {s.disc > 0 && <span className="text-[10px] line-through text-brand-textMuted">₹{s.base}</span>}
                        <span className="font-semibold text-brand-primary">₹{s.final.toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                  {allPriceable.length > 1 && (
                    <div className="flex items-center justify-between pt-1 border-t border-brand-primary/20 text-sm font-semibold">
                      <span className="text-brand-text">Total</span>
                      <div className="flex items-center gap-2">
                        {saved > 0.5 && <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Save ₹{saved.toFixed(0)}</span>}
                        <span className="text-brand-primary">₹{totalF.toFixed(0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Your name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-brand-text">Gender</label>
                <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} className="w-full p-2.5 rounded-sm border border-brand-border bg-brand-surface text-sm text-brand-text">
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-brand-text">Address / landmark</label>
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
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Full address, landmark…" />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => bookBulk.mutate()}
              loading={bookBulk.isPending}
              disabled={!form.name || !form.phone || !form.address}
            >
              <CheckCircle2 size={15} /> {selectedSubIds.size > 1 ? `Confirm ${selectedSubIds.size} bookings` : "Send booking request"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Acceptance notification ── */}
      {acceptedRequest && (
        <Card className="border-brand-success/40 bg-brand-success/5">
          <CardContent className="py-5 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-brand-success" />
              <h3 className="font-medium text-brand-text">Booking accepted!</h3>
            </div>
            {acceptedRequest.hero && (
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-1.5"><User size={13} className="text-brand-textMuted" /> {acceptedRequest.hero.user.name ?? acceptedRequest.hero.serviceName}</p>
                <p className="flex items-center gap-1.5"><Phone size={13} className="text-brand-textMuted" /> {acceptedRequest.hero.phone}</p>
                {acceptedRequest.hero.gender && <p className="text-xs text-brand-textMuted">{acceptedRequest.hero.gender}</p>}
              </div>
            )}
            <Button size="sm" variant="ghost" onClick={() => setAcceptedRequest(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

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
                  onClick={() => router.push(`/dashboard/subcategory/${s.id}${agentId ? `?agentId=${agentId}` : ""}`)}
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
        const totalFinal   = selected.reduce((sum, s) => sum + s.final, 0);
        const savings      = totalOriginal - totalFinal;
        return (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowUpsell(false); }}
          >
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col" style={{ maxHeight: "92dvh" }}>
              {/* Header */}
              <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-gray-100">
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
              <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
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
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? "border-brand-primary bg-brand-primary" : "border-gray-300"
                      }`}>
                        {isSelected && <CheckSquare2 size={11} className="text-white" />}
                      </div>

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
                  <div className="flex items-center justify-between text-sm">
                    <div className="space-y-0.5">
                      {totalOriginal !== totalFinal && (
                        <p className="text-brand-textMuted">
                          Total MRP: <span className="line-through">₹{totalOriginal.toFixed(0)}</span>
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
                )}
                <Button
                  className="w-full"
                  onClick={() => { setShowUpsell(false); setShowForm(true); }}
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
    </div>
  );
}

