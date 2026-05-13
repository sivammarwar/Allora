"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IndianRupee, TrendingUp, Loader2, CalendarDays, Briefcase, Star,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n";

function fmtHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

interface HistoryEntry {
  id: string;
  status: string;
  charge: string;
  discountPercent: string;
  bulkDiscountPercent: string;
  transportCharge: string;
  scheduledDate: string;
  scheduledHour: number;
  subcategory: { name: string };
}

const COLORS = ["#7C3AED", "#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#14B8A6", "#F97316"];

function earnedAmt(e: HistoryEntry) {
  const base = Number(e.charge);
  const ind  = Number(e.discountPercent);
  const bulk = Number(e.bulkDiscountPercent ?? 0);
  return base * (1 - ind / 100) * (1 - bulk / 100) + Number(e.transportCharge);
}

export default function HeroEarningsPage() {
  const t = useT();
  const { data, isLoading } = useQuery<{ totalEarnings: number; history: HistoryEntry[] }>({
    queryKey: ["hero", "earnings"],
    queryFn: () => api.get("/api/hero/earnings"),
  });

  const history = data?.history ?? [];

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());

    let month = 0, week = 0;
    for (const e of history) {
      const d = new Date(e.scheduledDate);
      const amt = earnedAmt(e);
      if (d >= startOfMonth) month += amt;
      if (d >= startOfWeek)  week  += amt;
    }
    const avg = history.length ? (data?.totalEarnings ?? 0) / history.length : 0;
    return { month, week, avg };
  }, [history, data?.totalEarnings]);

  // ── Last 7 days bar data ───────────────────────────────────────────────────
  const barData = useMemo(() => {
    const days: { label: string; date: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      days.push({
        label: d.toLocaleDateString("en-IN", { weekday: "short" }),
        date: iso,
        amount: 0,
      });
    }
    for (const e of history) {
      const iso = new Date(e.scheduledDate).toISOString().split("T")[0];
      const day = days.find((d) => d.date === iso);
      if (day) day.amount += earnedAmt(e);
    }
    return days;
  }, [history]);

  // ── By service donut data ──────────────────────────────────────────────────
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of history) {
      const key = e.subcategory.name;
      map.set(key, (map.get(key) ?? 0) + earnedAmt(e));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [history]);

  const hasData = history.length > 0;

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">{t("earnings.title")}</h1>
        <p className="text-brand-textMuted text-sm mt-1">{t("earnings.subtitle")}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-primary" /></div>
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="col-span-2">
              <CardContent className="py-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                  <IndianRupee size={22} />
                </div>
                <div>
                  <p className="text-xs text-brand-textMuted uppercase tracking-wide">{t("earnings.total")}</p>
                  <p className="font-heading text-3xl text-brand-text">₹{(data?.totalEarnings ?? 0).toFixed(0)}</p>
                  <p className="text-xs text-brand-textMuted">{t("earnings.servicesCompleted", { n: history.length })}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays size={14} className="text-brand-primary" />
                  <p className="text-[11px] text-brand-textMuted uppercase tracking-wide">{t("earnings.thisMonth")}</p>
                </div>
                <p className="font-heading text-xl text-brand-text">₹{stats.month.toFixed(0)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={14} className="text-brand-success" />
                  <p className="text-[11px] text-brand-textMuted uppercase tracking-wide">{t("earnings.thisWeek")}</p>
                </div>
                <p className="font-heading text-xl text-brand-text">₹{stats.week.toFixed(0)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <Star size={14} className="text-amber-500" />
                  <p className="text-[11px] text-brand-textMuted uppercase tracking-wide">{t("earnings.avgJob")}</p>
                </div>
                <p className="font-heading text-xl text-brand-text">₹{stats.avg.toFixed(0)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase size={14} className="text-blue-500" />
                  <p className="text-[11px] text-brand-textMuted uppercase tracking-wide">{t("earnings.services")}</p>
                </div>
                <p className="font-heading text-xl text-brand-text">{history.length}</p>
              </CardContent>
            </Card>
          </div>

          {!hasData ? (
            <div className="text-center py-16 text-brand-textMuted">
              <TrendingUp size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">{t("earnings.noData")}</p>
              <p className="text-xs mt-1">{t("earnings.noDataHint")}</p>
            </div>
          ) : (
            <>
              {/* ── Last 7 days bar chart ── */}
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-sm font-semibold text-brand-text mb-4">{t("earnings.last7Days")}</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={barData} barSize={28}>
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        formatter={(v) => [`₹${Number(v).toFixed(0)}`, "Earned"]}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                        cursor={{ fill: "rgba(124,58,237,0.06)" }}
                      />
                      <Bar dataKey="amount" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* ── Earnings by service donut ── */}
              {pieData.length > 0 && (
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <p className="text-sm font-semibold text-brand-text mb-4">{t("earnings.byService")}</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => [`₹${Number(v)}`, "Earned"]}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(value) => <span style={{ fontSize: 11, color: "#6B7280" }}>{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* ── Transaction history ── */}
              <div>
                <p className="text-sm font-semibold text-brand-text mb-3">{t("earnings.recentTx")}</p>
                <div className="space-y-2">
                  {history.map((e) => (
                    <Card key={e.id}>
                      <CardContent className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0">
                            <IndianRupee size={13} className="text-brand-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-brand-text text-sm">{e.subcategory.name}</p>
                            <p className="text-xs text-brand-textMuted">
                              {new Date(e.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {fmtHour(e.scheduledHour)}
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold text-brand-success shrink-0">+₹{earnedAmt(e).toFixed(0)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
