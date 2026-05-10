"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock, XCircle, Clock, Phone, User,
  Loader2, ArrowLeft, CheckSquare2, ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

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
  bulkDiscountPercent: string;
  transportCharge: string;
  createdAt: string;
  subcategory: { id: string; name: string; category: { id: string; name: string } };
  hero?: {
    id: string;
    serviceName: string | null;
    shopName: string | null;
    phone: string;
    gender: string | null;
    user: { name: string | null };
  } | null;
}

interface BookingGroup {
  key: string;
  categoryName: string;
  scheduledDate: string;
  scheduledHour: number;
  hero: Booking["hero"];
  bookings: Booking[];
  totalFinal: number;
  groupStatus: string;
}

function groupBookings(list: Booking[]): BookingGroup[] {
  const map = new Map<string, BookingGroup>();
  for (const b of list) {
    const key = `${b.subcategory.category.id}__${b.scheduledDate}__${b.scheduledHour}__${b.hero?.id ?? "none"}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        categoryName: b.subcategory.category.name,
        scheduledDate: b.scheduledDate,
        scheduledHour: b.scheduledHour,
        hero: b.hero,
        bookings: [],
        totalFinal: 0,
        groupStatus: b.status,
      });
    }
    const g = map.get(key)!;
    const afterInd = Number(b.charge) * (1 - Number(b.discountPercent) / 100);
    const final = afterInd * (1 - Number(b.bulkDiscountPercent) / 100);
    g.bookings.push(b);
    g.totalFinal += final;
    if (["PENDING", "ACCEPTED"].includes(b.status)) g.groupStatus = b.status;
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  );
}

export default function UserBookingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"active" | "history">("active");
  const [selected, setSelected] = useState<BookingGroup | null>(null);

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["user", "service-requests"],
    queryFn: () => api.get("/api/user/service-requests"),
  });

  const activeGroups = useMemo(
    () => groupBookings(bookings.filter((b) => ["PENDING", "ACCEPTED"].includes(b.status))),
    [bookings]
  );
  const historyGroups = useMemo(
    () => groupBookings(bookings.filter((b) => ["COMPLETED", "CANCELLED"].includes(b.status))),
    [bookings]
  );

  const cancelAll = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/api/user/service-requests/${id}`)));
    },
    onSuccess: () => {
      toast.success("All bookings in this session cancelled");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["user", "service-requests"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to cancel"),
  });

  const cancellableIds = selected
    ? selected.bookings.filter((b) => ["PENDING", "ACCEPTED"].includes(b.status)).map((b) => b.id)
    : [];

  function GroupCard({ g }: { g: BookingGroup }) {
    return (
      <Card
        className="hover:shadow-soft-lg transition-shadow cursor-pointer"
        onClick={() => setSelected(g)}
      >
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-brand-text">{g.categoryName}</p>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[g.groupStatus] ?? "bg-gray-100 text-gray-500"}`}>
                  {g.groupStatus}
                </span>
              </div>
              <p className="text-xs text-brand-textMuted flex items-center gap-1 mt-0.5">
                <Clock size={11} />
                {new Date(g.scheduledDate).toLocaleDateString("en-IN", {
                  weekday: "short", day: "numeric", month: "short",
                })} at {fmtHour(g.scheduledHour)}
              </p>
              <p className="text-xs text-brand-textMuted mt-0.5">
                {g.bookings.length} service{g.bookings.length > 1 ? "s" : ""}: {g.bookings.map((b) => b.subcategory.name).join(", ")}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-heading text-lg text-brand-text">₹{g.totalFinal.toFixed(0)}</p>
            </div>
            <ChevronRight size={16} className="text-brand-textMuted shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const groups = tab === "active" ? activeGroups : historyGroups;
  const totalActive = activeGroups.reduce((s, g) => s + g.bookings.length, 0);

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
          Active
          {totalActive > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-brand-primary text-white">
              {totalActive}
            </span>
          )}
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
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-brand-textMuted">
          {tab === "active"
            ? <CalendarClock size={32} className="mx-auto mb-3 opacity-30" />
            : <CheckSquare2 size={32} className="mx-auto mb-3 opacity-30" />}
          <p className="text-sm">{tab === "active" ? "No active bookings." : "No booking history yet."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => <GroupCard key={g.key} g={g} />)}
        </div>
      )}

      {/* Booking session detail dialog */}
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.categoryName}
        description={
          selected
            ? `${new Date(selected.scheduledDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} at ${fmtHour(selected.scheduledHour)}`
            : undefined
        }
        size="sm"
      >
        {selected && (
          <div className="px-6 py-4 space-y-4">
            {/* Subcategory list — prices after individual discount only */}
            {(() => {
              const bulkPct = Number(selected.bookings[0]?.bulkDiscountPercent ?? 0);
              const subtotal = selected.bookings.reduce(
                (s, b) => s + Number(b.charge) * (1 - Number(b.discountPercent) / 100), 0
              );
              const bulkSaving = subtotal * bulkPct / 100;
              return (
                <>
                  <div className="divide-y divide-brand-border">
                    {selected.bookings.map((b) => {
                      const afterInd = Number(b.charge) * (1 - Number(b.discountPercent) / 100);
                      const indDisc = Number(b.discountPercent);
                      return (
                        <div key={b.id} className="py-3 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-brand-text">{b.subcategory.name}</p>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_BADGE[b.status]}`}>
                              {b.status}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-brand-text shrink-0">
                            ₹{afterInd.toFixed(0)}
                            {indDisc > 0 && <span className="text-[10px] text-brand-textMuted ml-1">({indDisc}% off)</span>}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bulk discount line on subtotal */}
                  {bulkPct > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-brand-border">
                      <div className="flex items-center justify-between text-sm text-brand-textMuted">
                        <span>Subtotal ({selected.bookings.length} services)</span>
                        <span>₹{subtotal.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-brand-success font-medium">Bulk discount ({selected.bookings.length} services · {bulkPct}% off)</span>
                        <span className="text-brand-success font-medium">−₹{bulkSaving.toFixed(0)}</span>
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex items-center justify-between pt-1 border-t border-brand-border">
                    <p className="text-sm font-semibold text-brand-text">Total</p>
                    <p className="font-heading text-xl text-brand-text">₹{selected.totalFinal.toFixed(0)}</p>
                  </div>
                </>
              );
            })()}

            {/* Hero info */}
            {selected.hero && (
              <div className="p-3 rounded-lg bg-brand-primary/5 border border-brand-primary/20 space-y-1 text-xs">
                <p className="font-medium text-brand-text mb-1">Your provider</p>
                <p className="flex items-center gap-1.5 text-brand-textMuted">
                  <User size={11} />
                  {selected.hero.user.name ?? selected.hero.serviceName ?? selected.hero.shopName}
                  {selected.hero.gender && <span>· {selected.hero.gender.toLowerCase()}</span>}
                </p>
                <p className="flex items-center gap-1.5 text-brand-textMuted">
                  <Phone size={11} /> {selected.hero.phone}
                </p>
              </div>
            )}

            {/* Cancel all */}
            {cancellableIds.length > 0 && (
              <Button
                variant="ghost"
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => cancelAll.mutate(cancellableIds)}
                loading={cancelAll.isPending}
              >
                <XCircle size={14} />
                Cancel all {cancellableIds.length} booking{cancellableIds.length > 1 ? "s" : ""}
              </Button>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
