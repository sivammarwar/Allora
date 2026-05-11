"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { MapPin, Loader2, TrendingUp, Star, Grid2X2, ChevronRight, Navigation } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  detectLocation,
  getStoredLocation,
  type UserLocation,
} from "@/lib/location";
import { ViralGrid, type ViralSubcategory } from "@/components/shared/ViralGrid";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  displayPrice: number;
  isActive: boolean;
}

interface Subcategory {
  id: string;
  name: string;
  imageUrl: string | null;
  pageContent: unknown | null;
  isActive: boolean;
  products: Product[];
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
  const [loc, setLoc] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredLocation();
    if (stored) {
      setLoc(stored);
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
      setLoc(v);
    } catch (e) {
      setLocError("Couldn't detect your location. Please allow location access.");
    } finally {
      setLocating(false);
    }
  }

  // Fetch viral subcategories (no location required)
  const { data: viralData, isLoading: viralLoading } = useQuery<ViralSubcategory[]>({
    queryKey: ["user", "viral-subcategories"],
    queryFn: () => api.get("/api/user/viral-subcategories"),
  });

  // Resolve nearest agent for the user's location (needed for viral links)
  const { data: avgRatings = {} } = useQuery<Record<string, { avg: number; count: number }>>(
    {
      queryKey: ["category-avg-ratings"],
      queryFn: () => api.get("/api/user/categories/avg-ratings"),
    }
  );

  const { data: agentData } = useQuery<{ agentId: string | null }>({
    queryKey: ["user", "my-agent", loc?.lat, loc?.lng],
    queryFn: () => api.get(`/api/user/my-agent?lat=${loc!.lat}&lng=${loc!.lng}`),
    enabled: !!loc,
  });
  const agentId = agentData?.agentId ?? null;

  // Fetch browse data (services and products with nested subcategories)
  const { data: browseData, isLoading: browseLoading } = useQuery<BrowseResponse>({
    queryKey: ["user", "browse", loc?.lat, loc?.lng],
    queryFn: () =>
      api.get(`/api/user/browse?lat=${loc!.lat}&lng=${loc!.lng}`),
    enabled: !!loc,
  });

  const handleViralClick = (item: ViralSubcategory) => {
    const url = `/dashboard/subcategory/${item.id}${agentId ? `?agentId=${agentId}` : ``}`;
    router.push(url);
  };

  if (!loc) {
    return (
      <div className="page-enter max-w-md mx-auto pt-8">
        <div className="rounded-2xl border border-brand-border bg-white p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-brand-primary/10 flex items-center justify-center mx-auto">
            <Navigation className="text-brand-primary" size={26} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Where are you located?</h1>
            <p className="text-sm text-brand-textMuted mt-1">
              We use your location to show local services and partners near you.
            </p>
          </div>
          {locError && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{locError}</p>
          )}
          <Button onClick={requestLocation} loading={locating} className="w-full">
            <MapPin size={15} />
            Detect my location
          </Button>
        </div>
      </div>
    );
  }

  const isLoading = browseLoading || viralLoading;

  return (
    <div className="page-enter space-y-0">

      {/* ── Location bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-xs text-brand-textMuted pb-6">
        <MapPin size={12} className="text-brand-primary shrink-0" />
        <span>Showing services near</span>
        <span className="font-semibold text-brand-text">
          {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
        </span>
        <button
          onClick={requestLocation}
          className="ml-1 text-brand-primary underline underline-offset-2 hover:no-underline"
        >
          change
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-brand-primary" size={28} />
        </div>
      ) : (
        <div className="space-y-12">

          {/* ─── Section 1: MOST USED ──────────────────────────────────── */}
          <section>
            <div className="flex items-end justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <TrendingUp size={18} className="text-brand-primary" />
                  <span className="text-xs font-semibold text-brand-primary uppercase tracking-widest">Trending</span>
                </div>
                <h2 className="text-3xl font-extrabold text-black tracking-tight leading-none">Most Used</h2>
              </div>
            </div>

            {viralData && viralData.length > 0 ? (
              <ViralGrid items={viralData} onItemClick={handleViralClick} />
            ) : (
              <div className="rounded-xl border border-dashed border-brand-border py-10 text-center text-sm text-brand-textMuted">
                No trending services yet. Check back soon!
              </div>
            )}
          </section>

          {/* ─── Section 2: SERVICES ────────────────────────────────────── */}
          <section>
            <div className="flex items-end justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Grid2X2 size={16} className="text-brand-primary" />
                  <span className="text-xs font-semibold text-brand-primary uppercase tracking-widest">Browse</span>
                </div>
                <h2 className="text-3xl font-extrabold text-black tracking-tight leading-none">Services</h2>
              </div>
              {browseData?.services && browseData.services.length > 0 && (
                <span className="text-xs text-brand-textMuted">{browseData.services.length} categories</span>
              )}
            </div>

            {browseData?.services && browseData.services.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {browseData.services.map((cat) => {
                  const rating = avgRatings[cat.id];
                  return (
                    <Link key={cat.id} href={`/dashboard/category/${cat.id}`}>
                      <div className="group relative overflow-hidden rounded-2xl bg-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200">
                        {/* Image */}
                        <div className="relative h-48 overflow-hidden">
                          {cat.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={cat.imageUrl}
                              alt={cat.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 flex items-center justify-center">
                              <CategoryIcon name={cat.imageUrl} size={52} className="text-brand-primary/40" />
                            </div>
                          )}
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                          {/* Rating badge */}
                          {rating && (
                            <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                              <Star size={10} className="fill-amber-400 text-amber-400" />
                              <span>{rating.avg.toFixed(1)}</span>
                              <span className="text-white/50 font-normal">({rating.count})</span>
                            </div>
                          )}

                          {/* Arrow */}
                          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight size={14} className="text-white" />
                          </div>

                          {/* Name + sub count */}
                          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8">
                            <h3 className="text-white font-bold text-lg leading-snug">{cat.name}</h3>
                            <p className="text-white/60 text-xs mt-0.5">
                              {cat.subcategories.length} service{cat.subcategories.length !== 1 ? "s" : ""} available
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-brand-border py-10 text-center text-sm text-brand-textMuted">
                No services available in your area yet.
              </div>
            )}
          </section>

        </div>
      )}
    </div>
  );
}
