"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit2, Check, X, Search, Loader2, BadgeDollarSign,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SubcategoryOption {
  id: string;
  name: string;
  category: { id: string; name: string; type: "PRODUCT" | "SERVICE" };
}

interface PriceControlEntry {
  id: string;
  subcategoryId: string;
  baseServiceCharge: string;
  transportChargePerKm: string;
  discountPercent: string;
  subcategory: SubcategoryOption;
}

function discountedPrice(base: number, discountPct: number) {
  return base * (1 - Math.min(100, Math.max(0, discountPct)) / 100);
}

function EditRow({
  entry,
  onDone,
}: {
  entry: PriceControlEntry;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [base, setBase] = useState(Number(entry.baseServiceCharge));
  const [perKm, setPerKm] = useState(Number(entry.transportChargePerKm));
  const [discount, setDiscount] = useState(Number(entry.discountPercent));

  const finalPrice = discountedPrice(base, discount);

  const update = useMutation({
    mutationFn: () =>
      api.put(`/api/agent/price-control/${entry.id}`, {
        baseServiceCharge: base,
        transportChargePerKm: perKm,
        discountPercent: discount,
      }),
    onSuccess: () => {
      toast.success("Pricing updated");
      qc.invalidateQueries({ queryKey: ["agent", "price-control"] });
      onDone();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-brand-border">
      <div className="flex-1 min-w-[120px]">
        <Input
          label="Base service charge (₹)"
          type="number"
          min={0}
          step={0.01}
          value={base}
          onChange={(e) => setBase(Math.max(0, Number(e.target.value) || 0))}
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <Input
          label="Transport per km (₹)"
          type="number"
          min={0}
          step={0.01}
          value={perKm}
          onChange={(e) => setPerKm(Math.max(0, Number(e.target.value) || 0))}
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <Input
          label="Discount (%)"
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={discount}
          onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
        />
      </div>
      {discount > 0 && (
        <div className="w-full text-sm text-brand-textMuted">
          Final price: <span className="line-through">{formatINR(base)}</span>{" "}
          <span className="font-semibold text-brand-success">{formatINR(finalPrice)}</span>
          {" "}({discount}% off)
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => update.mutate()} loading={update.isPending}>
          <Check size={14} /> Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}

export default function PriceControlPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [subSearch, setSubSearch] = useState("");
  const [selectedSub, setSelectedSub] = useState<SubcategoryOption | null>(null);
  const [base, setBase] = useState(0);
  const [perKm, setPerKm] = useState(0);
  const [discount, setDiscount] = useState(0);

  const { data: entries = [], isLoading } = useQuery<PriceControlEntry[]>({
    queryKey: ["agent", "price-control"],
    queryFn: () => api.get("/api/agent/price-control"),
  });

  const { data: allSubcategories = [] } = useQuery<SubcategoryOption[]>({
    queryKey: ["subcategories", "service-all"],
    queryFn: async () => {
      const rows = await api.get<{
        id: string;
        name: string;
        categoryId: string;
        categoryName: string;
        categoryType: string;
      }[]>("/api/user/subcategories");
      return rows
        .filter((s) => s.categoryType === "SERVICE")
        .map((s) => ({
          id: s.id,
          name: s.name,
          category: { id: s.categoryId, name: s.categoryName, type: "SERVICE" as const },
        }));
    },
    enabled: addOpen,
  });

  const controlledIds = new Set(entries.map((e) => e.subcategoryId));
  const available = allSubcategories.filter(
    (s) =>
      !controlledIds.has(s.id) &&
      (s.name.toLowerCase().includes(subSearch.toLowerCase()) ||
        s.category.name.toLowerCase().includes(subSearch.toLowerCase()))
  );

  const addFinalPrice = discountedPrice(base, discount);

  const add = useMutation({
    mutationFn: () =>
      api.post("/api/agent/price-control", {
        subcategoryId: selectedSub!.id,
        baseServiceCharge: base,
        transportChargePerKm: perKm,
        discountPercent: discount,
      }),
    onSuccess: () => {
      toast.success(`Price control added for ${selectedSub!.name}`);
      qc.invalidateQueries({ queryKey: ["agent", "price-control"] });
      setAddOpen(false);
      setSelectedSub(null);
      setBase(0);
      setPerKm(0);
      setDiscount(0);
      setSubSearch("");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/agent/price-control/${id}`),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["agent", "price-control"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">Price Control</h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Set base service charge and transport rate for service subcategories. Verified heroes in
            your area will use these prices.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add subcategory
        </Button>
      </div>

      {/* Add subcategory panel */}
      {addOpen && (
        <Card>
          <CardContent className="space-y-4 py-5">
            <h2 className="font-heading text-lg text-brand-text">Add service subcategory</h2>

            {/* Subcategory search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted" />
              <input
                value={subSearch}
                onChange={(e) => { setSubSearch(e.target.value); setSelectedSub(null); }}
                placeholder="Search subcategory name or category…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-brand-border rounded-sm bg-brand-bg text-brand-text focus:outline-none focus:border-brand-primary"
              />
            </div>

            {selectedSub ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-sm bg-brand-primary/10 border border-brand-primary/20 text-sm">
                <span className="font-medium text-brand-text">
                  {selectedSub.category.name} › {selectedSub.name}
                </span>
                <button onClick={() => setSelectedSub(null)} className="text-brand-textMuted hover:text-brand-text">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="border border-brand-border rounded-sm max-h-44 overflow-y-auto divide-y divide-brand-border">
                {available.length === 0 && (
                  <p className="text-sm text-brand-textMuted px-3 py-3 text-center">
                    {allSubcategories.length === 0 ? "Loading…" : "No more subcategories to add"}
                  </p>
                )}
                {available.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSub(s)}
                    className="w-full text-left px-3 py-2 hover:bg-brand-bg transition-colors"
                  >
                    <p className="text-sm font-medium text-brand-text">{s.name}</p>
                    <p className="text-xs text-brand-textMuted">{s.category.name}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Base service charge (₹)"
                type="number"
                min={0}
                step={0.01}
                value={base}
                onChange={(e) => setBase(Math.max(0, Number(e.target.value) || 0))}
              />
              <Input
                label="Transport per km (₹)"
                type="number"
                min={0}
                step={0.01}
                value={perKm}
                onChange={(e) => setPerKm(Math.max(0, Number(e.target.value) || 0))}
              />
              <Input
                label="Discount (%)"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={discount}
                onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              />
            </div>
            {discount > 0 && base > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-brand-success/10 border border-brand-success/20 text-sm">
                <span className="text-brand-textMuted">Final price:</span>
                <span className="line-through text-brand-textMuted">{formatINR(base)}</span>
                <span className="font-semibold text-brand-success">{formatINR(addFinalPrice)}</span>
                <span className="text-xs text-brand-success">({discount}% off)</span>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setAddOpen(false); setSelectedSub(null); setSubSearch(""); }}>
                Cancel
              </Button>
              <Button
                onClick={() => add.mutate()}
                loading={add.isPending}
                disabled={!selectedSub}
              >
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-primary" size={28} />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-bg text-brand-textMuted">
              <BadgeDollarSign size={24} />
            </div>
            <p className="text-sm text-brand-textMuted">
              No subcategories under price control yet. Add one to start controlling pricing for
              your verified heroes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-heading text-base text-brand-text">{entry.subcategory.name}</h3>
                    <p className="text-xs text-brand-textMuted">{entry.subcategory.category.name}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                      className="p-1.5 rounded-sm hover:bg-brand-bg text-brand-textMuted hover:text-brand-text transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => remove.mutate(entry.id)}
                      className="p-1.5 rounded-sm hover:bg-red-50 text-brand-textMuted hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {editingId === entry.id ? (
                  <EditRow entry={entry} onDone={() => setEditingId(null)} />
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-sm bg-brand-bg border border-brand-border px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-brand-textMuted mb-0.5">Base service charge</p>
                      {Number(entry.discountPercent) > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="line-through text-brand-textMuted text-xs">{formatINR(Number(entry.baseServiceCharge))}</span>
                          <span className="font-semibold text-brand-success">{formatINR(discountedPrice(Number(entry.baseServiceCharge), Number(entry.discountPercent)))}</span>
                          <span className="text-[10px] text-brand-success">({Number(entry.discountPercent)}% off)</span>
                        </div>
                      ) : (
                        <p className="font-semibold text-brand-text">{formatINR(Number(entry.baseServiceCharge))}</p>
                      )}
                    </div>
                    <div className="rounded-sm bg-brand-bg border border-brand-border px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-brand-textMuted mb-0.5">Transport per km</p>
                      <p className="font-semibold text-brand-text">{formatINR(Number(entry.transportChargePerKm))}/km</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
