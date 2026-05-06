"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";

interface HeroLite {
  id: string;
  shopName: string | null;
  serviceName: string;
  user: { name: string | null; email: string };
}
interface DeliveryLite {
  id: string;
  phone: string;
  user: { name: string | null; email: string };
}

interface DayRow {
  date: string;
  orders: number;
  earned: number;
  settled: number;
  pending: number;
}

export default function PayEarningsPage() {
  const [tab, setTab] = useState<"hero" | "delivery">("hero");
  const [days, setDays] = useState(30);
  const [heroId, setHeroId] = useState("");
  const [dboyId, setDboyId] = useState("");

  const { data: heroes = [] } = useQuery<HeroLite[]>({
    queryKey: ["pay", "heroes"],
    queryFn: () => api.get("/api/pay/heroes"),
  });
  const { data: dboys = [] } = useQuery<DeliveryLite[]>({
    queryKey: ["pay", "delivery-boys"],
    queryFn: () => api.get("/api/pay/delivery-boys"),
  });

  const heroEarnings = useQuery<{ days: DayRow[] }>({
    queryKey: ["pay", "hero-earnings", heroId, days],
    queryFn: () =>
      api.get(`/api/pay/hero/${heroId}/earnings?days=${days}`),
    enabled: tab === "hero" && !!heroId,
  });
  const dboyEarnings = useQuery<{ days: DayRow[] }>({
    queryKey: ["pay", "dboy-earnings", dboyId, days],
    queryFn: () =>
      api.get(`/api/pay/delivery/${dboyId}/earnings?days=${days}`),
    enabled: tab === "delivery" && !!dboyId,
  });

  const rows =
    tab === "hero"
      ? heroEarnings.data?.days ?? []
      : dboyEarnings.data?.days ?? [];

  const totals = rows.reduce(
    (acc, r) => {
      acc.orders += r.orders;
      acc.earned += r.earned;
      acc.settled += r.settled;
      acc.pending += r.pending;
      return acc;
    },
    { orders: 0, earned: 0, settled: 0, pending: 0 }
  );

  return (
    <div className="page-enter space-y-6 max-w-5xl">
      <h1 className="font-heading text-3xl text-brand-text">Earnings</h1>

      <div className="flex gap-1 border-b border-brand-border">
        <TabBtn active={tab === "hero"} onClick={() => setTab("hero")}>
          Heroes
        </TabBtn>
        <TabBtn active={tab === "delivery"} onClick={() => setTab("delivery")}>
          Delivery boys
        </TabBtn>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {tab === "hero" ? (
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-brand-text">
                Hero
              </label>
              <select
                value={heroId}
                onChange={(e) => setHeroId(e.target.value)}
                className="w-full px-3 py-2 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
              >
                <option value="">Select a hero…</option>
                {heroes.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.shopName ?? h.serviceName} ·{" "}
                    {h.user.name ?? h.user.email}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-brand-text">
                Delivery boy
              </label>
              <select
                value={dboyId}
                onChange={(e) => setDboyId(e.target.value)}
                className="w-full px-3 py-2 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
              >
                <option value="">Select a delivery boy…</option>
                {dboys.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user.name ?? d.user.email} · {d.phone}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Range
            </label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={120}>Last 120 days</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {(tab === "hero" && !heroId) || (tab === "delivery" && !dboyId) ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-brand-textMuted">
            Select a {tab === "hero" ? "hero" : "delivery boy"} to see their
            earnings breakdown.
          </CardContent>
        </Card>
      ) : (heroEarnings.isLoading && tab === "hero") ||
        (dboyEarnings.isLoading && tab === "delivery") ? (
        <Loader2 className="animate-spin text-brand-primary" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Tile label="Orders" value={String(totals.orders)} />
            <Tile label="Total earned" value={formatINR(totals.earned)} />
            <Tile label="Settled" value={formatINR(totals.settled)} />
            <Tile label="Pending" value={formatINR(totals.pending)} highlight />
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest font-mono text-brand-primary border-b border-brand-border">
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-right">Orders</th>
                      <th className="p-3 text-right">Earned</th>
                      <th className="p-3 text-right">Settled</th>
                      <th className="p-3 text-right">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-6 text-center text-sm text-brand-textMuted"
                        >
                          No records in this range.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr
                          key={r.date}
                          className="border-b border-brand-border/60 hover:bg-brand-bg/40"
                        >
                          <td className="p-3 text-brand-text font-mono">
                            {r.date}
                          </td>
                          <td className="p-3 text-right">{r.orders}</td>
                          <td className="p-3 text-right font-mono">
                            {formatINR(r.earned)}
                          </td>
                          <td className="p-3 text-right font-mono text-brand-success">
                            {formatINR(r.settled)}
                          </td>
                          <td className="p-3 text-right font-mono text-brand-warning">
                            {formatINR(r.pending)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "text-brand-primary border-brand-primary"
          : "text-brand-textMuted border-transparent hover:text-brand-text"
      }`}
    >
      {children}
    </button>
  );
}

function Tile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="py-3">
        <p
          className={`text-[10px] uppercase tracking-widest font-mono ${
            highlight ? "text-brand-warning" : "text-brand-primary"
          }`}
        >
          {label}
        </p>
        <p className="font-heading text-xl text-brand-text mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
