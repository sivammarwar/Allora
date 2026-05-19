"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Booking {
  id: string;
  status: string;
  charge: string;
  transportCharge: string;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  hero: {
    id: string;
    shopName: string | null;
    serviceName: string | null;
    phone: string;
    user: { name: string | null; email: string };
  };
  subcategory: { id: string; name: string };
  order: {
    id: string;
    totalAmount: string;
    paymentStatus: string;
    user: { id: string; name: string | null; email: string };
  };
}

type Tab = "COMPLETED" | "CANCELLED";

export default function AgentBookingsPage() {
  const [tab, setTab] = useState<Tab>("COMPLETED");

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["agent", "booking-history", tab],
    queryFn: () => api.get(`/api/agent/booking-history?status=${tab}`),
  });

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl text-brand-text">Booking History</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Service bookings from all your verified heroes
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === "COMPLETED" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("COMPLETED")}
          className="gap-1.5"
        >
          <CheckCircle2 size={14} />
          Service Successful
        </Button>
        <Button
          variant={tab === "CANCELLED" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("CANCELLED")}
          className="gap-1.5"
        >
          <XCircle size={14} />
          Service Canceled
        </Button>
      </div>

      {isLoading ? (
        <p className="text-brand-textMuted text-sm">Loading…</p>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-brand-textMuted text-sm">
            {tab === "COMPLETED"
              ? "No completed bookings yet."
              : "No canceled bookings."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const heroName = b.hero.shopName ?? b.hero.serviceName ?? b.hero.user.name ?? "Hero";
            const customerName = b.order.user.name ?? b.order.user.email;
            const charge = Number(b.charge) + Number(b.transportCharge);
            const date = new Date(b.completedAt ?? b.createdAt);
            const isCompleted = b.status === "COMPLETED";

            return (
              <Card key={b.id}>
                <CardContent className="flex items-start gap-4 py-4">
                  <div
                    className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${
                      isCompleted ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm text-brand-text font-semibold">
                      {b.subcategory.name}
                    </p>
                    <p className="text-xs text-brand-textMuted mt-0.5">
                      Hero: {heroName}
                    </p>
                    <p className="text-xs text-brand-textMuted">
                      Customer: {customerName}
                    </p>
                    <p className="text-xs text-brand-textMuted mt-1">
                      {date.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      ·{" "}
                      {date.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-lg font-bold ${
                        isCompleted ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      ₹{charge.toFixed(0)}
                    </p>
                    <span
                      className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        b.order.paymentStatus === "PAID"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {b.order.paymentStatus}
                    </span>
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
