"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { MapPin, Loader2, Sparkles, Star } from "lucide-react";
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
      <div className="page-enter max-w-xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <MapPin className="mx-auto text-brand-primary" size={28} />
            <h1 className="font-heading text-2xl text-brand-text">
              Where are we delivering today?
            </h1>
            <p className="text-brand-textMuted text-sm">
              We use your location to show local services and partners near you.
            </p>
            {locError && (
              <p className="text-sm text-brand-error">{locError}</p>
            )}
            <Button onClick={requestLocation} loading={locating}>
              Detect my location
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = browseLoading || viralLoading;

  return (
    <div className="page-enter space-y-8">

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-brand-primary" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* ─── Section 1: VIRAL ───────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-brand-primary" size={20} />
              <h2 className="font-heading text-xl text-brand-text">Viral Now</h2>
            </div>
            {viralData && viralData.length > 0 ? (
              <ViralGrid
                items={viralData}
                onItemClick={handleViralClick}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-brand-textMuted text-sm">
                  No viral subcategories pinned yet. Check back soon!
                </CardContent>
              </Card>
            )}
          </section>

          {/* ─── Section 2: SERVICES ────────────────────────────────────── */}
          <section>
            <h2 className="font-heading text-xl text-brand-text mb-4">Services</h2>
            {browseData?.services && browseData.services.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {browseData.services.map((cat) => (
                  <Link key={cat.id} href={`/dashboard/category/${cat.id}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="relative h-40 bg-brand-surface">
                        {cat.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <CategoryIcon name={cat.imageUrl} size={48} className="text-brand-primary" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                          <h3 className="text-white font-semibold text-lg">{cat.name}</h3>
                          <p className="text-white/80 text-sm">{cat.subcategories.length} subcategories</p>
                        </div>
                        {avgRatings[cat.id] && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-full">
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            <span>{avgRatings[cat.id].avg.toFixed(1)}</span>
                            <span className="text-white/60">({avgRatings[cat.id].count})</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-6 text-center text-brand-textMuted text-sm">
                  No services available in your area yet.
                </CardContent>
              </Card>
            )}
          </section>

          {/* Products section hidden */}
        </div>
      )}
    </div>
  );
}
