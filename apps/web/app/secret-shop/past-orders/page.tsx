"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, Package } from "lucide-react";
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
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: "bg-green-500/10 text-green-600",
  CANCELLED: "bg-red-500/10 text-red-600",
};

export default function SecretShopPastOrdersPage() {
  const { data: orders = [], isLoading } = useQuery<SecretOrder[]>({
    queryKey: ["secret-shop", "orders", "past"],
    queryFn: () => api.get("/api/secret-shop/orders?past=true"),
  });

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Past Orders</h1>
        <p className="text-brand-textMuted text-sm mt-1">Your completed and cancelled orders</p>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-brand-textMuted text-sm">Loading...</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock size={28} className="mx-auto mb-3 text-brand-textMuted" />
            <p className="text-brand-textMuted text-sm">No past orders yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="py-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-brand-textMuted">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[order.status] ?? "bg-brand-surface text-brand-textMuted"}`}
                    >
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
                      <span className={`text-sm ${oi.isRejected ? "line-through text-brand-textMuted" : "text-brand-text"}`}>{oi.inventoryItem.item.name}</span>
                      {oi.inventoryItem.item.brandName && (
                        <span className="text-brand-textMuted text-xs">({oi.inventoryItem.item.brandName})</span>
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
                  {new Date(order.createdAt).toLocaleString("en-IN")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
