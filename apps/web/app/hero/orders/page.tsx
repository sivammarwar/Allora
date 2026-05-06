"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackageCheck, Truck, Phone, MapPin, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getSocket } from "@/lib/socket";

interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  subcategoryId: string | null;
  quantity: number;
  unitPrice: string;
  deliveryCharge: string;
  subOrderStatus:
    | "PENDING"
    | "PACKED"
    | "ASSIGNED_DELIVERY"
    | "DELIVERED";
  createdAt: string;
  order: {
    id: string;
    status: string;
    paymentMethod: "ONLINE" | "COD";
    paymentStatus: "PENDING" | "PAID";
    deliveryAddress: string;
    deliveryLat: number;
    deliveryLng: number;
    user: { id: string; name: string | null; phone: string | null; email: string };
    notes: string | null;
  };
  product: { id: string; name: string; imageUrl: string | null } | null;
  subcategory: { id: string; name: string } | null;
  assignedDeliveryBoy: {
    id: string;
    phone: string;
    user: { name: string | null };
  } | null;
}

interface DeliveryBoy {
  id: string;
  phone: string;
  user: { name: string | null; email: string };
}

const STATUS_LABELS: Record<OrderItem["subOrderStatus"], string> = {
  PENDING: "Pending",
  PACKED: "Packed",
  ASSIGNED_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
};

export default function HeroOrdersPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<OrderItem[]>({
    queryKey: ["hero", "orders"],
    queryFn: () => api.get("/api/hero/orders"),
    refetchInterval: 30_000,
  });

  // Real-time refresh on new orders + status updates
  useEffect(() => {
    const s = getSocket("/notifications");
    const handler = () => qc.invalidateQueries({ queryKey: ["hero", "orders"] });
    s.on("order:new", handler);
    s.on("payment:confirmed", handler);
    return () => {
      s.off("order:new", handler);
      s.off("payment:confirmed", handler);
    };
  }, [qc]);

  const grouped = useMemo(() => {
    const map = new Map<string, OrderItem[]>();
    for (const i of items) {
      const arr = map.get(i.orderId) ?? [];
      arr.push(i);
      map.set(i.orderId, arr);
    }
    return Array.from(map.entries());
  }, [items]);

  const [assignFor, setAssignFor] = useState<OrderItem | null>(null);
  const { data: deliveryBoys = [] } = useQuery<DeliveryBoy[]>({
    queryKey: ["hero", "delivery-boys"],
    queryFn: () => api.get("/api/hero/delivery-boys"),
    enabled: !!assignFor,
  });

  const markPacked = useMutation({
    mutationFn: (itemId: string) => api.put(`/api/hero/orders/${itemId}/packed`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hero", "orders"] });
      toast.success("Marked as packed");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const assign = useMutation({
    mutationFn: ({ itemId, deliveryBoyId }: { itemId: string; deliveryBoyId: string }) =>
      api.put(`/api/hero/orders/${itemId}/assign-delivery`, { deliveryBoyId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hero", "orders"] });
      toast.success("Assigned");
      setAssignFor(null);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Incoming orders</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          New orders for your shop. Pack and assign delivery as they arrive.
        </p>
      </div>

      {isLoading ? (
        <Loader2 className="animate-spin text-brand-primary" />
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-brand-textMuted text-sm">
            No orders yet. New orders will appear here in real time.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([orderId, orderItems]) => {
            const ord = orderItems[0].order;
            return (
              <Card key={orderId}>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-[11px] text-brand-textMuted">
                      #{orderId.slice(-8)}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-sm ${
                        ord.paymentStatus === "PAID"
                          ? "bg-brand-success/15 text-brand-success"
                          : "bg-brand-warning/15 text-brand-warning"
                      }`}
                    >
                      {ord.paymentMethod} · {ord.paymentStatus}
                    </span>
                    <div className="flex-1" />
                    <span className="text-xs text-brand-textMuted">
                      {new Date(orderItems[0].createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium text-brand-text">
                      {ord.user.name ?? ord.user.email}
                    </span>
                    {ord.user.phone && (
                      <a
                        href={`tel:${ord.user.phone}`}
                        className="inline-flex items-center gap-1 text-brand-primary hover:underline"
                      >
                        <Phone size={12} />
                        {ord.user.phone}
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-brand-textMuted flex items-start gap-1">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    {ord.deliveryAddress}
                  </p>
                  <div className="space-y-2">
                    {orderItems.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center gap-3 p-2 rounded-sm bg-brand-bg border border-brand-border"
                      >
                        {it.product?.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={it.product.imageUrl}
                            alt=""
                            className="h-12 w-12 rounded-sm object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-brand-text truncate">
                            {it.product?.name ?? it.subcategory?.name ?? "Item"}
                          </p>
                          <p className="text-xs text-brand-textMuted">
                            Qty {it.quantity} · {formatINR(Number(it.unitPrice))}{" "}
                            {Number(it.deliveryCharge) > 0 && (
                              <>
                                · delivery {formatINR(Number(it.deliveryCharge))}
                              </>
                            )}
                          </p>
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-mono text-brand-textMuted">
                          {STATUS_LABELS[it.subOrderStatus]}
                        </span>
                        <div className="flex items-center gap-1">
                          {it.subOrderStatus === "PENDING" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markPacked.mutate(it.id)}
                            >
                              <PackageCheck size={14} />
                              Pack
                            </Button>
                          )}
                          {it.subOrderStatus === "PACKED" &&
                            Number(it.deliveryCharge) > 0 && (
                              <Button
                                size="sm"
                                onClick={() => setAssignFor(it)}
                              >
                                <Truck size={14} />
                                Assign
                              </Button>
                            )}
                          {it.assignedDeliveryBoy && (
                            <span className="text-[11px] text-brand-textMuted">
                              {it.assignedDeliveryBoy.user.name ??
                                it.assignedDeliveryBoy.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!assignFor}
        onClose={() => setAssignFor(null)}
        title="Assign delivery partner"
        description="Pick a delivery boy attached to your shop."
      >
        <div className="px-6 py-5 space-y-3">
          {deliveryBoys.length === 0 ? (
            <p className="text-sm text-brand-textMuted">
              No delivery partners are attached to your shop yet. Ask an agent to assign one.
            </p>
          ) : (
            deliveryBoys.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  if (assignFor)
                    assign.mutate({ itemId: assignFor.id, deliveryBoyId: d.id });
                }}
                disabled={assign.isPending}
                className="w-full flex items-center gap-3 p-3 rounded-sm border border-brand-border bg-brand-bg hover:bg-[rgba(192,98,106,0.06)] text-left disabled:opacity-50"
              >
                <Truck size={16} className="text-brand-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-brand-text truncate">
                    {d.user.name ?? d.user.email}
                  </p>
                  <p className="text-xs text-brand-textMuted">{d.phone}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </Dialog>
    </div>
  );
}
