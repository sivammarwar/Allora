"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, MapPin, Phone, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSocket } from "@/lib/socket";

interface DeliveryItem {
  id: string;
  orderId: string;
  unitPrice: string;
  quantity: number;
  deliveryCharge: string;
  subOrderStatus: "ASSIGNED_DELIVERY" | "DELIVERED" | string;
  createdAt: string;
  order: {
    paymentMethod: "ONLINE" | "COD";
    paymentStatus: string;
    deliveryAddress: string;
    deliveryLat: number;
    deliveryLng: number;
    user: { name: string | null; phone: string | null; email: string };
  };
  hero: {
    id: string;
    shopName: string | null;
    serviceName: string;
    phone: string;
    address: string;
    locationLat: number;
    locationLng: number;
  };
  product: { name: string; imageUrl: string | null } | null;
  subcategory: { name: string } | null;
}

export default function DeliveryOrdersPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<DeliveryItem[]>({
    queryKey: ["delivery", "orders"],
    queryFn: () => api.get("/api/delivery/orders"),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const s = getSocket("/notifications");
    const h = () => qc.invalidateQueries({ queryKey: ["delivery", "orders"] });
    s.on("delivery:assigned", h);
    return () => {
      s.off("delivery:assigned", h);
    };
  }, [qc]);

  // Live location reporting for any active deliveries
  useEffect(() => {
    if (!items.some((i) => i.subOrderStatus === "ASSIGNED_DELIVERY")) return;
    const tracking = getSocket("/tracking");
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const active = items.filter((i) => i.subOrderStatus === "ASSIGNED_DELIVERY");
        for (const i of active) {
          tracking.emit("delivery:location", {
            orderId: i.orderId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        }
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 8000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [items]);

  const markDelivered = useMutation({
    mutationFn: (id: string) => api.put(`/api/delivery/orders/${id}/delivered`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery", "orders"] });
      toast.success("Marked as delivered");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const active = items.filter((i) => i.subOrderStatus !== "DELIVERED");
  const past = items.filter((i) => i.subOrderStatus === "DELIVERED");

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Active orders</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Pickups and drop-offs assigned to you.
        </p>
      </div>

      {isLoading ? (
        <Loader2 className="animate-spin text-brand-primary" />
      ) : active.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-brand-textMuted text-sm">
            No active deliveries right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {active.map((i) => (
            <Card key={i.id}>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-[11px] text-brand-textMuted">
                    #{i.orderId.slice(-8)}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-sm ${
                      i.order.paymentMethod === "COD"
                        ? "bg-brand-warning/15 text-brand-warning"
                        : "bg-brand-success/15 text-brand-success"
                    }`}
                  >
                    {i.order.paymentMethod === "COD"
                      ? `COLLECT ${formatINR(Number(i.unitPrice) * i.quantity + Number(i.deliveryCharge))}`
                      : "ONLINE PAID"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-brand-primary mb-1">
                      Pickup
                    </p>
                    <p className="text-brand-text">
                      {i.hero.shopName ?? i.hero.serviceName}
                    </p>
                    <p className="text-brand-textMuted text-xs">{i.hero.address}</p>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${i.hero.locationLat},${i.hero.locationLng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-brand-primary text-xs hover:underline"
                    >
                      <MapPin size={12} />
                      Navigate
                    </a>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-brand-primary mb-1">
                      Drop-off
                    </p>
                    <p className="text-brand-text">
                      {i.order.user.name ?? i.order.user.email}
                    </p>
                    <p className="text-brand-textMuted text-xs">
                      {i.order.deliveryAddress}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${i.order.deliveryLat},${i.order.deliveryLng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-primary text-xs hover:underline"
                      >
                        <MapPin size={12} />
                        Navigate
                      </a>
                      {i.order.user.phone && (
                        <a
                          href={`tel:${i.order.user.phone}`}
                          className="inline-flex items-center gap-1 text-brand-primary text-xs hover:underline"
                        >
                          <Phone size={12} />
                          {i.order.user.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-sm bg-brand-bg border border-brand-border">
                  {i.product?.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={i.product.imageUrl}
                      alt=""
                      className="h-10 w-10 rounded-sm object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-brand-text truncate">
                      {i.product?.name ?? i.subcategory?.name}
                    </p>
                    <p className="text-xs text-brand-textMuted">Qty {i.quantity}</p>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    onClick={() => markDelivered.mutate(i.id)}
                    loading={markDelivered.isPending}
                  >
                    <CheckCircle2 size={14} />
                    Mark delivered
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <details>
          <summary className="text-sm text-brand-textMuted cursor-pointer">
            Past deliveries ({past.length})
          </summary>
          <div className="mt-3 space-y-2">
            {past.slice(0, 10).map((i) => (
              <Card key={i.id}>
                <CardContent className="py-3 text-sm flex items-center gap-3">
                  <span className="font-mono text-[11px] text-brand-textMuted">
                    #{i.orderId.slice(-8)}
                  </span>
                  <span className="text-brand-textMuted">
                    {i.product?.name ?? i.subcategory?.name}
                  </span>
                  <span className="text-brand-success ml-auto text-xs">DELIVERED</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
