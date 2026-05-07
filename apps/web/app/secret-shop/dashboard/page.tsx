"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, ShieldCheck, Clock, AlertCircle, Plus, Minus, Tag } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useSecretCart } from "@/lib/secretShopCart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { useSecretShopSearch } from "../layout";

interface InventoryItem {
  id: string;
  itemId: string;
  mrp: number | null;
  price: number;
  quantity: number;
  specification: string | null;
  item: {
    id: string; name: string; brandName: string | null; imageUrl: string | null; buyCount: number;
    category: { id: string; name: string; imageUrl: string | null } | null;
  };
}

interface MeResponse {
  state: "needs_request" | "pending" | "verified";
  request?: { id: string; status: string; shopName: string; createdAt: string };
  profile?: { id: string; shopName: string; isVerifiedByAgent: boolean };
}

const emptyForm = {
  shopName: "",
  phone: "",
  address: "",
  purpose: "",
  location: null as { lat: number; lng: number } | null,
};

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ inv }: { inv: InventoryItem }) {
  const { add, items: cartItems } = useSecretCart();
  const inCart = cartItems.find((c) => c.inventoryItemId === inv.id);
  const isAdded = !!inCart;
  const discount = inv.mrp && Number(inv.mrp) > Number(inv.price)
    ? Math.round((1 - Number(inv.price) / Number(inv.mrp)) * 100) : null;

  return (
    <div className="w-40 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {inv.item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={inv.item.imageUrl} alt={inv.item.name} className="w-full h-28 object-cover" />
      ) : (
        <div className="w-full h-28 bg-gray-50 flex items-center justify-center">
          <Package size={24} className="text-gray-300" />
        </div>
      )}
      <div className="p-2.5 space-y-1.5">
        <div>
          <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-1">{inv.item.name}</p>
          {inv.item.brandName && <p className="text-[10px] text-gray-400 leading-tight">{inv.item.brandName}</p>}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-brand-primary">₹{Number(inv.price)}</span>
          {discount && <span className="text-[10px] text-green-600 font-semibold">{discount}% off</span>}
        </div>
        {inv.quantity === 0 ? (
          <span className="block text-center text-[10px] font-semibold text-red-500 bg-red-50 rounded-lg py-1">Out of stock</span>
        ) : isAdded ? (
          <div className="flex items-center justify-between bg-brand-primary/10 rounded-lg px-1">
            <button onClick={() => useSecretCart.getState().dec(inv.id)} className="w-7 h-7 flex items-center justify-center text-brand-primary font-bold text-lg">−</button>
            <span className="text-xs font-bold text-brand-primary">{inCart?.quantity}</span>
            <button onClick={() => useSecretCart.getState().inc(inv.id)} disabled={(inCart?.quantity ?? 0) >= inv.quantity} className="w-7 h-7 flex items-center justify-center text-brand-primary font-bold text-lg disabled:opacity-40">+</button>
          </div>
        ) : (
          <button
            onClick={() => add({ inventoryItemId: inv.id, name: inv.item.name, brandName: inv.item.brandName, imageUrl: inv.item.imageUrl, unitPrice: Number(inv.price), availableQty: inv.quantity })}
            className="w-full py-1 rounded-lg bg-brand-primary text-white text-[11px] font-semibold"
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
}

export default function SecretShopDashboardPage() {
  const qc = useQueryClient();
  const { search } = useSecretShopSearch();
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: me, isLoading: meLoading, isError: meError } = useQuery<MeResponse>({
    queryKey: ["secret-shop", "me"],
    queryFn: () => api.get("/api/secret-shop/me"),
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<InventoryItem[]>({
    queryKey: ["secret-shop", "items", search],
    queryFn: () => api.get(`/api/secret-shop/items?search=${encodeURIComponent(search)}`),
    enabled: me?.state === "verified",
    refetchInterval: 30_000,
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      api.post("/api/secret-shop/register-request", {
        shopName: form.shopName, phone: form.phone, address: form.address,
        purpose: form.purpose || null, locationLat: form.location?.lat ?? 0, locationLng: form.location?.lng ?? 0,
      }),
    onSuccess: () => { toast.success("Verification request submitted!"); qc.invalidateQueries({ queryKey: ["secret-shop", "me"] }); setForm(emptyForm); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to submit"),
  });

  // Derive categories from items
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; imageUrl: string | null }>();
    for (const inv of items) {
      if (inv.item.category) map.set(inv.item.category.id, inv.item.category);
    }
    return Array.from(map.values());
  }, [items]);

  // Group + filter items
  const filteredItems = useMemo(() => {
    if (activeCat) return items.filter((i) => i.item.category?.id === activeCat);
    return items;
  }, [items, activeCat]);

  const grouped = useMemo(() => {
    if (activeCat || search) return null;
    const map = new Map<string, InventoryItem[]>();
    const uncategorised: InventoryItem[] = [];
    for (const inv of items) {
      const cat = inv.item.category;
      if (cat) {
        if (!map.has(cat.id)) map.set(cat.id, []);
        map.get(cat.id)!.push(inv);
      } else {
        uncategorised.push(inv);
      }
    }
    return { map, uncategorised };
  }, [items, activeCat, search]);

  if (meLoading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
    </div>
  );

  if (!me || meError || me?.state === "needs_request") {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-2xl text-brand-text">Welcome</h1>
          <p className="text-brand-textMuted text-sm mt-1">Submit a verification request to start ordering.</p>
        </div>
        <Card>
          <CardContent className="py-5 space-y-4">
            <Input label="Shop name *" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
            <Input label="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Address *" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">Purpose / Notes</label>
              <textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} rows={3}
                className="w-full p-3 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
                placeholder="Tell the regional officer about your shop..." />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">Shop location</label>
              <LocationPicker value={form.location} onChange={(loc) => setForm({ ...form, location: loc })} />
            </div>
            <Button className="w-full" onClick={() => {
              if (!form.shopName || !form.phone || !form.address) { toast.error("Shop name, phone and address are required"); return; }
              registerMutation.mutate();
            }} loading={registerMutation.isPending}>Submit Verification Request</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (me?.state === "pending") {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto">
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <Clock size={26} className="text-amber-500" />
            </div>
            <h2 className="font-heading text-xl text-brand-text">Verification Pending</h2>
            <p className="text-brand-textMuted text-sm">
              Your request for <strong className="text-brand-text">{me.request?.shopName}</strong> is under review.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-amber-500/10 text-amber-600 text-xs">
              <AlertCircle size={12} /> Status: {me.request?.status}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Verified dashboard ─────────────────────────────────────────────────────
  return (
    <div className="space-y-0">
      {/* Verified badge */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
        <ShieldCheck size={13} className="text-green-500" />
        <span className="text-[11px] text-green-600 font-medium">Verified Shop</span>
      </div>

      {/* Category chips */}
      {!search && categories.length > 0 && (
        <div className="overflow-x-auto px-4 pb-2 scrollbar-none">
          <div className="flex gap-2 w-max pt-1">
            <button
              onClick={() => setActiveCat(null)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                activeCat === null ? "bg-brand-primary text-white border-brand-primary" : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              <Tag size={11} /> All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  activeCat === cat.id ? "bg-brand-primary text-white border-brand-primary" : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {cat.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cat.imageUrl} alt={cat.name} className="w-4 h-4 rounded-full object-cover" />
                ) : <Tag size={11} />}
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {itemsLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 px-4">
          <Package size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">{search ? "No products match your search." : "No products available yet."}</p>
        </div>
      ) : (activeCat || search) ? (
        // Flat grid when filtered
        <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredItems.map((inv) => <ProductCard key={inv.id} inv={inv} />)}
        </div>
      ) : grouped ? (
        // Grouped rows by category
        <div className="space-y-5 py-3">
          {Array.from(grouped.map.entries()).map(([catId, catItems]) => {
            const cat = catItems[0]?.item.category;
            return (
              <div key={catId}>
                <div className="flex items-center justify-between px-4 mb-2">
                  <div className="flex items-center gap-2">
                    {cat?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.imageUrl} alt={cat.name} className="w-5 h-5 rounded-full object-cover" />
                    ) : <Tag size={13} className="text-brand-primary" />}
                    <span className="text-sm font-bold text-gray-800">{cat?.name}</span>
                  </div>
                  <button onClick={() => setActiveCat(catId)} className="text-xs text-brand-primary font-medium">See all</button>
                </div>
                <div className="overflow-x-auto pl-4 scrollbar-none">
                  <div className="flex gap-3 pr-4 w-max">
                    {catItems.map((inv) => <ProductCard key={inv.id} inv={inv} />)}
                  </div>
                </div>
              </div>
            );
          })}
          {grouped.uncategorised.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-4 mb-2">
                <span className="text-sm font-bold text-gray-800">Other Products</span>
              </div>
              <div className="overflow-x-auto pl-4 scrollbar-none">
                <div className="flex gap-3 pr-4 w-max">
                  {grouped.uncategorised.map((inv) => <ProductCard key={inv.id} inv={inv} />)}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
