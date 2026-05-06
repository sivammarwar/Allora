"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { getStoredLocation, type UserLocation } from "@/lib/location";

interface Pricing {
  serviceCharge: string;
  deliveryCharge2km: string;
  deliveryCharge5km: string;
  deliveryCharge7km: string;
  deliveryCharge10km: string;
}

interface HeroOption {
  id: string;
  serviceName: string;
  shopName: string | null;
  requiresDelivery: boolean;
  profileImageUrl: string | null;
  distanceKm: number;
  pricing: Pricing;
}

interface SubcategoryDetail {
  subcategory: {
    id: string;
    name: string;
    pageContent: { html?: string; assets?: Array<{ name: string; url: string }> } | null;
    category: { id: string; name: string; type: "PRODUCT" | "SERVICE" };
  };
  hero: {
    id: string;
    serviceName: string;
    shopName: string | null;
    requiresDelivery: boolean;
    profileImageUrl: string | null;
    storePageContent?: { html?: string; assets?: Array<{ name: string; url: string }> } | null;
  } | null;
  pricing: Pricing | null;
  heroes?: HeroOption[];
  products?: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    description: string | null;
    displayPrice: string;
  }>;
}

export default function UserSubcategoryPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const add = useCart((s) => s.add);

  const [loc, setLoc] = useState<UserLocation | null>(null);
  useEffect(() => setLoc(getStoredLocation()), []);

  const { data, isLoading } = useQuery<SubcategoryDetail>({
    queryKey: ["user", "subcategory", id, loc?.lat, loc?.lng],
    queryFn: () =>
      api.get(`/api/user/subcategories/${id}?lat=${loc!.lat}&lng=${loc!.lng}`),
    enabled: !!loc,
  });

  if (!loc) {
    return <Card><CardContent className="py-10 text-center text-sm">Set location first.</CardContent></Card>;
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-brand-primary" />
      </div>
    );
  }

  const isService = data.subcategory.category.type === "SERVICE";
  const heroLabel =
    data.hero?.shopName ?? data.hero?.serviceName ?? "—";

  if (!data.hero) {
    return (
      <div className="page-enter space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={14} />
          Back
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-sm text-brand-textMuted">
            No verified providers available for this in your area yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft size={14} />
        Back
      </Button>

      <div className="flex items-center gap-3">
        <h1 className="font-heading text-3xl text-brand-text">{data.subcategory.name}</h1>
        <span className="text-[11px] font-mono uppercase tracking-widest text-brand-primary px-2 py-0.5 rounded-sm border border-brand-border">
          {data.subcategory.category.type}
        </span>
      </div>
      <p className="text-sm text-brand-textMuted">By {heroLabel}</p>

      {isService ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4">
              {data.hero?.storePageContent?.html ? (
                <div
                  className="prose-invert max-w-none text-brand-text [&_*]:!leading-relaxed"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: data.hero.storePageContent.html }}
                />
              ) : data.subcategory.pageContent?.html ? (
                <div
                  className="prose-invert max-w-none text-brand-text [&_*]:!leading-relaxed"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: data.subcategory.pageContent.html }}
                />
              ) : (
                <p className="text-sm text-brand-textMuted">
                  Service details coming soon.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl text-brand-text">Available providers</h2>
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-textMuted">
              Sorted by price
            </span>
          </div>

          <div className="space-y-3">
            {(data.heroes ?? []).map((h, idx) => {
              const label = h.shopName ?? h.serviceName;
              return (
                <Card key={h.id}>
                  <CardContent className="flex items-center gap-4 flex-wrap">
                    {h.profileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={h.profileImageUrl}
                        alt=""
                        className="h-14 w-14 rounded-full object-cover border border-brand-border"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-brand-bg border border-brand-border" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-brand-text truncate">{label}</h3>
                        {idx === 0 && (
                          <span className="text-[9px] font-mono uppercase tracking-widest text-brand-primary px-1.5 py-0.5 rounded-sm border border-brand-primary">
                            Best price
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-brand-textMuted">
                        {h.distanceKm} km away
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-mono text-brand-primary">
                        Service charge
                      </p>
                      <p className="font-mono text-xl text-brand-text">
                        {formatINR(Number(h.pricing.serviceCharge))}
                      </p>
                    </div>
                    {Number(h.pricing.deliveryCharge5km) > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-mono text-brand-primary">
                          Transport (~5km)
                        </p>
                        <p className="font-mono text-base text-brand-text">
                          {formatINR(Number(h.pricing.deliveryCharge5km))}
                        </p>
                      </div>
                    )}
                    <Button
                      onClick={() => {
                        add({
                          heroId: h.id,
                          heroLabel: label,
                          productId: null,
                          subcategoryId: data.subcategory.id,
                          name: data.subcategory.name,
                          imageUrl: h.profileImageUrl,
                          unitPrice: Number(h.pricing.serviceCharge),
                          deliveryCharge: Number(h.pricing.deliveryCharge5km ?? 0),
                          quantity: 1,
                          type: "SERVICE",
                        });
                        toast.success(`Added ${label} to cart`);
                      }}
                    >
                      Book
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            {(data.heroes ?? []).length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-sm text-brand-textMuted">
                  No providers available yet.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data.products ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-brand-textMuted">
                {heroLabel} hasn't added any products yet.
              </CardContent>
            </Card>
          ) : (
            data.products!.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="w-full aspect-[4/3] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-brand-bg" />
                )}
                <CardContent className="space-y-2">
                  <h3 className="font-medium text-brand-text truncate">{p.name}</h3>
                  {p.description && (
                    <p className="text-xs text-brand-textMuted line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg text-brand-primary">
                      {formatINR(Number(p.displayPrice))}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!data.hero) return;
                        add({
                          heroId: data.hero.id,
                          heroLabel,
                          productId: p.id,
                          subcategoryId: null,
                          name: p.name,
                          imageUrl: p.imageUrl,
                          unitPrice: Number(p.displayPrice),
                          deliveryCharge: Number(
                            data.pricing?.deliveryCharge5km ?? 0
                          ),
                          quantity: 1,
                          type: "PRODUCT",
                        });
                        toast.success("Added to cart");
                      }}
                    >
                      <Plus size={14} />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
