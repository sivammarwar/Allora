"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Package, Banknote, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

interface SecretOrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  isRejected: boolean;
  inventoryItem: {
    item: { name: string; brandName: string | null };
  };
}

interface SecretOrder {
  id: string;
  status: string;
  totalAmount: number;
  paymentMode: "COD" | "ONLINE";
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  createdAt: string;
  items: SecretOrderItem[];
}

const STATUS_COLORS: Record<string, string> = {
  PLACED: "bg-blue-500/10 text-blue-600",
  RECEIVED: "bg-purple-500/10 text-purple-600",
  PACKED: "bg-amber-500/10 text-amber-600",
  OUT_FOR_DELIVERY: "bg-orange-500/10 text-orange-600",
  DELIVERED: "bg-green-500/10 text-green-600",
  CANCELLED: "bg-red-500/10 text-red-600",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PAID: "bg-green-500/10 text-green-700",
  FAILED: "bg-red-500/10 text-red-600",
  PENDING: "bg-amber-500/10 text-amber-600",
};

function effectiveTotal(items: SecretOrderItem[]) {
  return items
    .filter((i) => !i.isRejected)
    .reduce((sum, i) => sum + i.quantity * Number(i.unitPrice), 0);
}

export default function SecretShopPaymentHistoryPage() {
  const [search, setSearch] = useState("");
  const { data: orders = [], isLoading } = useQuery<SecretOrder[]>({
    queryKey: ["secret-shop", "payment-history"],
    queryFn: () => api.get("/api/secret-shop/orders?all=true"),
  });

  const filtered = search.trim()
    ? orders.filter((o) => {
        const q = search.toLowerCase();
        return (
          o.id.toLowerCase().includes(q) ||
          o.status.toLowerCase().includes(q) ||
          o.paymentMode.toLowerCase().includes(q) ||
          o.paymentStatus.toLowerCase().includes(q) ||
          o.items.some((i) =>
            i.inventoryItem.item.name.toLowerCase().includes(q) ||
            (i.inventoryItem.item.brandName ?? "").toLowerCase().includes(q)
          )
        );
      })
    : orders;

  const totalPaid = orders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((sum, o) => sum + effectiveTotal(o.items), 0);

  const totalCOD = orders
    .filter((o) => o.paymentMode === "COD" && o.status === "DELIVERED")
    .reduce((sum, o) => sum + effectiveTotal(o.items), 0);

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Payment History</h1>
        <p className="text-brand-textMuted text-sm mt-1">All your basket payments</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by item, status, order ID…"
          className="w-full pl-9 pr-4 py-2.5 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4 px-4 space-y-1">
            <p className="text-xs text-brand-textMuted">Total Orders</p>
            <p className="text-2xl font-bold text-brand-text">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-4 space-y-1">
            <p className="text-xs text-brand-textMuted">Online Paid</p>
            <p className="text-2xl font-bold text-green-600">₹{totalPaid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 px-4 space-y-1">
            <p className="text-xs text-brand-textMuted">COD Delivered</p>
            <p className="text-2xl font-bold text-brand-primary">₹{totalCOD}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-brand-textMuted text-sm">Loading…</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard size={28} className="mx-auto mb-3 text-brand-textMuted" />
            <p className="text-brand-textMuted text-sm">No payment records yet.</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-brand-textMuted text-sm">No records match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const effective = effectiveTotal(order.items);
            const original = Number(order.totalAmount);
            const hasRejected = effective !== original;
            return (
              <Card key={order.id}>
                <CardContent className="py-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-brand-textMuted">
                        #{order.id.slice(-8).toUpperCase()}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[order.status] ?? ""}`}>
                        {order.status}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${PAYMENT_STATUS_COLORS[order.paymentStatus]}`}>
                        {order.paymentMode === "COD" ? "COD" : order.paymentStatus}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand-primary">₹{effective}</p>
                      {hasRejected && (
                        <p className="text-[10px] text-brand-textMuted line-through">₹{original}</p>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between text-sm ${
                          item.isRejected ? "opacity-40 line-through" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Package size={12} className="text-brand-textMuted flex-shrink-0" />
                          <span className="text-brand-text">{item.inventoryItem.item.name}</span>
                          {item.inventoryItem.item.brandName && (
                            <span className="text-brand-textMuted text-xs">
                              ({item.inventoryItem.item.brandName})
                            </span>
                          )}
                        </div>
                        <span className="text-brand-textMuted text-xs ml-4 flex-shrink-0">
                          {item.quantity} × ₹{Number(item.unitPrice)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-brand-textMuted pt-1 border-t border-brand-border">
                    <div className="flex items-center gap-1">
                      {order.paymentMode === "COD" ? (
                        <Banknote size={12} />
                      ) : (
                        <CreditCard size={12} />
                      )}
                      <span>{order.paymentMode}</span>
                    </div>
                    <span>{new Date(order.createdAt).toLocaleString("en-IN")}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
