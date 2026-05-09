"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Phone,
  User, CheckCircle2, Loader2, CalendarCheck, History, X
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStoredLocation, type UserLocation } from "@/lib/location";
import { getSocket } from "@/lib/socket";

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
}

interface ServiceRequestResult {
  id: string;
  status: string;
  hero?: { id: string; serviceName: string | null; shopName: string | null; phone: string; gender: string | null; user: { name: string | null } } | null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function fmtHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
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

  // Slot picker state
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Booking form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", gender: "MALE", address: "" });
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

  const fromDate = (() => { const d = new Date(todayStr()); d.setDate(d.getDate() + weekOffset * 7); return d.toISOString().split("T")[0]; })();

  const { data: slotData } = useQuery<SlotState>({
    queryKey: ["slots", id, agentId, fromDate],
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

  const book = useMutation({
    mutationFn: () =>
      api.post("/api/user/service-requests", {
        subcategoryId: id,
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
    onSuccess: () => {
      toast.success("Booking request sent! Waiting for a provider to accept.");
      setShowForm(false);
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
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => setWeekOffset((w) => w - 1)} disabled={weekOffset <= 0}><ChevronLeft size={14} /></Button>
              <span className="text-xs text-brand-textMuted">
                {new Date(fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {new Date(addDays(fromDate, 6)).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setWeekOffset((w) => w + 1)}><ChevronRight size={14} /></Button>
            </div>
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
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {slotHours.map(({ hour, available }) => (
              <button
                key={hour}
                disabled={!available}
                onClick={() => setSelectedHour(hour)}
                className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                  selectedHour === hour
                    ? "border-brand-primary bg-brand-primary text-white"
                    : available
                      ? "border-brand-border hover:border-brand-primary/60 text-brand-text"
                      : "border-brand-border/30 text-brand-textMuted/40 cursor-not-allowed"
                }`}
              >
                {fmtHour(hour)}
              </button>
            ))}
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
                {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })} at {fmtHour(selectedHour)}
              </p>
              <Button size="sm" onClick={() => setShowForm(true)}>Book this slot</Button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Your name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-text">Gender</label>
                <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} className="w-full p-2.5 rounded-sm border border-brand-border bg-brand-surface text-sm text-brand-text">
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <Input label="Address / landmark" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <Button
              className="w-full"
              onClick={() => book.mutate()}
              loading={book.isPending}
              disabled={!form.name || !form.phone || !form.address}
            >
              <CheckCircle2 size={15} /> Send booking request
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
                  className="text-left"
                >
                  <Card className="hover:border-brand-primary/50 transition-colors">
                    <CardContent className="py-3 space-y-1">
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
    </div>
  );
}

