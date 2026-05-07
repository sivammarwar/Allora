"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, Trash2, Package, Banknote, Smartphone } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useSecretCart } from "@/lib/secretShopCart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PaymentMode = "COD" | "ONLINE";

export default function SecretShopCartPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { items, inc, dec, remove, clear, total } = useSecretCart();
  const [notes, setNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("COD");

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const order = await api.post<{ id: string }>("/api/secret-shop/orders", {
        items: items.map((i) => ({ inventoryItemId: i.inventoryItemId, quantity: i.quantity })),
        notes: notes.trim() || null,
        paymentMode,
      });

      if (paymentMode === "ONLINE") {
        const { redirectUrl, merchantTransactionId } = await api.post<{ redirectUrl: string; merchantTransactionId: string }>(
          "/api/secret-shop/payment/initiate",
          { orderId: order.id }
        );
        try { sessionStorage.setItem("allora_pending_txn", merchantTransactionId); } catch {}
        return { redirectUrl, orderId: order.id };
      }

      return { redirectUrl: null, orderId: order.id };
    },
    onSuccess: ({ redirectUrl }) => {
      clear();
      qc.invalidateQueries({ queryKey: ["secret-shop", "orders"] });
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      } else {
        toast.success("Order placed! Pay on delivery.");
        router.push("/secret-shop/orders");
      }
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to place order"),
  });

  if (items.length === 0) {
    return (
      <div className="page-enter max-w-lg mx-auto">
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <ShoppingCart size={32} className="mx-auto text-brand-textMuted" />
            <p className="text-brand-textMuted text-sm">Your cart is empty.</p>
            <Button variant="outline" onClick={() => router.push("/secret-shop/dashboard")}>
              Browse Items
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-enter max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Cart</h1>
        <p className="text-brand-textMuted text-sm mt-1">{items.length} item(s)</p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.inventoryItemId}>
            <CardContent className="py-4 flex items-center gap-4">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-14 h-14 object-cover rounded-sm flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-sm bg-brand-bg flex items-center justify-center flex-shrink-0">
                  <Package size={20} className="text-brand-textMuted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-brand-text truncate">{item.name}</p>
                {item.brandName && (
                  <p className="text-xs text-brand-textMuted">{item.brandName}</p>
                )}
                <p className="text-sm text-brand-primary font-semibold mt-0.5">
                  ₹{item.unitPrice} × {item.quantity} = ₹{item.unitPrice * item.quantity}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => dec(item.inventoryItemId)}
                  className="w-7 h-7 rounded-sm bg-brand-surface border border-brand-border flex items-center justify-center text-brand-text hover:bg-brand-bg"
                >
                  <Minus size={12} />
                </button>
                <span className="w-5 text-center text-sm font-medium text-brand-text">
                  {item.quantity}
                </span>
                <button
                  onClick={() => inc(item.inventoryItemId)}
                  disabled={item.quantity >= item.availableQty}
                  className="w-7 h-7 rounded-sm bg-brand-surface border border-brand-border flex items-center justify-center text-brand-text hover:bg-brand-bg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={12} />
                </button>
                <button
                  onClick={() => remove(item.inventoryItemId)}
                  className="ml-1 text-brand-textMuted hover:text-brand-error transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment method */}
      <Card>
        <CardContent className="py-5 space-y-3">
          <p className="text-sm font-medium text-brand-text">Payment Method</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMode("COD")}
              className={`flex flex-col items-center gap-1.5 p-4 rounded-sm border transition-colors ${
                paymentMode === "COD"
                  ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                  : "border-brand-border bg-brand-surface text-brand-textMuted hover:border-brand-primary/50"
              }`}
            >
              <Banknote size={22} />
              <span className="text-sm font-medium">Cash on Delivery</span>
              <span className="text-[11px] opacity-70">Pay when delivered</span>
            </button>
            <button
              onClick={() => setPaymentMode("ONLINE")}
              className={`flex flex-col items-center gap-1.5 p-4 rounded-sm border transition-colors ${
                paymentMode === "ONLINE"
                  ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                  : "border-brand-border bg-brand-surface text-brand-textMuted hover:border-brand-primary/50"
              }`}
            >
              <Smartphone size={22} />
              <span className="text-sm font-medium">UPI / Online</span>
              <span className="text-[11px] opacity-70">PhonePe, GPay &amp; more</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Order total + notes + place order */}
      <Card>
        <CardContent className="py-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-brand-textMuted text-sm">Order Total</span>
            <span className="font-bold text-xl text-brand-primary">₹{total()}</span>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Notes for agent
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Delivery instructions, preferences..."
              className="w-full p-3 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => placeOrderMutation.mutate()}
            loading={placeOrderMutation.isPending}
          >
            {paymentMode === "ONLINE" ? `Pay ₹${total()} via UPI` : `Place Order · ₹${total()} (COD)`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
