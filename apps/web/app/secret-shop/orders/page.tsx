"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Package } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

interface SecretOrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  isPacked: boolean;
  isRejected: boolean;
  inventoryItem: {
    id: string;
    price: number;
    item: { id: string; name: string; brandName: string | null; imageUrl: string | null };
  };
}

interface SecretOrder {
  id: string;
  status: string;
  totalAmount: number;
  notes: string | null;
  paymentMode: "COD" | "ONLINE";
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  createdAt: string;
  items: SecretOrderItem[];
}

const STATUS_LABELS: Record<string, string> = {
  PLACED: "Placed",
  RECEIVED: "Received by Agent",
  PACKED: "Packed",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  PLACED: "bg-blue-500/10 text-blue-600",
  RECEIVED: "bg-purple-500/10 text-purple-600",
  PACKED: "bg-amber-500/10 text-amber-600",
  OUT_FOR_DELIVERY: "bg-orange-500/10 text-orange-600",
  DELIVERED: "bg-green-500/10 text-green-600",
  CANCELLED: "bg-red-500/10 text-red-600",
};

export default function SecretShopOrdersPage() {
  const { data: orders = [], isLoading } = useQuery<SecretOrder[]>({
    queryKey: ["secret-shop", "orders", "active"],
    queryFn: () => api.get("/api/secret-shop/orders?past=false"),
    refetchInterval: 20000,
  });

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Active Orders</h1>
        <p className="text-brand-textMuted text-sm mt-1">Track the status of your current orders</p>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-brand-textMuted text-sm">Loading...</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag size={28} className="mx-auto mb-3 text-brand-textMuted" />
            <p className="text-brand-textMuted text-sm">No active orders right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="py-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-brand-textMuted">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[order.status] ?? ""}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    {order.paymentMode === "COD" ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">COD</span>
                    ) : order.paymentStatus === "PAID" ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-700">Paid · UPI</span>
                    ) : order.paymentStatus === "FAILED" ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-600">Payment Failed</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">Payment Pending</span>
                    )}
                  </div>
                  {(() => {
                    const effectiveTotal = order.items
                      .filter((oi) => !oi.isRejected)
                      .reduce((sum, oi) => sum + oi.quantity * Number(oi.unitPrice), 0);
                    return (
                      <div className="text-right">
                        <span className="font-bold text-brand-primary">₹{effectiveTotal}</span>
                        {effectiveTotal !== Number(order.totalAmount) && (
                          <p className="text-[10px] text-brand-textMuted line-through">₹{Number(order.totalAmount)}</p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-1">
                  {["PLACED", "RECEIVED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"].map((s, i, arr) => {
                    const statusIndex = arr.indexOf(order.status);
                    const done = i <= statusIndex;
                    return (
                      <div key={s} className="flex-1 flex items-center gap-1">
                        <div
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            done ? "bg-brand-primary" : "bg-brand-border"
                          }`}
                        />
                        {i < arr.length - 1 && (
                          <div
                            className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                              done ? "bg-brand-primary" : "bg-brand-border"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1">
                  {order.items.map((oi) => (
                    <div key={oi.id} className={`flex items-center gap-3 text-sm rounded px-1 py-0.5 ${oi.isRejected ? "bg-red-500/5" : ""}`}>
                      {oi.inventoryItem.item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={oi.inventoryItem.item.imageUrl}
                          alt={oi.inventoryItem.item.name}
                          className={`w-8 h-8 rounded-sm object-cover flex-shrink-0 ${oi.isRejected ? "opacity-40" : ""}`}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-sm bg-brand-bg flex items-center justify-center flex-shrink-0">
                          <Package size={13} className="text-brand-textMuted" />
                        </div>
                      )}
                      <span className={`${oi.isRejected ? "line-through text-brand-textMuted" : "text-brand-text"}`}>{oi.inventoryItem.item.name}</span>
                      {oi.inventoryItem.item.brandName && (
                        <span className="text-brand-textMuted">({oi.inventoryItem.item.brandName})</span>
                      )}
                      {oi.isRejected && (
                        <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded flex-shrink-0">Rejected</span>
                      )}
                      <span className="ml-auto text-brand-textMuted">
                        {oi.quantity} × ₹{Number(oi.unitPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <p className="text-xs text-brand-textMuted italic">Note: {order.notes}</p>
                )}
                <p className="text-xs text-brand-textMuted">
                  Placed {new Date(order.createdAt).toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
