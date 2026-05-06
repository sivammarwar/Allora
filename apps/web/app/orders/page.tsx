"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";
import { getSocket } from "@/lib/socket";

interface OrderRow {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: "ONLINE" | "COD";
  totalAmount: string;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    hero: { serviceName: string; shopName: string | null };
    product?: { name: string } | null;
    subcategory?: { name: string } | null;
  }>;
}

export default function UserOrdersPage() {
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery<OrderRow[]>({
    queryKey: ["user", "orders"],
    queryFn: () => api.get("/api/user/orders"),
  });

  useEffect(() => {
    const s = getSocket("/notifications");
    const h = () => qc.invalidateQueries({ queryKey: ["user", "orders"] });
    s.on("order:status_update", h);
    return () => {
      s.off("order:status_update", h);
    };
  }, [qc]);

  return (
    <div className="page-enter space-y-4">
      <h1 className="font-heading text-3xl text-brand-text">My orders</h1>
      {isLoading ? (
        <Loader2 className="animate-spin text-brand-primary" />
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-brand-textMuted">
            No orders yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`}>
              <Card className="hover:shadow-soft-lg transition-shadow">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] text-brand-textMuted">
                        #{o.id.slice(-8)}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-sm ${
                          o.status === "DELIVERED"
                            ? "bg-brand-success/15 text-brand-success"
                            : o.status === "OUT_FOR_DELIVERY"
                              ? "bg-brand-primary/15 text-brand-primary"
                              : "bg-brand-warning/15 text-brand-warning"
                        }`}
                      >
                        {o.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-sm bg-brand-bg border border-brand-border text-brand-textMuted">
                        {o.paymentMethod} · {o.paymentStatus}
                      </span>
                    </div>
                    <p className="text-sm text-brand-text mt-1 truncate">
                      {o.items
                        .map(
                          (i) =>
                            `${i.product?.name ?? i.subcategory?.name ?? "Item"} ×${i.quantity}`
                        )
                        .join(", ")}
                    </p>
                    <p className="text-xs text-brand-textMuted">
                      {new Date(o.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading text-lg text-brand-text">
                      {formatINR(Number(o.totalAmount))}
                    </p>
                  </div>
                  <ChevronRight className="text-brand-textMuted" size={18} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
