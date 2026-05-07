"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShoppingCart, Search, Package, ShieldCheck, Clock, AlertCircle, Plus, Minus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useSecretCart } from "@/lib/secretShopCart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationPicker } from "@/components/maps/LocationPicker";

interface InventoryItem {
  id: string;
  itemId: string;
  mrp: number | null;
  price: number;
  quantity: number;
  specification: string | null;
  item: { id: string; name: string; brandName: string | null; imageUrl: string | null };
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

export default function SecretShopDashboardPage() {
  const qc = useQueryClient();
  const { add, items: cartItems } = useSecretCart();
  const [search, setSearch] = useState("");
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
        shopName: form.shopName,
        phone: form.phone,
        address: form.address,
        purpose: form.purpose || null,
        locationLat: form.location?.lat ?? 0,
        locationLng: form.location?.lng ?? 0,
      }),
    onSuccess: () => {
      toast.success("Verification request submitted!");
      qc.invalidateQueries({ queryKey: ["secret-shop", "me"] });
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to submit"),
  });

  const handleRegister = () => {
    if (!form.shopName || !form.phone || !form.address) {
      toast.error("Shop name, phone and address are required");
      return;
    }
    registerMutation.mutate();
  };

  const cartCount = cartItems.reduce((s, x) => s + x.quantity, 0);
  const cartIds = new Set(cartItems.map((c) => c.inventoryItemId));

  if (meLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Needs to register (also covers API error / unauthenticated) ────────────
  if (!me || meError || me?.state === "needs_request") {
    return (
      <div className="page-enter max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">Welcome</h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Submit a verification request to start ordering from your agent.
          </p>
        </div>

        <Card>
          <CardContent className="py-6 space-y-4">
            <Input
              label="Shop name *"
              value={form.shopName}
              onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            />
            <Input
              label="Phone *"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Address *"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">
                Purpose / Notes
              </label>
              <textarea
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                rows={3}
                className="w-full p-3 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
                placeholder="Tell the agent about your shop..."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">
                Shop location
              </label>
              <LocationPicker
                value={form.location}
                onChange={(loc) => setForm({ ...form, location: loc })}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleRegister}
              loading={registerMutation.isPending}
            >
              Submit Verification Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Pending ────────────────────────────────────────────────────────────────
  if (me?.state === "pending") {
    return (
      <div className="page-enter max-w-lg mx-auto space-y-6">
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <Clock size={26} className="text-amber-500" />
            </div>
            <h2 className="font-heading text-xl text-brand-text">Verification Pending</h2>
            <p className="text-brand-textMuted text-sm">
              Your request for <strong className="text-brand-text">{me.request?.shopName}</strong> has
              been sent to an agent and is under review. You will be able to browse items once approved.
            </p>
            <p className="text-xs text-brand-textMuted">
              Submitted {me.request ? new Date(me.request.createdAt).toLocaleString("en-IN") : "—"}
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-amber-500/10 text-amber-600 text-xs">
              <AlertCircle size={12} />
              Status: {me.request?.status}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Verified — browse items ────────────────────────────────────────────────
  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={16} className="text-green-500" />
            <span className="text-xs text-green-600 font-medium">Verified Shop</span>
          </div>
          <h1 className="font-heading text-3xl text-brand-text">
            {me?.profile?.shopName ?? "Allora"}
          </h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Browse items from your agent and add them to your cart
          </p>
        </div>
        <a
          href="/secret-shop/cart"
          className="relative inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-brand-primary text-white text-sm font-medium"
        >
          <ShoppingCart size={16} />
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-error text-white text-xs flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </a>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items by name or brand..."
          className="w-full pl-9 pr-4 py-2.5 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
        />
      </div>

      {/* Items */}
      {itemsLoading ? (
        <div className="text-center py-10 text-brand-textMuted text-sm">Loading...</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-brand-textMuted text-sm">
            <Package size={28} className="mx-auto mb-3 text-brand-textMuted" />
            {search ? "No items match your search." : "Your agent has not added any items yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((inv) => {
            const inCart = cartItems.find((c) => c.inventoryItemId === inv.id);
            const isAdded = cartIds.has(inv.id);
            const discount = inv.mrp && Number(inv.mrp) > Number(inv.price)
              ? Math.round((1 - Number(inv.price) / Number(inv.mrp)) * 100)
              : null;
            return (
              <Card key={inv.id} className="overflow-hidden">
                {inv.item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={inv.item.imageUrl} alt={inv.item.name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-brand-bg flex items-center justify-center">
                    <Package size={32} className="text-brand-textMuted" />
                  </div>
                )}
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-brand-text">{inv.item.name}</h3>
                      {inv.item.brandName && (
                        <p className="text-xs text-brand-textMuted">{inv.item.brandName}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-brand-primary leading-tight">
                        ₹{Number(inv.price)}
                      </p>
                      {discount && (
                        <p className="text-xs text-brand-textMuted line-through leading-tight">
                          ₹{Number(inv.mrp)}
                        </p>
                      )}
                      {discount && (
                        <p className="text-[11px] font-semibold text-green-600 leading-tight">
                          {discount}% off
                        </p>
                      )}
                    </div>
                  </div>
                  {inv.specification && (
                    <p className="text-xs text-brand-textMuted line-clamp-2">
                      {inv.specification}
                    </p>
                  )}
                  {inv.quantity === 0 && (
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-red-500/10 text-red-600">
                      Out of Stock
                    </span>
                  )}
                  {inv.quantity > 0 && isAdded ? (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => useSecretCart.getState().dec(inv.id)}
                        className="w-8 h-8 rounded-sm bg-brand-surface border border-brand-border flex items-center justify-center text-brand-text hover:bg-brand-bg"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="flex-1 text-center font-medium text-brand-text">
                        {inCart?.quantity ?? 0}
                      </span>
                      <button
                        onClick={() => useSecretCart.getState().inc(inv.id)}
                        disabled={(inCart?.quantity ?? 0) >= inv.quantity}
                        className="w-8 h-8 rounded-sm bg-brand-surface border border-brand-border flex items-center justify-center text-brand-text hover:bg-brand-bg disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  ) : inv.quantity > 0 ? (
                    <Button
                      size="sm"
                      className="w-full mt-1"
                      onClick={() =>
                        add({
                          inventoryItemId: inv.id,
                          name: inv.item.name,
                          brandName: inv.item.brandName,
                          imageUrl: inv.item.imageUrl,
                          unitPrice: Number(inv.price),
                          availableQty: inv.quantity,
                        })
                      }
                    >
                      <ShoppingCart size={13} className="mr-1.5" />
                      Add to Cart
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
