"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Search, Loader2, FileCode2, ArrowRight, Package } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

interface PricingRow {
  id: string;
  subcategoryId: string;
  serviceCharge: string;
  deliveryCharge2km: string;
  deliveryCharge5km: string;
  deliveryCharge7km: string;
  deliveryCharge10km: string;
  subcategory: { id: string; name: string; category: { name: string; type: "PRODUCT" | "SERVICE" } };
}

interface SubcategoryMeta {
  id: string;
  name: string;
  category: { name: string; type: "PRODUCT" | "SERVICE" };
}

interface PricingResponse {
  heroId: string;
  subcategoryIds: string[];
  requiresDelivery: boolean;
  pricing: PricingRow[];
  subcategories: SubcategoryMeta[];
}

interface HeroProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  mrp: number;
  sellingPrice: number;
  specifications: any;
  returnable: boolean;
  returnablePeriod: number | null;
  replaceable: boolean;
  replaceablePeriod: number | null;
  isAvailable: boolean;
  category: {
    id: string;
    name: string;
    type: "PRODUCT" | "SERVICE";
  };
}

export default function HeroStorePage() {
  const qc = useQueryClient();
  const router = useRouter();

  const { data: pricingData, isLoading: loadingP } = useQuery<PricingResponse>({
    queryKey: ["hero", "pricing"],
    queryFn: () => api.get("/api/hero/pricing"),
  });

  const { data: myProducts = [], isLoading: loadingMP } = useQuery<HeroProduct[]>({
    queryKey: ["hero", "my-products"],
    queryFn: () => api.get("/api/hero/my-products"),
  });

  const { data: heroProfile } = useQuery({
    queryKey: ["hero", "profile"],
    queryFn: () => api.get("/api/hero/me"),
  });

  // Store page builder state
  const [pageOpen, setPageOpen] = useState(false);
  const [pageHtml, setPageHtml] = useState("");
  const [pageAssets, setPageAssets] = useState<File[]>([]);
  const [pageSaving, setPageSaving] = useState(false);

  useEffect(() => {
    if ((heroProfile as any)?.profile?.storePageContent?.html) {
      setPageHtml((heroProfile as any).profile.storePageContent.html);
    }
  }, [heroProfile]);

  const requiresDelivery = pricingData?.requiresDelivery ?? false;
  const subMap = new Map((pricingData?.subcategories ?? []).map((s) => [s.id, s]));
  const hasProductSubs = (pricingData?.subcategories ?? []).some(
    (s) => s.category.type === "PRODUCT"
  );

  async function savePage() {
    setPageSaving(true);
    try {
      const fd = new FormData();
      fd.append("html", pageHtml);
      pageAssets.forEach((f) => fd.append("assets", f));
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/hero/store-page`,
        { method: "POST", body: fd, credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new ApiError(
          (data as any)?.error ?? "Save failed",
          res.status,
          data
        );
      }
      qc.invalidateQueries({ queryKey: ["hero", "profile"] });
      toast.success("Store page saved");
      setPageOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setPageSaving(false);
    }
  }

  return (
    <div className="page-enter space-y-8">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">My store</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Set your service pricing, pick the products you'll offer, and customize your store page.
        </p>
      </div>

      {/* Store Page Builder */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl text-brand-text">Store page</h2>
          <Button variant="outline" size="sm" onClick={() => setPageOpen(true)}>
            <FileCode2 size={14} />
            Edit page
          </Button>
        </div>
        <Card>
          <CardContent className="py-6 text-sm text-brand-textMuted">
            {(heroProfile as any)?.profile?.storePageContent?.html ? (
              <span className="text-brand-success">Custom store page configured</span>
            ) : (
              <span>No custom store page yet. Click "Edit page" to create one.</span>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Pricing */}
      <section className="space-y-3">
        <h2 className="font-heading text-xl text-brand-text">Pricing</h2>
        {loadingP ? (
          <Loader2 className="animate-spin text-brand-primary" />
        ) : pricingData?.subcategoryIds.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-brand-textMuted">
              No subcategories assigned yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pricingData?.subcategoryIds.map((subId) => {
              const existing = pricingData.pricing.find(
                (p) => p.subcategoryId === subId
              );
              const meta = subMap.get(subId);
              return (
                <PricingEditor
                  key={subId}
                  subcategoryId={subId}
                  subcategoryName={meta?.name ?? existing?.subcategory.name ?? subId}
                  categoryType={meta?.category.type ?? existing?.subcategory.category.type ?? "SERVICE"}
                  requiresDelivery={requiresDelivery}
                  initial={existing}
                  onSaved={() =>
                    qc.invalidateQueries({ queryKey: ["hero", "pricing"] })
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      {/* My Products — only for heroes with PRODUCT-type subcategories */}
      {hasProductSubs && <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl text-brand-text">My products</h2>
          <Button variant="outline" size="sm" onClick={() => router.push("/hero/products")}>
            <Package size={14} />
            Manage products
          </Button>
        </div>
        <Card>
          <CardContent className="py-6">
            {loadingMP ? (
              <Loader2 className="animate-spin text-brand-primary" />
            ) : myProducts.length === 0 ? (
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-bg text-brand-textMuted">
                  <Package size={24} />
                </div>
                <p className="text-sm text-brand-textMuted">
                  No products in your store yet.
                </p>
                <Button variant="outline" size="sm" onClick={() => router.push("/hero/products")}>
                  Add your first product
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myProducts.map((product) => {
                  const discount = product.mrp > 0 ? Math.round(((product.mrp - Number(product.sellingPrice)) / product.mrp) * 100) : 0;
                  return (
                    <Card key={product.id} className="overflow-hidden">
                      <div className="aspect-video bg-brand-bg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <h3 className="font-medium text-brand-text">{product.name}</h3>
                        <p className="text-xs text-brand-textMuted">{product.category.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-brand-primary">
                            ₹{Number(product.sellingPrice)}
                          </span>
                          {discount > 0 && (
                            <>
                              <span className="text-sm text-brand-textMuted line-through">
                                ₹{product.mrp}
                              </span>
                              <span className="text-xs bg-brand-success/10 text-brand-success px-2 py-0.5 rounded-sm">
                                {discount}% off
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-sm ${product.isAvailable ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-bg text-brand-textMuted'}`}>
                            {product.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                          {(product.returnable || product.replaceable) && (
                            <span className="text-xs text-brand-textMuted">
                              {product.returnable && 'Returnable'}
                              {product.returnable && product.replaceable && ' · '}
                              {product.replaceable && 'Replaceable'}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>}

      {/* Store Page Builder Dialog */}
      <Dialog
        open={pageOpen}
        onClose={() => setPageOpen(false)}
        title="Custom Store Page"
        description="Create a custom page for your store. This will be shown to users when they view your services."
        size="xl"
      >
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              HTML content
            </label>
            <textarea
              value={pageHtml}
              onChange={(e) => setPageHtml(e.target.value)}
              rows={14}
              spellCheck={false}
              placeholder="<section>...</section>"
              className="w-full p-3 rounded-sm bg-brand-bg border border-brand-border text-sm font-mono text-brand-text focus:outline-none focus:border-brand-primary"
            />
            <p className="mt-1 text-xs text-brand-textMuted">
              Max 200KB. Will be rendered server-side on the user-facing store page.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Asset images (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPageAssets(Array.from(e.target.files ?? []))}
              className="block w-full text-sm text-brand-text file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border file:border-brand-border file:bg-brand-bg file:text-brand-text"
            />
            {pageAssets.length > 0 && (
              <p className="mt-1 text-xs text-brand-textMuted">
                {pageAssets.length} file(s) selected
              </p>
            )}
            {(heroProfile as any)?.profile?.storePageContent?.assets &&
              (heroProfile as any).profile.storePageContent.assets.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-brand-textMuted mb-2">Existing assets:</p>
                  <div className="flex flex-wrap gap-2">
                    {(heroProfile as any).profile.storePageContent.assets.map((a: any) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={a.url}
                        src={a.url}
                        alt={a.name}
                        className="h-16 w-16 object-cover rounded-sm border border-brand-border"
                      />
                    ))}
                  </div>
                </div>
              )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setPageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePage} loading={pageSaving}>
              Save page
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function PricingEditor({
  subcategoryId,
  subcategoryName,
  categoryType,
  requiresDelivery,
  initial,
  onSaved,
}: {
  subcategoryId: string;
  subcategoryName: string;
  categoryType: "PRODUCT" | "SERVICE";
  requiresDelivery: boolean;
  initial?: PricingRow;
  onSaved: () => void;
}) {
  const [serviceCharge, setServiceCharge] = useState(
    Number(initial?.serviceCharge ?? 0)
  );
  const [d2, setD2] = useState(Number(initial?.deliveryCharge2km ?? 0));
  const [d5, setD5] = useState(Number(initial?.deliveryCharge5km ?? 0));
  const [d7, setD7] = useState(Number(initial?.deliveryCharge7km ?? 0));
  const [d10, setD10] = useState(Number(initial?.deliveryCharge10km ?? 0));

  useEffect(() => {
    if (!initial) return;
    setServiceCharge(Number(initial.serviceCharge));
    setD2(Number(initial.deliveryCharge2km));
    setD5(Number(initial.deliveryCharge5km));
    setD7(Number(initial.deliveryCharge7km));
    setD10(Number(initial.deliveryCharge10km));
  }, [initial]);

  const save = useMutation({
    mutationFn: () =>
      api.put("/api/hero/pricing", {
        subcategoryId,
        serviceCharge,
        deliveryCharge2km: d2,
        deliveryCharge5km: d5,
        deliveryCharge7km: d7,
        deliveryCharge10km: d10,
      }),
    onSuccess: () => {
      toast.success("Pricing saved");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <Card>
      <CardContent className="space-y-3">
        <div>
          <h3 className="font-heading text-base text-brand-text">{subcategoryName}</h3>
          <p className="text-xs text-brand-textMuted">{categoryType}</p>
        </div>
        <Input
          label={categoryType === "SERVICE" ? "Service charge (₹)" : "Item base markup (₹)"}
          type="number"
          min={0}
          step={0.01}
          value={serviceCharge}
          onChange={(e) => setServiceCharge(Math.max(0, Number(e.target.value) || 0))}
        />
        {requiresDelivery && (
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="≤ 2 km"
              type="number"
              min={0}
              value={d2}
              onChange={(e) => setD2(Math.max(0, Number(e.target.value) || 0))}
            />
            <Input
              label="≤ 5 km"
              type="number"
              min={0}
              value={d5}
              onChange={(e) => setD5(Math.max(0, Number(e.target.value) || 0))}
            />
            <Input
              label="≤ 7 km"
              type="number"
              min={0}
              value={d7}
              onChange={(e) => setD7(Math.max(0, Number(e.target.value) || 0))}
            />
            <Input
              label="≤ 10 km"
              type="number"
              min={0}
              value={d10}
              onChange={(e) => setD10(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        )}
        <div className="flex justify-end">
          <Button size="sm" onClick={() => save.mutate()} loading={save.isPending}>
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
