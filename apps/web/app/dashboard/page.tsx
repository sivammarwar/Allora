"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { MapPin, TrendingUp, Star, Grid2X2, ChevronRight, Navigation, ChevronDown, Sparkles, Phone, MessageCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  detectLocation,
  getStoredLocation,
  setStoredLocation,
  reverseGeocode,
  type UserLocation,
} from "@/lib/location";
import { BentoGrid, BentoGridSkeleton, type BentoItem } from "@/components/shared/BentoGrid";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { LocationPickerModal } from "@/components/shared/LocationPickerModal";
import { useCurrentUser } from "@/lib/auth";
import { useT, useLanguage } from "@/lib/i18n";

// ─── Types ─────────────────────────────────────────────────────────────────

interface SubcategoryPricing {
  baseServiceCharge: number;
  discountPercent: number;
  transportChargePerKm: number | null;
}

interface ViralRaw {
  id: string;
  name: string;
  imageUrl: string | null;
  viralImageUrl?: string | null;
  viralPosition: number | null;
  category: { id: string; name: string; type: "PRODUCT" | "SERVICE"; imageUrl: string | null };
  pricing: SubcategoryPricing | null;
}

interface NewlyAddedRaw {
  id: string;
  name: string;
  imageUrl: string | null;
  viralImageUrl?: string | null;
  newlyAddedPosition: number | null;
  category: { id: string; name: string; type: "PRODUCT" | "SERVICE"; imageUrl: string | null };
  pricing: SubcategoryPricing | null;
}

interface MostRatedItem {
  id: string;
  name: string;
  imageUrl: string | null;
  categoryName: string;
  categoryType: "PRODUCT" | "SERVICE";
  avgRating: number;
  ratingCount: number;
}

interface Subcategory {
  id: string;
  name: string;
  imageUrl: string | null;
  isActive: boolean;
  products: { id: string }[];
  productCount: number;
}

interface Category {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
  imageUrl: string | null;
  isActive: boolean;
  subcategories: Subcategory[];
  hasProducts?: boolean;
}

interface BrowseResponse {
  services: Category[];
  products: Category[];
}

// ─── Main Dashboard Component ───────────────────────────────────────────────

