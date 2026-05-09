"use client";
import { useQuery } from "@tanstack/react-query";
import { IndianRupee, TrendingUp, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

function fmtHour(h: number) {
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

interface HistoryEntry {
  id: string;
  status: string;
  charge: string;
  discountPercent: string;
  transportCharge: string;
  scheduledDate: string;
  scheduledHour: number;
  subcategory: { name: string };
}

export default function HeroEarningsPage() {
  const { data, isLoading } = useQuery<{ totalEarnings: number; history: HistoryEntry[] }>({
    queryKey: ["hero", "earnings"],
    queryFn: () => api.get("/api/hero/earnings"),
  });

  const earned = (e: HistoryEntry) => {
    const base = Number(e.charge);
    const disc = Number(e.discountPercent);
    return base * (1 - disc / 100) + Number(e.transportCharge);
  };

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Earnings</h1>
        <p className="text-brand-textMuted text-sm mt-1">Your service history and total earned.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-primary" /></div>
      ) : (
        <>
          <Card>
            <CardContent className="py-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <IndianRupee size={22} />
              </div>
              <div>
                <p className="text-xs text-brand-textMuted uppercase tracking-wide">Total Earnings</p>
                <p className="font-heading text-3xl text-brand-text">₹{data?.totalEarnings.toFixed(2) ?? "0.00"}</p>
                <p className="text-xs text-brand-textMuted">{data?.history.length ?? 0} services completed</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {(data?.history ?? []).length === 0 ? (
              <div className="text-center py-12 text-brand-textMuted">
                <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No completed services yet.</p>
              </div>
            ) : (
              data!.history.map((e) => (
                <Card key={e.id}>
                  <CardContent className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-brand-text text-sm">{e.subcategory.name}</p>
                      <p className="text-xs text-brand-textMuted">
                        {new Date(e.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {fmtHour(e.scheduledHour)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-brand-text">₹{earned(e).toFixed(0)}</p>
                      {Number(e.discountPercent) > 0 && (
                        <p className="text-[10px] text-brand-textMuted">
                          ₹{Number(e.charge).toFixed(0)} – {e.discountPercent}% off
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
