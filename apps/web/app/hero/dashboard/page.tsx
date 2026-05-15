"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Clock, RefreshCw, Package, FileText, Bell, CalendarClock, IndianRupee, ToggleLeft, ToggleRight } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { getSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

interface Category {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
}
interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

interface MeResponse {
  state: "needs_request" | "pending" | "verified" | "payment_required";
  request?: { id: string; status: string; details: any; createdAt: string };
  profile?: any;
  feeAmount?: number;
  validityMonths?: number;
  expired?: boolean;
}

interface FormState {
  name: string;
  serviceName: string;
  shopName: string;
  categoryIds: string[];
  subcategoryIds: string[];
  phone: string;
  address: string;
  location: { lat: number; lng: number } | null;
  purpose: string;
  selectedAgentId: string | null;
}

const initialForm: FormState = {
  name: "",
  serviceName: "",
  shopName: "",
  categoryIds: [],
  subcategoryIds: [],
  phone: "",
  address: "",
  location: null,
  purpose: "",
  selectedAgentId: null,
};

export default function HeroDashboardPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<MeResponse>({
    queryKey: ["hero", "me"],
    queryFn: () => api.get("/api/hero/me"),
  });

  // Listen for verification status updates and refresh
  useEffect(() => {
    const s = getSocket("/notifications");
    const handler = () => qc.invalidateQueries({ queryKey: ["hero", "me"] });
    s.on("verification:status_update", handler);
    return () => {
      s.off("verification:status_update", handler);
    };
  }, [qc]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-brand-primary" size={28} />
      </div>
    );
  }

  if (!data || data.state === "needs_request") {
    return <HeroRegisterForm onSubmitted={() => qc.invalidateQueries({ queryKey: ["hero", "me"] })} />;
  }

  if (data.state === "payment_required") {
    return (
      <HeroOnboardingPayment
        feeAmount={data.feeAmount ?? 999}
        validityMonths={data.validityMonths ?? 12}
        expired={data.expired ?? false}
        previousExpiresAt={data.profile?.onboardingExpiresAt ?? null}
      />
    );
  }

  if (data.state === "pending") {
    const inProgress = data.request?.status === "IN_PROGRESS";
    return (
      <div className="page-enter max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-primary/10 text-brand-primary">
              {inProgress ? <Loader2 className="animate-spin" size={26} /> : <Clock size={26} />}
            </div>
            <h1 className="font-heading text-2xl text-brand-text">
              {inProgress
                ? "Agent is on the way to your shop"
                : "Verification pending"}
            </h1>
            <p className="text-brand-textMuted">
              {inProgress
                ? "Hold tight — your agent will verify your details shortly."
                : "We've notified the agent for your area. You'll see updates here in real time."}
            </p>
            <p className="text-xs font-mono text-brand-textMuted">
              Submitted {new Date(data.request?.createdAt ?? "").toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verified
  return <HeroVerifiedDashboard profile={data.profile} />;
}

// ─── Hero Verified Dashboard ─────────────────────────────────────────────────
function HeroVerifiedDashboard({ profile }: { profile: any }) {
  const router = useRouter();
  const t = useT();
  const qc = useQueryClient();

  const { data: meData } = useQuery<MeResponse>({
    queryKey: ["hero", "me"],
    queryFn: () => api.get("/api/hero/me"),
  });
  const isAvailable = meData?.profile?.isAvailable ?? profile?.isAvailable ?? true;

  const toggleAvail = useMutation({
    mutationFn: (v: boolean) => api.put("/api/hero/availability", { isAvailable: v }),
    onMutate: async (newValue: boolean) => {
      await qc.cancelQueries({ queryKey: ["hero", "me"] });
      const previous = qc.getQueryData<MeResponse>(["hero", "me"]);
      qc.setQueryData<MeResponse>(["hero", "me"], (old) =>
        old ? { ...old, profile: { ...old.profile, isAvailable: newValue } } : old
      );
      return { previous };
    },
    onError: (_err: any, _vars: any, context: any) => {
      if (context?.previous) qc.setQueryData(["hero", "me"], context.previous);
      toast.error("Failed to update availability");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["hero", "me"] }),
  });

  const { data: incoming = [] } = useQuery<any[]>({ queryKey: ["hero", "service-requests", "incoming"], queryFn: () => api.get("/api/hero/service-requests/incoming"), refetchInterval: 30000 });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["public", "categories"],
    queryFn: () => api.get<Category[]>("/api/user/categories"),
  });

  const { data: allSubs = [] } = useQuery<Subcategory[]>({
    queryKey: ["public", "subcategories", "all"],
    queryFn: () => api.get<Subcategory[]>("/api/user/subcategories"),
  });

  const verifiedServiceCategories = categories.filter((c) =>
    profile?.categoryIds?.includes(c.id) && c.type === "SERVICE"
  );

  const verifiedSubcategories = allSubs.filter((s) =>
    profile?.subcategoryIds?.includes(s.id)
  );

  return (
    <div className="page-enter space-y-6">
      <Card>
        <CardContent className="py-8 text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-success/15 text-brand-success">
            <ShieldCheck size={24} />
          </div>
          <h1 className="font-heading text-2xl text-brand-text">
            {t("hero.verified")}
          </h1>
          <p className="text-brand-textMuted text-sm">
            {t("hero.verifiedDesc", { name: profile?.serviceName ?? profile?.shopName ?? "Hero" })}
          </p>
          {profile?.onboardingExpiresAt && (() => {
            const expiresAt = new Date(profile.onboardingExpiresAt);
            const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const expiringSoon = daysLeft <= 30;
            return (
              <div
                className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                  expiringSoon
                    ? "bg-amber-100 text-amber-800"
                    : "bg-brand-success/10 text-brand-success"
                }`}
              >
                <ShieldCheck size={12} />
                <span>
                  Subscription valid until{" "}
                  <strong>
                    {expiresAt.toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </strong>
                  {expiringSoon && daysLeft > 0 && <> · {daysLeft} day{daysLeft === 1 ? "" : "s"} left</>}
                </span>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Availability toggle */}
      <Card className={`border ${isAvailable ? "border-brand-success/40 bg-brand-success/5" : "border-red-400/40 bg-red-50/30"}`}>
        <CardContent className="py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-brand-text text-sm">
              {isAvailable ? t("hero.available") : t("hero.unavailable")}
            </p>
            <p className="text-xs text-brand-textMuted mt-0.5">
              {isAvailable ? t("hero.usersCanBook") : t("hero.bookingsPaused")}
            </p>
          </div>
          <button
            onClick={() => toggleAvail.mutate(!isAvailable)}
            disabled={toggleAvail.isPending}
            className="flex-shrink-0"
          >
            {isAvailable ? (
              <ToggleRight size={36} className="text-brand-success" />
            ) : (
              <ToggleLeft size={36} className="text-red-400" />
            )}
          </button>
        </CardContent>
      </Card>

      {incoming.length > 0 && (
        <Card className="border-brand-primary/30 bg-brand-primary/5 cursor-pointer hover:border-brand-primary/60 transition-colors" onClick={() => router.push("/hero/requests")}>
          <CardContent className="py-4 flex items-center gap-3">
            <Bell size={20} className="text-brand-primary flex-shrink-0" />
            <p className="text-sm font-medium text-brand-text">
              {incoming.length} new booking request{incoming.length > 1 ? "s" : ""} waiting for you
            </p>
          </CardContent>
        </Card>
      )}

      {/* Verified Categories + Subcategories */}
      {verifiedServiceCategories.length > 0 && (
        <Card>
          <CardContent className="py-5 space-y-4">
            <h2 className="font-heading text-base text-brand-text">Your Verified Services</h2>
            <div className="space-y-3">
              {verifiedServiceCategories.map((cat) => {
                const subs = verifiedSubcategories.filter((s) => s.categoryId === cat.id);
                return (
                  <div key={cat.id}>
                    {/* Category pill */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 rounded-full bg-brand-primary text-white text-xs font-semibold">
                        {cat.name}
                      </span>
                    </div>
                    {/* Subcategory chips */}
                    {subs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pl-2">
                        {subs.map((s) => (
                          <span
                            key={s.id}
                            className="px-2.5 py-1 rounded-full border border-brand-primary/30 bg-brand-primary/5 text-brand-primary text-xs font-medium"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="pl-2 text-xs text-brand-textMuted">No subcategories assigned</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Products card hidden */}

        {verifiedServiceCategories.length > 0 && (
          <Card
            className="cursor-pointer hover:border-brand-primary/50 transition-colors"
            onClick={() => router.push("/hero/services")}
          >
            <CardContent className="py-6 space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-primary/10 text-brand-primary">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="font-heading text-lg text-brand-text">Services</h2>
                <p className="text-sm text-brand-textMuted">
                  Set pricing for your verified subcategories
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="cursor-pointer hover:border-brand-primary/50 transition-colors" onClick={() => router.push("/hero/slots")}>
          <CardContent className="py-6 space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-primary/10 text-brand-primary">
              <CalendarClock size={24} />
            </div>
            <div>
              <h2 className="font-heading text-lg text-brand-text">{t("hero.mySlots")}</h2>
              <p className="text-sm text-brand-textMuted">{t("hero.slotsDesc")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-brand-primary/50 transition-colors" onClick={() => router.push("/hero/earnings")}>
          <CardContent className="py-6 space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-primary/10 text-brand-primary">
              <IndianRupee size={24} />
            </div>
            <div>
              <h2 className="font-heading text-lg text-brand-text">{t("hero.earnings")}</h2>
              <p className="text-sm text-brand-textMuted">{t("hero.earningsDesc")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Registration form ─────────────────────────────────────────────────────
function HeroRegisterForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [form, setForm] = useState<FormState>(initialForm);

  const { data: cats = [] } = useQuery<Category[]>({
    queryKey: ["public", "categories", "service-onboarding"],
    queryFn: async () => {
      // Public user endpoint — accessible to all authenticated users including heroes
      try {
        return await api.get<Category[]>("/api/user/categories");
      } catch {
        return [];
      }
    },
  });

  const { data: allSubs = [] } = useQuery<Subcategory[]>({
    queryKey: ["public", "subcategories", "all"],
    queryFn: async () => {
      try {
        // Public user endpoint — accessible to all authenticated users including heroes
        const rows = await api.get<any[]>("/api/user/subcategories");
        return rows.map((s) => ({
          id: s.id,
          name: s.name,
          categoryId: s.categoryId,
        }));
      } catch {
        return [];
      }
    },
  });

  const subOptions = useMemo(
    () => allSubs.filter((s) => {
      const category = cats.find(c => c.id === s.categoryId);
      return form.categoryIds.includes(s.categoryId) && category?.type === 'SERVICE';
    }),
    [allSubs, form.categoryIds, cats]
  );

  // Fetch nearby agents when location is set
  const { data: nearbyAgents = [], refetch: refetchAgents, isFetching: isFetchingAgents } = useQuery({
    queryKey: ["agents-nearby", form.location?.lat, form.location?.lng],
    queryFn: async () => {
      if (!form.location) return [];
      try {
        return await api.get<any[]>(
          `/api/user/agents-nearby?lat=${form.location.lat}&lng=${form.location.lng}&radius=40`
        );
      } catch {
        return [];
      }
    },
    enabled: !!form.location,
  });

  // Auto-select the officially assigned agent (tier-1 match) when results arrive
  useEffect(() => {
    if (!nearbyAgents.length || form.selectedAgentId) return;
    const assigned = nearbyAgents.find((a: any) => a.isAssigned);
    if (assigned) {
      setForm((f) => ({ ...f, selectedAgentId: assigned.id }));
    }
  }, [nearbyAgents, form.selectedAgentId]);

  const submit = useMutation({
    mutationFn: () => {
      if (!form.location) throw new Error("Location is required");
      return api.post("/api/hero/register-request", {
        name: form.name.trim(),
        serviceName: form.serviceName.trim() || null,
        shopName: form.shopName.trim() || null,
        categoryIds: form.categoryIds,
        subcategoryIds: form.subcategoryIds.length > 0 ? form.subcategoryIds : null,
        phone: form.phone.trim(),
        address: form.address.trim(),
        locationLat: form.location.lat,
        locationLng: form.location.lng,
        purpose: form.purpose.trim() || null,
        preferredAgentId: form.selectedAgentId,
      });
    },
    onSuccess: () => {
      toast.success("Submitted! An agent will verify you shortly.");
      onSubmitted();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : (e as Error).message ?? "Failed"),
  });

  const hasServiceCategories = form.categoryIds.some(id => cats.find(c => c.id === id)?.type === 'SERVICE');
  const canSubmit =
    form.name.trim().length >= 1 &&
    (!hasServiceCategories || form.serviceName.trim().length >= 2) &&
    form.categoryIds.length >= 1 &&
    (!hasServiceCategories || form.subcategoryIds.length >= 1) &&
    form.phone.trim().length >= 7 &&
    form.address.trim().length >= 3 &&
    !!form.location &&
    !!form.selectedAgentId;

  return (
    <div className="page-enter max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Register your service</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          We'll send your details to an agent in your area for verification.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              inputMode="tel"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={hasServiceCategories ? "Service name" : "Service name (optional)"}
              placeholder="e.g. Sharma Cleaning"
              value={form.serviceName}
              onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
            />
            <Input
              label="Shop name (optional)"
              value={form.shopName}
              onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Service Categories ({form.categoryIds.filter(id => cats.find(c => c.id === id)?.type === 'SERVICE').length} selected)
            </label>
            <div className="rounded-sm border border-brand-border bg-brand-bg p-2 max-h-48 overflow-auto space-y-1">
              {cats.filter(c => c.type === 'SERVICE').length === 0 ? (
                <p className="text-sm text-brand-textMuted px-2 py-3 text-center">
                  No service categories available.
                </p>
              ) : (
                cats.filter(c => c.type === 'SERVICE').map((c) => {
                  const checked = form.categoryIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-[rgba(192,98,106,0.06)] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setForm({
                            ...form,
                            categoryIds: checked
                              ? form.categoryIds.filter((id) => id !== c.id)
                              : [...form.categoryIds, c.id],
                            subcategoryIds: [],
                          })
                        }
                        className="accent-brand-primary"
                      />
                      <span className="text-sm text-brand-text">{c.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
          {/* Product Categories hidden */}
          {form.categoryIds.filter(id => cats.find(c => c.id === id)?.type === 'SERVICE').length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">
                Subcategories ({form.subcategoryIds.length} selected)
              </label>
              <div className="rounded-sm border border-brand-border bg-brand-bg p-2 max-h-48 overflow-auto space-y-1">
                {subOptions.length === 0 ? (
                  <p className="text-sm text-brand-textMuted px-2 py-3 text-center">
                    No subcategories under selected service categories.
                  </p>
                ) : (
                  subOptions.map((s) => {
                    const checked = form.subcategoryIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-[rgba(192,98,106,0.06)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setForm({
                              ...form,
                              subcategoryIds: checked
                                ? form.subcategoryIds.filter((id) => id !== s.id)
                                : [...form.subcategoryIds, s.id],
                            })
                          }
                          className="accent-brand-primary"
                        />
                        <span className="text-sm text-brand-text">{s.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Location on map
            </label>
            <LocationPicker
              value={form.location}
              onChange={(loc) =>
                setForm((f) => ({ ...f, location: loc, selectedAgentId: null }))
              }
              onAddressChange={(addr) =>
                setForm((f) => ({ ...f, address: addr }))
              }
            />
          </div>

          {/* Agent Selection */}
          {form.location && (
            <div className="border border-brand-border rounded-sm bg-brand-bg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-brand-text">
                  Select an agent for verification
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-brand-textMuted">
                    {nearbyAgents.length} agent{nearbyAgents.length !== 1 ? 's' : ''} within 40km
                  </span>
                  <button
                    onClick={() => refetchAgents()}
                    disabled={isFetchingAgents}
                    className="p-1.5 rounded-sm hover:bg-brand-surface text-brand-textMuted hover:text-brand-primary transition-colors disabled:opacity-50"
                    title="Refresh agents"
                  >
                    <RefreshCw size={14} className={isFetchingAgents ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {nearbyAgents.length === 0 ? (
                <p className="text-sm text-brand-textMuted py-2">
                  No agents available in your area. Please contact support.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {nearbyAgents.map((agent: any) => (
                    <label
                      key={agent.id}
                      className={`flex items-center gap-3 p-3 rounded-sm cursor-pointer border transition-colors ${
                        form.selectedAgentId === agent.id
                          ? 'border-brand-primary bg-brand-primary/5'
                          : 'border-brand-border hover:border-brand-primary/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="agent"
                        value={agent.id}
                        checked={form.selectedAgentId === agent.id}
                        onChange={() => setForm({ ...form, selectedAgentId: agent.id })}
                        className="accent-brand-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-brand-text truncate">
                            {agent.name || 'Agent'}
                          </span>
                          {agent.isAssigned ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-500/15 text-green-600 dark:text-green-400">
                              Assigned to your area
                            </span>
                          ) : (
                            <span className="text-xs text-brand-primary font-mono">
                              {agent.distanceKm}km away
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-brand-textMuted truncate">
                          {agent.matchedAreaName || agent.primaryArea?.name || agent.areas[0]?.name || 'Service Area'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Description (optional)
            </label>
            <textarea
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              rows={3}
              className="w-full p-3 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              size="lg"
              onClick={() => submit.mutate()}
              loading={submit.isPending}
              disabled={!canSubmit}
            >
              Submit for verification
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Hero Onboarding Payment ─────────────────────────────────────────────────
function HeroOnboardingPayment({
  feeAmount,
  validityMonths,
  expired,
  previousExpiresAt,
}: {
  feeAmount: number;
  validityMonths: number;
  expired: boolean;
  previousExpiresAt: string | null;
}) {
  const initiate = useMutation<{ redirectUrl: string; merchantTransactionId: string; amount: number }>({
    mutationFn: () => api.post("/api/hero/onboarding-payment/initiate"),
    onSuccess: (data) => {
      try { sessionStorage.setItem("allora_hero_pending_txn", data.merchantTransactionId); } catch {}
      window.location.href = data.redirectUrl;
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Failed to start payment");
    },
  });

  const validityLabel = validityMonths === 1 ? "1 month" : `${validityMonths} months`;
  const heading = expired ? "Your validity has expired" : "You're verified!";
  const subheading = expired
    ? "Renew your subscription to continue receiving service requests."
    : "Complete your onboarding fee to activate your hero dashboard and start receiving service requests.";

  return (
    <div className="page-enter max-w-xl mx-auto">
      <Card>
        <CardContent className="py-10 px-6 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-primary/10 text-brand-primary">
              <ShieldCheck size={26} />
            </div>
            <h1 className="font-heading text-2xl text-brand-text">{heading}</h1>
            <p className="text-brand-textMuted text-sm">{subheading}</p>
            {expired && previousExpiresAt && (
              <p className="text-xs text-amber-600 font-medium">
                Previous validity ended on{" "}
                {new Date(previousExpiresAt).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-brand-border bg-brand-surface p-6 text-center">
            <p className="text-xs uppercase tracking-wide text-brand-textMuted font-semibold">
              Onboarding fee
            </p>
            <p className="text-5xl font-extrabold text-brand-primary my-2">
              ₹{feeAmount}
            </p>
            <p className="text-xs text-brand-textMuted">
              Valid for <strong className="text-brand-text">{validityLabel}</strong> · Non-refundable
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-brand-text">What you get:</p>
            <ul className="text-sm text-brand-textMuted space-y-1.5">
              <li>✓ {validityLabel} of full hero dashboard access</li>
              <li>✓ Receive real-time service requests</li>
              <li>✓ Earnings tracking & analytics</li>
              <li>✓ Slot management & availability</li>
            </ul>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={() => initiate.mutate()}
            loading={initiate.isPending}
          >
            Pay ₹{feeAmount} via PhonePe
          </Button>

          <p className="text-xs text-center text-brand-textMuted">
            You&apos;ll be redirected to PhonePe to complete the payment securely.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
