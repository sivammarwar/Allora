"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, FileText, Save } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeroProfile {
  id: string;
  serviceName: string | null;
  shopName: string | null;
  categoryIds: string[];
  subcategoryIds: string[];
}

interface HeroMeResponse {
  state: string;
  profile: HeroProfile;
}

interface Category {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
}

interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
  category?: Category;
}

interface HeroPricing {
  id: string;
  subcategoryId: string;
  serviceCharge: number;
  deliveryCharge2km: number;
  deliveryCharge5km: number;
  deliveryCharge7km: number;
  deliveryCharge10km: number;
  subcategory: Subcategory;
}

function SubcategoryPricingForm({
  subcategory,
  existingPricing,
  onSave,
  isSaving,
}: {
  subcategory: Subcategory;
  existingPricing?: HeroPricing;
  onSave: (data: {
    subcategoryId: string;
    serviceCharge: number;
    deliveryCharge2km: number;
    deliveryCharge5km: number;
    deliveryCharge7km: number;
    deliveryCharge10km: number;
  }) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState({
    serviceCharge: existingPricing?.serviceCharge || 0,
    deliveryCharge2km: existingPricing?.deliveryCharge2km || 0,
    deliveryCharge5km: existingPricing?.deliveryCharge5km || 0,
    deliveryCharge7km: existingPricing?.deliveryCharge7km || 0,
    deliveryCharge10km: existingPricing?.deliveryCharge10km || 0,
  });

  return (
    <div className="p-4 border border-brand-border rounded-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-brand-text">{subcategory.name}</h3>
        {subcategory.category && (
          <span className="text-xs text-brand-textMuted">{subcategory.category.name}</span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input
          label="Service Charge (₹)"
          type="number"
          step="0.01"
          value={form.serviceCharge}
          onChange={(e) => setForm({ ...form, serviceCharge: Number(e.target.value) })}
        />
        <Input
          label="Delivery Charge (2km) (₹)"
          type="number"
          step="0.01"
          value={form.deliveryCharge2km}
          onChange={(e) => setForm({ ...form, deliveryCharge2km: Number(e.target.value) })}
        />
        <Input
          label="Delivery Charge (5km) (₹)"
          type="number"
          step="0.01"
          value={form.deliveryCharge5km}
          onChange={(e) => setForm({ ...form, deliveryCharge5km: Number(e.target.value) })}
        />
        <Input
          label="Delivery Charge (7km) (₹)"
          type="number"
          step="0.01"
          value={form.deliveryCharge7km}
          onChange={(e) => setForm({ ...form, deliveryCharge7km: Number(e.target.value) })}
        />
        <Input
          label="Delivery Charge (10km) (₹)"
          type="number"
          step="0.01"
          value={form.deliveryCharge10km}
          onChange={(e) => setForm({ ...form, deliveryCharge10km: Number(e.target.value) })}
        />
      </div>
      <Button
        size="sm"
        onClick={() => onSave({ subcategoryId: subcategory.id, ...form })}
        loading={isSaving}
      >
        <Save size={14} className="mr-2" />
        Save Pricing
      </Button>
    </div>
  );
}

export default function HeroServicesPage() {
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery<HeroMeResponse>({
    queryKey: ["hero", "me"],
    queryFn: () => api.get("/api/hero/me"),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["public", "categories"],
    queryFn: () => api.get<Category[]>("/api/user/categories"),
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["public", "subcategories"],
    queryFn: async () => {
      const rows = await api.get<any[]>("/api/user/subcategories");
      return rows.map((s) => ({
        id: s.id,
        name: s.name,
        categoryId: s.categoryId,
        category: categories.find((c) => c.id === s.categoryId),
      }));
    },
    enabled: categories.length > 0,
  });

  const { data: pricingData } = useQuery<{ pricing: HeroPricing[] }>({
    queryKey: ["hero", "pricing"],
    queryFn: () => api.get("/api/hero/pricing"),
    enabled: profile?.state === "verified",
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      subcategoryId: string;
      serviceCharge: number;
      deliveryCharge2km: number;
      deliveryCharge5km: number;
      deliveryCharge7km: number;
      deliveryCharge10km: number;
    }) => api.put("/api/hero/pricing", data),
    onSuccess: () => {
      toast.success("Pricing updated");
      qc.invalidateQueries({ queryKey: ["hero", "pricing"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to update pricing"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-brand-primary" size={28} />
      </div>
    );
  }

  const serviceCategories = categories.filter((c) => c.type === "SERVICE" && profile?.profile?.categoryIds?.includes(c.id));
  const serviceSubcategories = subcategories.filter((s) => profile?.profile?.subcategoryIds?.includes(s.id));

  const pricingMap = new Map(pricingData?.pricing?.map((p) => [p.subcategoryId, p]) || []);

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Services</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Set pricing for your verified subcategories
        </p>
      </div>

      {/* Verified Service Categories */}
      {serviceCategories.length > 0 && (
        <Card>
          <CardContent className="py-6 space-y-4">
            <h2 className="font-heading text-lg text-brand-text">Verified Service Categories</h2>
            <div className="flex flex-wrap gap-2">
              {serviceCategories.map((c) => (
                <span key={c.id} className="px-3 py-1.5 rounded-sm bg-brand-primary/10 text-brand-primary text-sm">
                  {c.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subcategory Pricing */}
      <Card>
        <CardContent className="py-6 space-y-6">
          <h2 className="font-heading text-lg text-brand-text">Subcategory Pricing</h2>
          {serviceSubcategories.length === 0 ? (
            <div className="text-center py-8 text-brand-textMuted">
              No subcategories configured for pricing
            </div>
          ) : (
            <div className="space-y-6">
              {serviceSubcategories.map((subcategory) => (
                <SubcategoryPricingForm
                  key={subcategory.id}
                  subcategory={subcategory}
                  existingPricing={pricingMap.get(subcategory.id)}
                  onSave={updateMutation.mutate}
                  isSaving={updateMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