export default function UserDashboardPage() {
  const router = useRouter();
  const t = useT();
  const { lang } = useLanguage();
  const { data: currentUser } = useCurrentUser();
  const [loc, setLoc] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const stored = getStoredLocation();
    if (stored) {
      setLoc(stored);
      if (!stored.name) {
        reverseGeocode(stored.lat, stored.lng).then((name) => {
          const updated = { ...stored, name };
          setStoredLocation(updated);
          setLoc(updated);
        });
      }
    } else {
      requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestLocation() {
    setLocating(true);
    setLocError(null);
    try {
      const v = await detectLocation();
      const name = await reverseGeocode(v.lat, v.lng);
      const withName = { ...v, name };
      setStoredLocation(withName);
      setLoc(withName);
    } catch {
      setLocError("Couldn't detect your location. Please allow location access.");
    } finally {
      setLocating(false);
    }
  }

  // Fetch sections
  const { data: viralRaw = [], isLoading: viralLoading } = useQuery<ViralRaw[]>({
    queryKey: ["user", "viral-subcategories"],
    queryFn: () => api.get("/api/user/viral-subcategories"),
  });

  const { data: newlyAddedRaw = [], isLoading: newlyLoading } = useQuery<NewlyAddedRaw[]>({
    queryKey: ["user", "newly-added-subcategories"],
    queryFn: () => api.get("/api/user/newly-added-subcategories"),
  });

  const { data: mostRated = [], isLoading: mostRatedLoading } = useQuery<MostRatedItem[]>({
    queryKey: ["user", "most-rated-subcategories"],
    queryFn: () => api.get("/api/user/most-rated-subcategories"),
  });

  const { data: avgRatings = {} } = useQuery<Record<string, { avg: number; count: number }>>(
    {
      queryKey: ["category-avg-ratings"],
      queryFn: () => api.get("/api/user/categories/avg-ratings"),
    }
  );

  // Map raw viral/newly-added to BentoItem
  const viralBento: BentoItem[] = viralRaw.map((s) => ({
    id: s.id,
    name: s.name,
    nameHi: (s as any).nameHi ?? null,
    imageUrl: s.imageUrl,
    viralImageUrl: s.viralImageUrl,
    position: s.viralPosition ?? 0,
    categoryName: s.category.name,
    categoryType: s.category.type,
    pricing: s.pricing,
  }));

  const newlyBento: BentoItem[] = newlyAddedRaw.map((s) => ({
    id: s.id,
    name: s.name,
    nameHi: (s as any).nameHi ?? null,
    imageUrl: s.imageUrl,
    viralImageUrl: s.viralImageUrl,
    position: s.newlyAddedPosition ?? 0,
    categoryName: s.category.name,
    categoryType: s.category.type,
    pricing: s.pricing,
  }));

  const { data: agentData } = useQuery<{ agentId: string | null; supportPhone?: string | null; supportWhatsapp?: string | null }>({
    queryKey: ["user", "my-agent", loc?.lat, loc?.lng],
    queryFn: () => api.get(`/api/user/my-agent?lat=${loc!.lat}&lng=${loc!.lng}`),
    enabled: !!loc,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const agentId = agentData?.agentId ?? null;

  // Fetch browse data (services and products with nested subcategories)
  const { data: browseData, isLoading: browseLoading } = useQuery<BrowseResponse>({
    queryKey: ["user", "browse", loc?.lat, loc?.lng],
    queryFn: () =>
      api.get(`/api/user/browse?lat=${loc!.lat}&lng=${loc!.lng}`),
    enabled: !!loc,
  });

  const handleBentoClick = (item: BentoItem) => {
    const url = `/dashboard/subcategory/${item.id}${agentId ? `?agentId=${agentId}` : ``}`;
    router.push(url);
  };

  // Prefetch subcategory pages for visible items
  useEffect(() => {
    if (viralRaw.length > 0) {
      viralRaw.slice(0, 4).forEach((s) => {
        router.prefetch(`/dashboard/subcategory/${s.id}`);
      });
    }
  }, [viralRaw, router]);

  return (
    <div className="page-enter space-y-0">

      {/* ── Location bar ─────────────────────────────────────────────── */}
      {loc ? (
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-2 mb-6 group w-fit"
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-primary/8 border border-brand-primary/20 hover:border-brand-primary/40 transition-colors">
            <MapPin size={12} className="text-brand-primary shrink-0" />
            <span className="text-xs font-semibold text-brand-text max-w-[200px] truncate">
              {loc.name ?? `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}`}
            </span>
            <ChevronDown size={11} className="text-brand-primary" />
          </div>
        </button>
      ) : (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-primary/8 border border-brand-primary/20">
          <Navigation size={14} className="text-brand-primary shrink-0" />
          <p className="text-xs text-brand-text font-medium flex-1">{t("home.shareLocation")}</p>
          <Button size="sm" onClick={requestLocation} loading={locating} className="text-xs h-7 px-3">
            {locError ? t("home.retry") : t("home.detect")}
          </Button>
        </div>
      )}

      {pickerOpen && (
        <LocationPickerModal
          initialLoc={loc}
          onConfirm={(newLoc) => {
            setStoredLocation(newLoc);
            setLoc(newLoc);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* ── Regional Support Banner ──────────────────────────────────── */}
      {agentData?.supportPhone && (
        <div className="mb-6 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3.5">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-0.5">
            🛟 {t("home.supportTitle")}
          </p>
          <p className="text-sm text-orange-800 mb-3">
            {t("home.supportDesc")}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={`tel:${agentData.supportPhone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors"
            >
              <Phone size={13} />
              {t("home.supportCall")} · {agentData.supportPhone}
            </a>
            {agentData.supportWhatsapp && (
              <a
                href={agentData.supportWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors"
              >
                <MessageCircle size={13} />
                {t("home.supportWhatsapp")}
              </a>
            )}
          </div>
        </div>
      )}

      <div className="space-y-0">

          {/* ─── Section 1: MOST USED ────────────────────────────────── */}
          <section className="pb-10">
            <div className="flex items-end justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <TrendingUp size={16} className="text-brand-primary" />
                  <span className="text-[10px] font-sans font-semibold text-brand-primary uppercase tracking-widest">{t("home.trending")}</span>
                </div>
                <h2 className="text-3xl font-extrabold text-black tracking-tight leading-none">{t("home.mostUsed")}</h2>
              </div>
            </div>
            {viralLoading ? (
              <BentoGridSkeleton />
            ) : viralBento.length > 0 ? (
              <div className="section-reveal">
                <BentoGrid items={viralBento} onItemClick={handleBentoClick} />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-brand-border py-10 text-center text-sm text-brand-textMuted">
                {t("home.noFeatured")}
              </div>
            )}
          </section>

          {/* ── Section divider ── */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-gradient-to-r from-gray-200 via-gray-200 to-transparent" />
            <span className="flex gap-1">
              <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
              <span className="w-1 h-1 rounded-full bg-gray-200 inline-block" />
              <span className="w-1 h-1 rounded-full bg-gray-100 inline-block" />
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-gray-200 via-gray-200 to-transparent" />
          </div>

          {/* ─── Section 2: BROWSE SERVICES ──────────────────────────── */}
          <section className="pt-8 pb-10">
            <div className="flex items-end justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Grid2X2 size={16} className="text-brand-primary" />
                  <span className="text-[10px] font-sans font-semibold text-brand-primary uppercase tracking-widest">{t("home.browse")}</span>
                </div>
                <h2 className="text-3xl font-extrabold text-black tracking-tight leading-none">{t("home.services")}</h2>
              </div>
              {browseData?.services && browseData.services.length > 0 && (
                <span className="text-xs text-brand-textMuted">{browseData.services.length} {t("home.categories")}</span>
              )}
            </div>
            {browseLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
              </div>
            ) : browseData?.services && browseData.services.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 section-reveal stagger-children">
                {browseData.services.map((cat) => {
                  const rating = avgRatings[cat.id];
                  return (
                    <Link key={cat.id} href={`/dashboard/category/${cat.id}`}>
                      <div className="group relative overflow-hidden rounded-2xl bg-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="relative h-48 overflow-hidden">
                          {cat.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 flex items-center justify-center">
                              <CategoryIcon name={cat.imageUrl} size={52} className="text-brand-primary/40" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          {rating && (
                            <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                              <Star size={10} className="fill-amber-400 text-amber-400" />
                              <span>{rating.avg.toFixed(1)}</span>
                              <span className="text-white/50 font-normal">({rating.count})</span>
                            </div>
                          )}
                          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight size={14} className="text-white" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8">
                            <h3 className="text-white font-bold text-lg leading-snug">{lang === "hi" && (cat as any).nameHi ? (cat as any).nameHi : cat.name}</h3>
                            <p className="text-white/60 text-xs mt-0.5">{cat.subcategories.length} {t("home.servicesAvailable")}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-brand-border py-10 text-center text-sm text-brand-textMuted">
                {t("home.noServices")}
              </div>
            )}
          </section>

          {/* ─── Section 3: NEWLY ADDED ──────────────────────────────── */}
          {newlyBento.length > 0 && (
            <>
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-gradient-to-r from-gray-200 via-gray-200 to-transparent" />
                <span className="flex gap-1">
                  <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
                  <span className="w-1 h-1 rounded-full bg-gray-200 inline-block" />
                  <span className="w-1 h-1 rounded-full bg-gray-100 inline-block" />
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-gray-200 via-gray-200 to-transparent" />
              </div>
              <section className="pt-8 pb-10">
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Sparkles size={16} className="text-brand-primary" />
                      <span className="text-[10px] font-sans font-semibold text-brand-primary uppercase tracking-widest">{t("home.fresh")}</span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-black tracking-tight leading-none">{t("home.newlyAdded")}</h2>
                  </div>
                </div>
                {newlyLoading ? (
                  <BentoGridSkeleton />
                ) : (
                  <div className="section-reveal">
                    <BentoGrid items={newlyBento} onItemClick={handleBentoClick} />
                  </div>
                )}
              </section>
            </>
          )}

          {/* ─── Section 4: MOST RATED ROW ───────────────────────────── */}
          {(mostRatedLoading || mostRated.length > 0) && (
            <>
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-gradient-to-r from-gray-200 via-gray-200 to-transparent" />
                <span className="flex gap-1">
                  <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
                  <span className="w-1 h-1 rounded-full bg-gray-200 inline-block" />
                  <span className="w-1 h-1 rounded-full bg-gray-100 inline-block" />
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-gray-200 via-gray-200 to-transparent" />
              </div>
              <section className="pt-8 pb-4">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Star size={15} className="text-amber-500 fill-amber-400" />
                    <span className="text-[10px] font-sans font-semibold text-brand-primary uppercase tracking-widest">{t("home.topRated")}</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-black tracking-tight leading-none">{t("home.mostRated")}</h2>
                </div>
              </div>
              {mostRatedLoading ? (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="skeleton shrink-0 w-36 sm:w-44 rounded-[14px]" style={{ height: 180 }} />
                  ))}
                </div>
              ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 section-reveal" style={{ scrollSnapType: "x mandatory" }}>
                {mostRated.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/dashboard/subcategory/${sub.id}${agentId ? `?agentId=${agentId}` : ""}`}
                    style={{ scrollSnapAlign: "start" }}
                    className="shrink-0 w-36 sm:w-44"
                  >
                    <div className="group overflow-hidden rounded-[14px] bg-white cursor-pointer">
                      <div className="h-28 sm:h-32 overflow-hidden">
                        {sub.imageUrl && (sub.imageUrl.startsWith("http") || sub.imageUrl.startsWith("/")) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.04]" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-brand-primary/8 to-brand-primary/4 flex items-center justify-center">
                            <CategoryIcon name={sub.imageUrl} size={28} className="text-brand-primary/50" />
                          </div>
                        )}
                      </div>
                      <div className="px-3 py-2.5">
                        <p className="text-[9px] uppercase tracking-widest text-stone-400 font-light truncate">{sub.categoryName}</p>
                        <h4 className="font-cormorant font-semibold text-base text-gray-900 leading-snug line-clamp-2 mt-0.5">{lang === "hi" && (sub as any).nameHi ? (sub as any).nameHi : sub.name}</h4>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Star size={10} className="fill-amber-400 text-amber-400" />
                          <span className="text-[11px] font-semibold text-gray-700">{sub.avgRating.toFixed(1)}</span>
                          <span className="text-[10px] text-gray-400">({sub.ratingCount})</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              )}
              </section>
            </>
          )}

      </div>
    </div>
  );
}
