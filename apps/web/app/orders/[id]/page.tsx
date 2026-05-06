"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MapPin, Phone } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import { getSocket } from "@/lib/socket";
import { LiveTrackingMap } from "@/components/maps/LiveTrackingMap";
import { ReviewWidget } from "@/components/shared/ReviewWidget";
import { UpiQrCard } from "@/components/shared/UpiQrCard";

interface OrderDetail {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: "ONLINE" | "COD";
  totalAmount: string;
  deliveryCharge: string;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    deliveryCharge: string;
    subOrderStatus: string;
    hero: {
      id: string;
      serviceName: string;
      shopName: string | null;
      locationLat: number;
      locationLng: number;
    };
    product?: { id: string; name: string; imageUrl: string | null } | null;
    subcategory?: { id: string; name: string } | null;
    assignedDeliveryBoy?: {
      id: string;
      phone: string;
      upiVpa: string | null;
      upiName: string | null;
      user: { name: string | null };
    } | null;
  }>;
}

const STATUS_FLOW = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export default function UserOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<OrderDetail>({
    queryKey: ["user", "order", id],
    queryFn: () => api.get(`/api/user/orders/${id}`),
  });

  useEffect(() => {
    const s = getSocket("/notifications");
    const h = (payload: any) => {
      if (payload?.orderId === id)
        qc.invalidateQueries({ queryKey: ["user", "order", id] });
    };
    s.on("order:status_update", h);
    return () => {
      s.off("order:status_update", h);
    };
  }, [id, qc]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-brand-primary" />
      </div>
    );
  }

  const currentIdx = Math.max(
    0,
    STATUS_FLOW.indexOf(data.status as (typeof STATUS_FLOW)[number])
  );

  return (
    <div className="page-enter max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft size={14} />
        Back
      </Button>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-brand-textMuted">
              #{data.id.slice(-8)}
            </span>
            <span className="text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-sm bg-brand-bg border border-brand-border">
              {data.paymentMethod} · {data.paymentStatus}
            </span>
            <span className="text-xs text-brand-textMuted ml-auto">
              {new Date(data.createdAt).toLocaleString("en-IN")}
            </span>
          </div>

          {/* Status timeline */}
          <ol className="flex items-center justify-between gap-1">
            {STATUS_FLOW.map((s, i) => {
              const reached = i <= currentIdx;
              return (
                <li
                  key={s}
                  className="flex-1 flex flex-col items-center text-center"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      reached
                        ? "bg-brand-primary"
                        : "bg-brand-border"
                    }`}
                  />
                  <span
                    className={`mt-1 text-[10px] uppercase tracking-widest font-mono ${
                      reached ? "text-brand-primary" : "text-brand-textMuted"
                    }`}
                  >
                    {s.replace(/_/g, " ")}
                  </span>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-brand-primary">
            Items
          </p>
          {data.items.map((i) => (
            <div
              key={i.id}
              className="flex items-center gap-3 p-2 rounded-sm bg-brand-bg border border-brand-border"
            >
              {i.product?.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={i.product.imageUrl}
                  alt=""
                  className="h-12 w-12 rounded-sm object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-brand-text truncate">
                  {i.product?.name ?? i.subcategory?.name ?? "Item"}
                </p>
                <p className="text-xs text-brand-textMuted">
                  Qty {i.quantity} · {formatINR(Number(i.unitPrice))} ·{" "}
                  {i.hero.shopName ?? i.hero.serviceName}
                </p>
                {i.assignedDeliveryBoy && (
                  <p className="text-xs text-brand-textMuted">
                    Delivery by {i.assignedDeliveryBoy.user.name ?? "partner"} ·{" "}
                    <a
                      href={`tel:${i.assignedDeliveryBoy.phone}`}
                      className="inline-flex items-center gap-1 text-brand-primary hover:underline"
                    >
                      <Phone size={11} />
                      {i.assignedDeliveryBoy.phone}
                    </a>
                  </p>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-widest font-mono text-brand-textMuted">
                {i.subOrderStatus.replace(/_/g, " ")}
              </span>
            </div>
          ))}
          {data.items.some((x) => x.subOrderStatus === "DELIVERED") && (
            <div className="pt-2 border-t border-brand-border space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-brand-primary">
                How was it?
              </p>
              {data.items
                .filter((x) => x.subOrderStatus === "DELIVERED")
                .map((x) => (
                  <ReviewWidget
                    key={x.id}
                    orderItemId={x.id}
                    label={x.product?.name ?? x.subcategory?.name ?? "this item"}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(() => {
        const active = data.items.find(
          (x) => x.subOrderStatus === "ASSIGNED_DELIVERY"
        );
        if (!active) return null;
        return (
          <Card>
            <CardContent className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-brand-primary">
                Live tracking
              </p>
              <LiveTrackingMap
                orderId={data.id}
                heroLocation={{
                  lat: active.hero.locationLat,
                  lng: active.hero.locationLng,
                }}
                dropOffLocation={{ lat: data.deliveryLat, lng: data.deliveryLng }}
              />
            </CardContent>
          </Card>
        );
      })()}

      {data.paymentMethod === "COD" &&
        data.paymentStatus !== "PAID" &&
        (() => {
          // Show the partner's UPI QR if they have one and the order is at
          // least assigned (so the customer knows whom to pay).
          const ready = data.items.find(
            (x) =>
              x.assignedDeliveryBoy?.upiVpa &&
              ["ASSIGNED_DELIVERY", "DELIVERED"].includes(x.subOrderStatus)
          );
          if (!ready || !ready.assignedDeliveryBoy?.upiVpa) return null;
          return (
            <UpiQrCard
              vpa={ready.assignedDeliveryBoy.upiVpa}
              payeeName={
                ready.assignedDeliveryBoy.upiName ??
                ready.assignedDeliveryBoy.user.name ??
                "Delivery partner"
              }
              amount={Number(data.totalAmount)}
              note={`Allora #${data.id.slice(-8)}`}
            />
          );
        })()}

      <Card>
        <CardContent className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-brand-primary">
            Delivery to
          </p>
          <p className="text-sm text-brand-text flex items-start gap-2">
            <MapPin size={14} className="mt-0.5 text-brand-textMuted shrink-0" />
            {data.deliveryAddress}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm text-brand-textMuted">
            <span>Items</span>
            <span className="font-mono">
              {formatINR(Number(data.totalAmount) - Number(data.deliveryCharge))}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-brand-textMuted">
            <span>Delivery</span>
            <span className="font-mono">
              {formatINR(Number(data.deliveryCharge))}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-brand-border pt-2">
            <span className="font-medium text-brand-text">Total</span>
            <span className="font-heading text-2xl text-brand-text">
              {formatINR(Number(data.totalAmount))}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
