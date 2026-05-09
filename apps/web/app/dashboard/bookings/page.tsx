"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock, CheckCircle2, XCircle, Clock, Phone, User,
  Loader2, ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function fmtHour(h: number) {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

interface Booking {
  id: string;
  status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED";
  scheduledDate: string;
  scheduledHour: number;
  charge: string;
  discountPercent: string;
  transportCharge: string;
  createdAt: string;
  subcategory: { id: string; name: string; category: { name: string } };
  hero?: {
    id: string;
    serviceName: string | null;
    shopName: string | null;
    phone: string;
    gender: string | null;
    user: { name: string | null };
  } | null;
}

export default function UserBookingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"active" | "history">("active");

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["user", "service-requests"],
    queryFn: () => api.get("/api/user/service-requests"),
  });

  const active = bookings.filter((b) => ["PENDING", "ACCEPTED"].includes(b.status));
  const history = bookings.filter((b) => ["COMPLETED", "CANCELLED"].includes(b.status));

  const cancel = useMutation({
    mutationFn: (id: string) => api.delete(`/api/user/service-requests/${id}`),
    onSuccess: () => {
      toast.success("Booking cancelled");
      qc.invalidateQueries({ queryKey: ["user", "service-requests"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  function BookingCard({ b }: { b: Booking }) {
    const base = Number(b.charge);
    const disc = Number(b.discountPercent);
    const final = base * (1 - disc / 100);

    return (
      <Card key={b.id}>
        <CardContent className="py-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-brand-text">
                {b.subcategory.category.name} › {b.subcategory.name}
              </p>
              <p className="text-xs text-brand-textMuted flex items-center gap-1 mt-0.5">
                <Clock size={11} />
                {new Date(b.scheduledDate).toLocaleDateString("en-IN", {
                  weekday: "short", day: "numeric", month: "short",
                })} at {fmtHour(b.scheduledHour)}
              </p>
            </div>
            <div className="text-right shrink-0 space-y-1">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[b.status]}`}>
                {b.status}
              </span>
              <p className="text-sm font-semibold text-brand-text">
                ₹{final.toFixed(0)}
                {disc > 0 && <span className="text-[10px] text-brand-textMuted ml-1">({disc}% off)</span>}
              </p>
            </div>
          </div>

          {b.hero && (
            <div className="p-3 rounded-lg bg-brand-primary/5 border border-brand-primary/20 space-y-1 text-xs">
              <p className="font-medium text-brand-text mb-1">Your provider</p>
              <p className="flex items-center gap-1.5 text-brand-textMuted">
                <User size={11} /> {b.hero.user.name ?? b.hero.serviceName ?? b.hero.shopName}
                {b.hero.gender && <span>· {b.hero.gender.toLowerCase()}</span>}
              </p>
              <p className="flex items-center gap-1.5 text-brand-textMuted">
                <Phone size={11} /> {b.hero.phone}
              </p>
            </div>
          )}

          {["PENDING", "ACCEPTED"].includes(b.status) && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => cancel.mutate(b.id)}
              loading={cancel.isPending}
            >
              <XCircle size={13} /> Cancel booking
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="page-enter space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={14} />
        </Button>
        <div>
          <h1 className="font-heading text-3xl text-brand-text">My Bookings</h1>
          <p className="text-brand-textMuted text-sm mt-0.5">Track your service requests.</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-brand-border">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "active" ? "border-brand-primary text-brand-primary" : "border-transparent text-brand-textMuted hover:text-brand-text"
          }`}
        >
          Active {active.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-brand-primary text-white">{active.length}</span>}
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "history" ? "border-brand-primary text-brand-primary" : "border-transparent text-brand-textMuted hover:text-brand-text"
          }`}
        >
          History
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-primary" />
        </div>
      ) : tab === "active" ? (
        active.length === 0 ? (
          <div className="text-center py-12 text-brand-textMuted">
            <CalendarClock size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No active bookings.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((b) => <BookingCard key={b.id} b={b} />)}
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div className="text-center py-12 text-brand-textMuted">
            <CheckCircle2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No booking history yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((b) => <BookingCard key={b.id} b={b} />)}
          </div>
        )
      )}
    </div>
  );
}
