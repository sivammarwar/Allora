"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, Trash2, MapPin, Loader2, Wallet, CreditCard } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useCart, type CartItem } from "@/lib/cart";
import { useCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { formatINR } from "@/lib/utils";
import { openRazorpay } from "@/lib/razorpay-client";
import { getStoredLocation } from "@/lib/location";

export default function CartPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const items = useCart((s) => s.items);
  const inc = useCart((s) => s.inc);
  const dec = useCart((s) => s.dec);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const totals = useCart((s) => s.totals());

  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<"" | "ONLINE" | "COD">("");

  useEffect(() => {
    const loc = getStoredLocation();
    if (loc) setCoords({ lat: loc.lat, lng: loc.lng });
  }, []);

  // Group cart items by hero for display
  const grouped = items.reduce<Record<string, CartItem[]>>((acc, x) => {
    (acc[x.heroId] ??= []).push(x);
    return acc;
  }, {});

  async function checkout(method: "ONLINE" | "COD") {
    if (!coords) {
      toast.error("Pin your delivery location on the map");
      return;
    }
    if (address.trim().length < 3) {
      toast.error("Add a delivery address");
      return;
    }
    setSubmitting(method);
    try {
      const body = {
        items: items.map((i) => ({
          heroId: i.heroId,
          productId: i.productId ?? null,
          subcategoryId: i.subcategoryId ?? null,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          deliveryCharge:
            // attribute the per-hero delivery charge to the first item only
            items.find((x) => x.heroId === i.heroId)?.key === i.key
              ? i.deliveryCharge
              : 0,
        })),
        deliveryAddress: address.trim(),
        deliveryLat: coords.lat,
        deliveryLng: coords.lng,
        paymentMethod: method,
        notes: notes.trim() || undefined,
      };

      const resp = await api.post<{
        orderId: string;
        total: number;
        paymentMethod: "ONLINE" | "COD";
        razorpay: { orderId: string; amount: number; keyId: string } | null;
      }>("/api/user/checkout", body);

      if (method === "ONLINE" && resp.razorpay) {
        await openRazorpay({
          key: resp.razorpay.keyId,
          amount: resp.razorpay.amount,
          currency: "INR",
          name: "Allora",
          description: `Order #${resp.orderId.slice(-8)}`,
          order_id: resp.razorpay.orderId,
          prefill: {
            email: user?.email,
            name: user?.name ?? undefined,
            contact: user?.phone ?? undefined,
          },
          theme: { color: "#C0626A" },
          handler: async (rp) => {
            try {
              await api.post("/api/payments/razorpay/verify", {
                orderId: resp.orderId,
                razorpay_order_id: rp.razorpay_order_id,
                razorpay_payment_id: rp.razorpay_payment_id,
                razorpay_signature: rp.razorpay_signature,
              });
              clear();
              toast.success("Payment received");
              router.push(`/orders/${resp.orderId}`);
            } catch (e) {
              toast.error(
                e instanceof ApiError ? e.message : "Payment verification failed"
              );
            }
          },
          modal: {
            ondismiss: () => setSubmitting(""),
          },
        });
        // Don't reset submitting yet — will be reset by handler/modal
        return;
      }

      // COD or Razorpay-not-configured branch (server already marked PAID for dev)
      clear();
      toast.success("Order placed");
      router.push(`/orders/${resp.orderId}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Checkout failed");
    } finally {
      setSubmitting("");
    }
  }

  if (items.length === 0) {
    return (
      <div className="page-enter max-w-xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <h1 className="font-heading text-2xl text-brand-text">Your cart is empty</h1>
            <p className="text-brand-textMuted text-sm">
              Browse local services to add your first item.
            </p>
            <Button onClick={() => router.push("/dashboard")}>Browse</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-enter max-w-3xl mx-auto space-y-6">
      <h1 className="font-heading text-3xl text-brand-text">Your cart</h1>

      {Object.entries(grouped).map(([heroId, rows]) => (
        <Card key={heroId}>
          <CardContent className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-brand-primary">
              {rows[0].heroLabel}
            </p>
            {rows.map((i) => (
              <div
                key={i.key}
                className="flex items-center gap-3 p-2 rounded-sm bg-brand-bg border border-brand-border"
              >
                {i.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={i.imageUrl}
                    alt=""
                    className="h-12 w-12 rounded-sm object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-sm bg-brand-surface" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-brand-text truncate">{i.name}</p>
                  <p className="text-xs text-brand-textMuted">
                    {formatINR(i.unitPrice)} · {i.type}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => dec(i.key)}>
                    <Minus size={12} />
                  </Button>
                  <span className="font-mono text-sm w-6 text-center">{i.quantity}</span>
                  <Button size="sm" variant="ghost" onClick={() => inc(i.key)}>
                    <Plus size={12} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(i.key)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}
            {rows[0].deliveryCharge > 0 && (
              <p className="text-xs text-brand-textMuted">
                + {formatINR(rows[0].deliveryCharge)} delivery
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="space-y-4">
          <div>
            <p className="font-heading text-lg text-brand-text mb-1">
              Delivery details
            </p>
            <p className="text-xs text-brand-textMuted">
              Estimated delivery: within 50 minutes after confirmation.
            </p>
          </div>
          <Input
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="House no, street, landmark"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Drop-off location
            </label>
            <LocationPicker value={coords} onChange={(c) => setCoords(c)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm text-brand-textMuted">
            <span>Subtotal</span>
            <span className="font-mono">{formatINR(totals.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-brand-textMuted">
            <span>Net delivery</span>
            <span className="font-mono">{formatINR(totals.delivery)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-brand-border pt-3">
            <span className="font-medium text-brand-text">Total</span>
            <span className="font-heading text-2xl text-brand-text">
              {formatINR(totals.total)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <Button
              size="lg"
              variant="outline"
              onClick={() => checkout("COD")}
              loading={submitting === "COD"}
              disabled={submitting !== ""}
            >
              <Wallet size={16} />
              Cash on delivery
            </Button>
            <Button
              size="lg"
              onClick={() => checkout("ONLINE")}
              loading={submitting === "ONLINE"}
              disabled={submitting !== ""}
            >
              <CreditCard size={16} />
              Pay online (UPI)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
