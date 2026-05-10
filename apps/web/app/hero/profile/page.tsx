"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCircle, Phone, MapPin, Briefcase, Store, ShieldCheck,
  Calendar, Clock, Star, Loader2, CheckCircle2, XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface HeroProfile {
  id: string;
  shopName: string | null;
  serviceName: string | null;
  phone: string;
  address: string;
  gender: string | null;
  isAvailable: boolean;
  isVerifiedByAgent: boolean;
  profileImageUrl: string | null;
  categoryIds: string[];
  subcategoryIds: string[];
  workingDays: number[];
  activeFrom: string | null;
  activeTo: string | null;
  serviceRadius: string;
  createdAt: string;
  user: { name: string | null; email: string };
  verifiedByAgent: { id: string; user: { name: string | null; email: string } } | null;
}

interface PricingRow {
  subcategoryId: string;
  subcategoryName: string;
  categoryName: string;
  baseServiceCharge: string;
  discountPercent: string;
}

export default function HeroProfilePage() {
  const qc = useQueryClient();

  const { data: me, isLoading } = useQuery<{ state: string; profile: HeroProfile }>({
    queryKey: ["hero", "me"],
    queryFn: () => api.get("/api/hero/me"),
  });

  const { data: pricing = [] } = useQuery<PricingRow[]>({
    queryKey: ["hero", "pricing"],
    queryFn: () => api.get("/api/hero/pricing"),
    enabled: me?.state === "verified",
  });

  const toggleAvail = useMutation({
    mutationFn: (v: boolean) => api.put("/api/hero/availability", { isAvailable: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hero", "me"] }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-primary" /></div>;
  }

  const profile = me?.profile;
  if (!profile) {
    return <div className="text-center py-16 text-brand-textMuted text-sm">Profile not available.</div>;
  }

  const groupedServices = pricing.reduce<Record<string, PricingRow[]>>((acc, row) => {
    (acc[row.categoryName] = acc[row.categoryName] ?? []).push(row);
    return acc;
  }, {});

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">My Profile</h1>
        <p className="text-brand-textMuted text-sm mt-1">Your professional details and service info.</p>
      </div>

      {/* ── Identity card ── */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center gap-4">
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover border-2 border-brand-primary/30 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0">
                <UserCircle size={36} className="text-brand-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-heading text-xl text-brand-text leading-tight">
                {profile.user?.name ?? "—"}
              </p>
              {profile.serviceName && (
                <p className="text-sm text-brand-textMuted">{profile.serviceName}</p>
              )}
              {profile.shopName && (
                <p className="text-sm text-brand-textMuted flex items-center gap-1">
                  <Store size={12} /> {profile.shopName}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                {profile.isVerifiedByAgent ? (
                  <span className="flex items-center gap-1 text-[11px] text-brand-success font-medium bg-brand-success/10 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={11} /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <XCircle size={11} /> Pending
                  </span>
                )}
                {profile.gender && (
                  <span className="text-[11px] text-brand-textMuted bg-brand-surface px-2 py-0.5 rounded-full capitalize">
                    {profile.gender.toLowerCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Availability toggle ── */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-brand-text text-sm">Availability</p>
            <p className="text-xs text-brand-textMuted mt-0.5">
              {profile.isAvailable ? "You are accepting new bookings" : "You are not accepting bookings"}
            </p>
          </div>
          <button
            onClick={() => toggleAvail.mutate(!profile.isAvailable)}
            disabled={toggleAvail.isPending}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              profile.isAvailable ? "bg-brand-success" : "bg-brand-border"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                profile.isAvailable ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </CardContent>
      </Card>

      {/* ── Contact & location ── */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <p className="font-medium text-brand-text text-sm mb-1">Contact & Location</p>
          <div className="flex items-start gap-3 text-sm text-brand-textMuted">
            <Phone size={14} className="mt-0.5 shrink-0 text-brand-primary" />
            <span>{profile.phone}</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-brand-textMuted">
            <MapPin size={14} className="mt-0.5 shrink-0 text-brand-primary" />
            <span>{profile.address}</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-brand-textMuted">
            <Briefcase size={14} className="mt-0.5 shrink-0 text-brand-primary" />
            <span>{profile.user?.email}</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Working schedule ── */}
      {(profile.workingDays?.length > 0 || profile.activeFrom) && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <p className="font-medium text-brand-text text-sm mb-1">Working Schedule</p>
            {profile.workingDays?.length > 0 && (
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-brand-primary shrink-0" />
                <div className="flex gap-1 flex-wrap">
                  {DAYS.map((d, i) => (
                    <span
                      key={d}
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        profile.workingDays.includes(i)
                          ? "bg-brand-primary text-white"
                          : "bg-brand-surface text-brand-textMuted"
                      }`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(profile.activeFrom || profile.activeTo) && (
              <div className="flex items-center gap-2 text-sm text-brand-textMuted">
                <Clock size={14} className="text-brand-primary shrink-0" />
                <span>
                  {profile.activeFrom ?? "—"} – {profile.activeTo ?? "—"}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Agent verification ── */}
      {profile.verifiedByAgent && (
        <Card>
          <CardContent className="py-4">
            <p className="font-medium text-brand-text text-sm mb-2">Verified By</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-success/10 flex items-center justify-center shrink-0">
                <ShieldCheck size={16} className="text-brand-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-text">
                  {profile.verifiedByAgent.user.name ?? "Agent"}
                </p>
                <p className="text-xs text-brand-textMuted">{profile.verifiedByAgent.user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Services & pricing ── */}
      {Object.keys(groupedServices).length > 0 && (
        <div>
          <p className="text-sm font-semibold text-brand-text mb-3">My Services</p>
          <div className="space-y-3">
            {Object.entries(groupedServices).map(([cat, rows]) => (
              <Card key={cat}>
                <CardContent className="py-4">
                  <p className="font-medium text-brand-text text-sm mb-2 flex items-center gap-1.5">
                    <Star size={13} className="text-brand-primary" /> {cat}
                  </p>
                  <div className="divide-y divide-brand-border/40">
                    {rows.map((row) => {
                      const base = Number(row.baseServiceCharge);
                      const disc = Number(row.discountPercent);
                      const final = base * (1 - disc / 100);
                      return (
                        <div key={row.subcategoryId} className="py-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-brand-success shrink-0" />
                            <span className="text-sm text-brand-text">{row.subcategoryName}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-semibold text-brand-text">₹{final.toFixed(0)}</span>
                            {disc > 0 && (
                              <span className="text-[10px] text-brand-textMuted ml-1 line-through">₹{base.toFixed(0)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-brand-textMuted pb-4">
        Member since {new Date(profile.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  );
}
