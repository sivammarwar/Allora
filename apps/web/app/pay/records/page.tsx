"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Check, CheckCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/utils";

interface RecordRow {
  id: string;
  date: string;
  amountToHero: string;
  amountToDeliveryBoy: string;
  platformFee: string;
  isSettled: boolean;
  settledAt: string | null;
  order: {
    id: string;
    paymentMethod: "ONLINE" | "COD";
    paymentStatus: string;
    status: string;
    totalAmount: string;
    user: { id: string; name: string | null; email: string };
    items: Array<{
      quantity: number;
      product?: { name: string } | null;
      subcategory?: { name: string } | null;
    }>;
  };
  hero: {
    id: string;
    shopName: string | null;
    serviceName: string;
    user: { name: string | null; email: string };
  };
  deliveryBoy: {
    id: string;
    user: { name: string | null; email: string };
  } | null;
}

interface RecordsResp {
  records: RecordRow[];
  totals: {
    amountToHero: number;
    amountToDeliveryBoy: number;
    platformFee: number;
    unsettled: number;
  };
}

interface HeroLite {
  id: string;
  shopName: string | null;
  serviceName: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function PayRecordsPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(today());
  const [heroId, setHeroId] = useState("");
  const [settled, setSettled] = useState<"all" | "true" | "false">("false");
  const [paymentMethod, setPaymentMethod] = useState<"all" | "ONLINE" | "COD">(
    "all"
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const { data: heroes = [] } = useQuery<HeroLite[]>({
    queryKey: ["pay", "heroes"],
    queryFn: () => api.get("/api/pay/heroes"),
  });

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (date) p.set("date", date);
    if (heroId) p.set("heroId", heroId);
    if (settled !== "all") p.set("settled", settled);
    if (paymentMethod !== "all") p.set("paymentMethod", paymentMethod);
    return p.toString();
  }, [date, heroId, settled, paymentMethod]);

  const { data, isLoading } = useQuery<RecordsResp>({
    queryKey: ["pay", "records", queryString],
    queryFn: () => api.get(`/api/pay/records?${queryString}`),
  });

  const settleOne = useMutation({
    mutationFn: (id: string) =>
      api.put<RecordRow>(`/api/pay/records/${id}/settle`, {}),
    onSuccess: () => {
      toast.success("Settled");
      qc.invalidateQueries({ queryKey: ["pay"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const bulkSettle = useMutation({
    mutationFn: (ids: string[]) =>
      api.put<{ ok: boolean; count: number }>("/api/pay/records/bulk-settle", {
        ids,
      }),
    onSuccess: (r) => {
      toast.success(`Settled ${r.count} record(s)`);
      setSelected({});
      qc.invalidateQueries({ queryKey: ["pay"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const records = data?.records ?? [];
  const totals = data?.totals;
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const allSelected =
    records.length > 0 &&
    records.filter((r) => !r.isSettled).every((r) => selected[r.id]);

  function toggleAll() {
    const next: Record<string, boolean> = {};
    if (!allSelected) {
      for (const r of records) if (!r.isSettled) next[r.id] = true;
    }
    setSelected(next);
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">Daily records</h1>
          <p className="text-sm text-brand-textMuted mt-1">
            Each completed order produces one record split between hero,
            delivery, and platform fee.
          </p>
        </div>
        {selectedIds.length > 0 && (
          <Button
            onClick={() => bulkSettle.mutate(selectedIds)}
            loading={bulkSettle.isPending}
          >
            <CheckCheck size={14} />
            Settle {selectedIds.length} selected
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Hero
            </label>
            <select
              value={heroId}
              onChange={(e) => setHeroId(e.target.value)}
              className="w-full px-3 py-2 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
            >
              <option value="">Any hero</option>
              {heroes.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.shopName ?? h.serviceName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Status
            </label>
            <select
              value={settled}
              onChange={(e) =>
                setSettled(e.target.value as "all" | "true" | "false")
              }
              className="w-full px-3 py-2 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
            >
              <option value="false">Pending only</option>
              <option value="true">Settled only</option>
              <option value="all">All</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Payment
            </label>
            <select
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as "all" | "ONLINE" | "COD")
              }
              className="w-full px-3 py-2 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
            >
              <option value="all">All</option>
              <option value="ONLINE">UPI / Online</option>
              <option value="COD">Cash on delivery</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <TotalsTile label="Owed to heroes" value={formatINR(totals.amountToHero)} />
          <TotalsTile
            label="Owed to delivery"
            value={formatINR(totals.amountToDeliveryBoy)}
          />
          <TotalsTile label="Platform fee" value={formatINR(totals.platformFee)} />
          <TotalsTile
            label="Unsettled total"
            value={formatINR(totals.unsettled)}
            highlight
          />
        </div>
      )}

      {isLoading ? (
        <Loader2 className="animate-spin text-brand-primary" />
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-brand-textMuted">
            No records match the current filters.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest font-mono text-brand-primary border-b border-brand-border">
                    <th className="p-3 text-left">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="p-3 text-left">Order</th>
                    <th className="p-3 text-left">Hero</th>
                    <th className="p-3 text-left">Delivery</th>
                    <th className="p-3 text-right">To hero</th>
                    <th className="p-3 text-right">To delivery</th>
                    <th className="p-3 text-right">Fee</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const itemSummary = r.order.items
                      .map(
                        (i) =>
                          `${i.product?.name ?? i.subcategory?.name ?? "Item"} ×${i.quantity}`
                      )
                      .join(", ");
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-brand-border/60 hover:bg-brand-bg/40"
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={!!selected[r.id]}
                            disabled={r.isSettled}
                            onChange={(e) =>
                              setSelected((s) => ({
                                ...s,
                                [r.id]: e.target.checked,
                              }))
                            }
                          />
                        </td>
                        <td className="p-3">
                          <p className="font-mono text-[11px] text-brand-textMuted">
                            #{r.order.id.slice(-8)}
                          </p>
                          <p className="text-brand-text">
                            {r.order.user.name ?? r.order.user.email}
                          </p>
                          <p className="text-xs text-brand-textMuted truncate max-w-[260px]">
                            {itemSummary}
                          </p>
                          <span className="inline-block mt-1 text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded-sm bg-brand-bg border border-brand-border text-brand-textMuted">
                            {r.order.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 text-brand-text">
                          {r.hero.shopName ?? r.hero.serviceName}
                        </td>
                        <td className="p-3 text-brand-text">
                          {r.deliveryBoy?.user.name ?? r.deliveryBoy?.user.email ?? "—"}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {formatINR(Number(r.amountToHero))}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {formatINR(Number(r.amountToDeliveryBoy))}
                        </td>
                        <td className="p-3 text-right font-mono text-brand-textMuted">
                          {formatINR(Number(r.platformFee))}
                        </td>
                        <td className="p-3">
                          {r.isSettled ? (
                            <span className="text-[10px] uppercase tracking-widest font-mono text-brand-success">
                              Settled
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase tracking-widest font-mono text-brand-warning">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {!r.isSettled && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => settleOne.mutate(r.id)}
                              loading={
                                settleOne.isPending &&
                                settleOne.variables === r.id
                              }
                            >
                              <Check size={12} />
                              Settle
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TotalsTile({
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
