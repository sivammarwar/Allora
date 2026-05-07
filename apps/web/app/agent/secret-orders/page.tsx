"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Store, Package, ChevronDown, Check, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  shop: { id: string; shopName: string; phone: string; address: string };
  items: SecretOrderItem[];
}

interface VerifiedShop {
  id: string;
  shopName: string;
  phone: string;
  address: string;
  user: { id: string; email: string; name: string | null };
  _count: { orders: number };
}

const STATUS_LABELS: Record<string, string> = {
  PLACED: "Placed",
  RECEIVED: "Received",
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

const NEXT_STATUSES: Record<string, string[]> = {
  PLACED: ["RECEIVED", "CANCELLED"],
  RECEIVED: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
};

export default function AgentSecretOrdersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"active" | "past">("active");
  const [expandedShop, setExpandedShop] = useState<string | null>(null);

  const { data: shops = [] } = useQuery<VerifiedShop[]>({
    queryKey: ["agent", "verified-secret-shops"],
    queryFn: () => api.get("/api/agent/verified-secret-shops"),
  });

  const { data: orders = [], isLoading } = useQuery<SecretOrder[]>({
    queryKey: ["agent", "secret-orders", tab],
    queryFn: () => api.get(`/api/agent/secret-orders?past=${tab === "past"}`),
    refetchInterval: tab === "active" ? 20000 : false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/api/agent/secret-orders/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Order status updated");
      qc.invalidateQueries({ queryKey: ["agent", "secret-orders"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const markItemMutation = useMutation({
    mutationFn: ({
      orderId,
      itemId,
      isPacked,
      isRejected,
    }: {
      orderId: string;
      itemId: string;
      isPacked?: boolean;
      isRejected?: boolean;
    }) =>
      api.patch(`/api/agent/secret-orders/${orderId}/items/${itemId}`, {
        isPacked,
        isRejected,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent", "secret-orders"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to update item"),
  });

  function togglePacked(orderId: string, itemId: string, current: boolean) {
    markItemMutation.mutate({ orderId, itemId, isPacked: !current, isRejected: false });
  }

  function toggleRejected(orderId: string, itemId: string, current: boolean) {
    markItemMutation.mutate({ orderId, itemId, isRejected: !current, isPacked: false });
  }

  function allMarked(order: SecretOrder) {
    return order.items.every((oi) => oi.isPacked || oi.isRejected);
  }

  const ordersByShop = shops.map((shop) => ({
    shop,
    orders: orders.filter((o) => o.shop.id === shop.id),
  }));

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Verified Shops & Orders</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Manage orders from your verified secret shops
        </p>
      </div>

      {/* Verified shops summary */}
      {shops.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((shop) => (
            <Card key={shop.id}>
              <CardContent className="py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center">
                  <Store size={18} className="text-brand-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-brand-text truncate">{shop.shopName}</p>
                  <p className="text-xs text-brand-textMuted">{shop.phone} · {shop._count.orders} order(s)</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2">
        {(["active", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
              tab === t
                ? "bg-brand-primary text-white"
                : "bg-brand-surface text-brand-textMuted hover:text-brand-text"
            }`}
          >
            {t === "active" ? "Active Orders" : "Past Orders"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-brand-textMuted text-sm">Loading...</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package size={28} className="mx-auto mb-3 text-brand-textMuted" />
            <p className="text-brand-textMuted text-sm">
              No {tab === "active" ? "active" : "past"} orders
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ordersByShop
            .filter((g) => g.orders.length > 0)
            .map(({ shop, orders: shopOrders }) => (
              <Card key={shop.id}>
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedShop(expandedShop === shop.id ? null : shop.id)}
                >
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Store size={16} className="text-brand-primary" />
                      <span className="font-medium text-brand-text">{shop.shopName}</span>
                      <span className="text-xs text-brand-textMuted">{shopOrders.length} order(s)</span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-brand-textMuted transition-transform ${expandedShop === shop.id ? "rotate-180" : ""}`}
                    />
                  </CardContent>
                </button>

                {expandedShop === shop.id && (
                  <div className="border-t border-brand-border divide-y divide-brand-border">
                    {shopOrders.map((order) => {
                      const marked = order.items.filter((oi) => oi.isPacked || oi.isRejected).length;
                      const total = order.items.length;
                      const fullyMarked = marked === total;
                      const effectiveTotal = order.items
                        .filter((oi) => !oi.isRejected)
                        .reduce((sum, oi) => sum + oi.quantity * Number(oi.unitPrice), 0);

                      return (
                        <div key={order.id} className="p-4 space-y-3">
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
                            <div className="text-right">
                              <span className="font-bold text-brand-primary">₹{effectiveTotal}</span>
                              {effectiveTotal !== Number(order.totalAmount) && (
                                <p className="text-[10px] text-brand-textMuted line-through">₹{Number(order.totalAmount)}</p>
                              )}
                            </div>
                          </div>

                          {/* Item cards grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {order.items.map((oi) => (
                              <div
                                key={oi.id}
                                className={`relative rounded-sm border flex flex-col overflow-hidden transition-colors ${
                                  oi.isRejected
                                    ? "border-red-400 bg-red-500/5"
                                    : oi.isPacked
                                    ? "border-green-400 bg-green-500/5"
                                    : "border-brand-border bg-brand-surface"
                                }`}
                              >
                                {/* Product image */}
                                {oi.inventoryItem.item.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={oi.inventoryItem.item.imageUrl}
                                    alt={oi.inventoryItem.item.name}
                                    className={`w-full h-24 object-cover ${oi.isRejected ? "opacity-40" : ""}`}
                                  />
                                ) : (
                                  <div className="w-full h-24 bg-brand-bg flex items-center justify-center">
                                    <Package size={22} className="text-brand-textMuted" />
                                  </div>
                                )}

                                {/* Rejected overlay label */}
                                {oi.isRejected && (
                                  <div className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    Rejected
                                  </div>
                                )}

                                {/* Info */}
                                <div className="p-2 flex-1 space-y-0.5">
                                  <p className="text-xs font-medium text-brand-text leading-tight line-clamp-2">
                                    {oi.inventoryItem.item.name}
                                    {oi.inventoryItem.item.brandName && (
                                      <span className="text-brand-textMuted font-normal"> ({oi.inventoryItem.item.brandName})</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-brand-primary font-semibold">
                                    {oi.quantity} × ₹{Number(oi.unitPrice)}
                                  </p>
                                  <p className="text-xs text-brand-textMuted font-medium">
                                    = ₹{oi.quantity * Number(oi.unitPrice)}
                                  </p>
                                </div>

                                {/* Tick / Cross action buttons — only on active orders */}
                                {NEXT_STATUSES[order.status] && (
                                  <div className="flex border-t border-brand-border">
                                    <button
                                      title="Mark packed"
                                      onClick={() => togglePacked(order.id, oi.id, oi.isPacked)}
                                      disabled={markItemMutation.isPending}
                                      className={`flex-1 flex items-center justify-center py-1.5 text-xs font-medium transition-colors border-r border-brand-border ${
                                        oi.isPacked
                                          ? "bg-green-500/10 text-green-600"
                                          : "text-brand-textMuted hover:bg-green-500/5 hover:text-green-600"
                                      }`}
                                    >
                                      <Check size={13} />
                                    </button>
                                    <button
                                      title="Mark rejected"
                                      onClick={() => toggleRejected(order.id, oi.id, oi.isRejected)}
                                      disabled={markItemMutation.isPending}
                                      className={`flex-1 flex items-center justify-center py-1.5 text-xs font-medium transition-colors ${
                                        oi.isRejected
                                          ? "bg-red-500/10 text-red-600"
                                          : "text-brand-textMuted hover:bg-red-500/5 hover:text-red-600"
                                      }`}
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {order.notes && (
                            <p className="text-xs text-brand-textMuted italic">Note: {order.notes}</p>
                          )}

                          <p className="text-xs text-brand-textMuted">
                            {new Date(order.createdAt).toLocaleString("en-IN")}
                          </p>

                          {NEXT_STATUSES[order.status] && (
                            <div className="flex gap-2 flex-wrap items-center">
                              {NEXT_STATUSES[order.status].map((nextStatus) => {
                                const needsAllPacked = nextStatus === "PACKED" && !allMarked(order);
                                const needsAllMarked = nextStatus === "DELIVERED" && !fullyMarked;
                                const blocked = needsAllPacked || needsAllMarked;
                                return (
                                  <Button
                                    key={nextStatus}
                                    size="sm"
                                    variant={nextStatus === "CANCELLED" ? "outline" : "primary"}
                                    className={nextStatus === "CANCELLED" ? "text-brand-error border-brand-error/30" : ""}
                                    disabled={blocked || updateStatusMutation.isPending}
                                    title={
                                      needsAllPacked
                                        ? "Tick/cross all items first"
                                        : needsAllMarked
                                        ? `Mark all items first (${marked}/${total} done)`
                                        : undefined
                                    }
                                    onClick={() =>
                                      updateStatusMutation.mutate({ id: order.id, status: nextStatus })
                                    }
                                  >
                                    {nextStatus === "PACKED" && needsAllPacked
                                      ? `Mark as Packed (${marked}/${total})`
                                      : nextStatus === "DELIVERED" && needsAllMarked
                                      ? `Deliver (${marked}/${total} marked)`
                                      : `Mark as ${STATUS_LABELS[nextStatus]}`}
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
