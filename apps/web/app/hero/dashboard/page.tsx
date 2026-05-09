"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Clock, RefreshCw, Package, FileText } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { getSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";

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
  state: "needs_request" | "pending" | "verified";
  request?: { id: string; status: string; details: any; createdAt: string };
  profile?: any;
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
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["public", "categories"],
    queryFn: () => api.get<Category[]>("/api/user/categories"),
  });

  const verifiedProductCategories = categories.filter((c) =>
    profile?.categoryIds?.includes(c.id) && c.type === "PRODUCT"
  );
  const verifiedServiceCategories = categories.filter((c) =>
    profile?.categoryIds?.includes(c.id) && c.type === "SERVICE"
  );

  return (
    <div className="page-enter space-y-6">
      <Card>
        <CardContent className="py-8 text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-success/15 text-brand-success">
            <ShieldCheck size={24} />
          </div>
          <h1 className="font-heading text-2xl text-brand-text">
            You're verified
          </h1>
          <p className="text-brand-textMuted text-sm">
            Welcome, {profile?.serviceName ?? profile?.shopName ?? "Hero"}. Manage your
            products or services below.
          </p>
        </CardContent>
      </Card>

      {/* Verified Categories */}
      <Card>
        <CardContent className="py-6 space-y-4">
          <h2 className="font-heading text-lg text-brand-text">Verified Categories</h2>
          {/* Product Categories hidden */}
          {verifiedServiceCategories.length > 0 && (
            <div>
              <p className="text-sm font-medium text-brand-text mb-2">Service Categories</p>
              <div className="flex flex-wrap gap-2">
                {verifiedServiceCategories.map((c) => (
                  <span key={c.id} className="px-3 py-1.5 rounded-sm bg-brand-primary/10 text-brand-primary text-sm">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
