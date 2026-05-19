"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit2, Check, X, Search, Loader2, Truck, Tag, Clock,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CategoryOption {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
}

interface CategoryConfig {
  id: string;
  categoryId: string;
  transportChargePerKm: string;
  bulkDiscount2: string;
  bulkDiscount3: string;
  bulkDiscount4Plus: string;
  slotStartHour: number;
  slotEndHour: number;
  category: CategoryOption;
}

function EditRow({ cfg, onDone }: { cfg: CategoryConfig; onDone: () => void }) {
  const qc = useQueryClient();
  const [transport, setTransport] = useState(Number(cfg.transportChargePerKm));
  const [d2, setD2] = useState(Number(cfg.bulkDiscount2));
  const [d3, setD3] = useState(Number(cfg.bulkDiscount3));
  const [d4, setD4] = useState(Number(cfg.bulkDiscount4Plus));
  const [startHr, setStartHr] = useState(cfg.slotStartHour ?? 6);
  const [endHr, setEndHr] = useState(cfg.slotEndHour ?? 20);

  const save = useMutation({
    mutationFn: () =>
      api.post("/api/agent/category-config", {
        categoryId: cfg.categoryId,
        transportChargePerKm: transport,
        bulkDiscount2: d2,
        bulkDiscount3: d3,
        bulkDiscount4Plus: d4,
        slotStartHour: startHr,
        slotEndHour: endHr,
      }),
    onSuccess: () => {
      toast.success("Category config saved");
      qc.invalidateQueries({ queryKey: ["agent", "category-config"] });
      onDone();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="space-y-3 pt-2 border-t border-brand-border">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Transport per km (₹)"
          type="number" min={0} step={0.01} value={transport}
          onChange={(e) => setTransport(Math.max(0, Number(e.target.value) || 0))}
        />
        <div />
      </div>
      <p className="text-xs font-medium text-brand-text">Slot Hours</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-brand-text">Start hour</label>
          <select value={startHr} onChange={(e) => setStartHr(Number(e.target.value))} className="w-full p-2.5 rounded-sm border border-brand-border bg-brand-surface text-sm text-brand-text focus:outline-none focus:border-brand-primary">
            {Array.from({ length: 24 }, (_, i) => (<option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-brand-text">End hour</label>
          <select value={endHr} onChange={(e) => setEndHr(Number(e.target.value))} className="w-full p-2.5 rounded-sm border border-brand-border bg-brand-surface text-sm text-brand-text focus:outline-none focus:border-brand-primary">
            {Array.from({ length: 24 }, (_, i) => (<option key={i + 1} value={i + 1}>{(i + 1).toString().padStart(2, "0")}:00</option>))}
          </select>
        </div>
      </div>
      <p className="text-xs font-medium text-brand-text">Bulk booking extra discounts</p>
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="2 services (%)"
          type="number" min={0} max={100} step={0.01} value={d2}
          onChange={(e) => setD2(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
        />
        <Input
          label="3 services (%)"
          type="number" min={0} max={100} step={0.01} value={d3}
          onChange={(e) => setD3(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
        />
        <Input
          label="4+ services (%)"
          type="number" min={0} max={100} step={0.01} value={d4}
          onChange={(e) => setD4(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
        />
      </div>
      {(d2 > 0 || d3 > 0 || d4 > 0) && (
        <div className="flex flex-wrap gap-2 text-xs text-brand-textMuted">
          {d2 > 0 && <span className="bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full">Book 2 → extra {d2}% off</span>}
          {d3 > 0 && <span className="bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full">Book 3 → extra {d3}% off</span>}
          {d4 > 0 && <span className="bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full">Book 4+ → extra {d4}% off</span>}
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => save.mutate()} loading={save.isPending}>
          <Check size={14} /> Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}><X size={14} /></Button>
      </div>
    </div>
  );
}

export default function CategoryConfigPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<CategoryOption | null>(null);
  const [transport, setTransport] = useState(0);
  const [d2, setD2] = useState(0);
  const [d3, setD3] = useState(0);
  const [d4, setD4] = useState(0);
  const [addStartHr, setAddStartHr] = useState(6);
  const [addEndHr, setAddEndHr] = useState(20);

  const { data: configs = [], isLoading } = useQuery<CategoryConfig[]>({
    queryKey: ["agent", "category-config"],
    queryFn: () => api.get("/api/agent/category-config"),
  });

  const { data: allCategories = [] } = useQuery<CategoryOption[]>({
    queryKey: ["categories", "service-all"],
    queryFn: async () => {
      const rows = await api.get<{ id: string; name: string; type: string }[]>("/api/user/categories");
      return rows.filter((c) => c.type === "SERVICE").map((c) => ({ id: c.id, name: c.name, type: "SERVICE" as const }));
    },
    enabled: addOpen,
  });

  const configuredIds = new Set(configs.map((c) => c.categoryId));
  const available = allCategories.filter(
    (c) =>
      !configuredIds.has(c.id) &&
      c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const add = useMutation({
    mutationFn: () =>
      api.post("/api/agent/category-config", {
        categoryId: selectedCat!.id,
        transportChargePerKm: transport,
        bulkDiscount2: d2,
        bulkDiscount3: d3,
        bulkDiscount4Plus: d4,
        slotStartHour: addStartHr,
        slotEndHour: addEndHr,
      }),
    onSuccess: () => {
      toast.success(`Category config added for ${selectedCat!.name}`);
      qc.invalidateQueries({ queryKey: ["agent", "category-config"] });
      setAddOpen(false);
      setSelectedCat(null);
      setTransport(0); setD2(0); setD3(0); setD4(0); setCatSearch("");
      setAddStartHr(6); setAddEndHr(20);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: (categoryId: string) => api.delete(`/api/agent/category-config/${categoryId}`),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["agent", "category-config"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">Category Config</h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Set transport charge and bulk-booking discounts per service category.
            Bulk discounts are applied on top of individual subcategory discounts.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add category
        </Button>
      </div>

      {addOpen && (
        <Card>
          <CardContent className="space-y-4 py-5">
            <h2 className="font-heading text-lg text-brand-text">Configure category</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted" />
              <input
                value={catSearch}
                onChange={(e) => { setCatSearch(e.target.value); setSelectedCat(null); }}
                placeholder="Search category…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-brand-border rounded-sm bg-brand-bg text-brand-text focus:outline-none focus:border-brand-primary"
              />
            </div>

            {selectedCat ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-sm bg-brand-primary/10 border border-brand-primary/20 text-sm">
                <span className="font-medium text-brand-text">{selectedCat.name}</span>
                <button onClick={() => setSelectedCat(null)} className="text-brand-textMuted hover:text-brand-text">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="border border-brand-border rounded-sm max-h-44 overflow-y-auto divide-y divide-brand-border">
                {available.length === 0 && (
                  <p className="text-sm text-brand-textMuted px-3 py-3 text-center">
                    {allCategories.length === 0 ? "Loading…" : "No more categories to configure"}
                  </p>
                )}
                {available.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCat(c)}
                    className="w-full text-left px-3 py-2 hover:bg-brand-bg transition-colors"
                  >
                    <p className="text-sm font-medium text-brand-text">{c.name}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Transport per km (₹)"
                type="number" min={0} step={0.01} value={transport}
                onChange={(e) => setTransport(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>

            <p className="text-xs font-medium text-brand-text mt-1">Slot Hours</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-text">Start hour</label>
                <select value={addStartHr} onChange={(e) => setAddStartHr(Number(e.target.value))} className="w-full p-2.5 rounded-sm border border-brand-border bg-brand-surface text-sm text-brand-text focus:outline-none focus:border-brand-primary">
                  {Array.from({ length: 24 }, (_, i) => (<option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-text">End hour</label>
                <select value={addEndHr} onChange={(e) => setAddEndHr(Number(e.target.value))} className="w-full p-2.5 rounded-sm border border-brand-border bg-brand-surface text-sm text-brand-text focus:outline-none focus:border-brand-primary">
                  {Array.from({ length: 24 }, (_, i) => (<option key={i + 1} value={i + 1}>{(i + 1).toString().padStart(2, "0")}:00</option>))}
                </select>
              </div>
            </div>

            <p className="text-xs font-medium text-brand-text mt-1">Bulk booking extra discounts (applied on top of individual discounts)</p>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="2 services (%)"
                type="number" min={0} max={100} step={0.01} value={d2}
                onChange={(e) => setD2(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              />
              <Input
                label="3 services (%)"
                type="number" min={0} max={100} step={0.01} value={d3}
                onChange={(e) => setD3(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              />
              <Input
                label="4+ services (%)"
                type="number" min={0} max={100} step={0.01} value={d4}
                onChange={(e) => setD4(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setAddOpen(false); setSelectedCat(null); setCatSearch(""); }}>
                Cancel
              </Button>
              <Button onClick={() => add.mutate()} loading={add.isPending} disabled={!selectedCat}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-brand-primary" size={28} />
        </div>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-bg text-brand-textMuted">
              <Truck size={24} />
            </div>
            <p className="text-sm text-brand-textMuted">
              No category configs yet. Add one to set transport charges and bulk discounts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map((cfg) => (
            <Card key={cfg.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-base text-brand-text">{cfg.category.name}</h3>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingId(editingId === cfg.id ? null : cfg.id)}
                      className="p-1.5 rounded-sm hover:bg-brand-bg text-brand-textMuted hover:text-brand-text transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => remove.mutate(cfg.categoryId)}
                      className="p-1.5 rounded-sm hover:bg-red-50 text-brand-textMuted hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {editingId === cfg.id ? (
                  <EditRow cfg={cfg} onDone={() => setEditingId(null)} />
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 rounded-sm bg-brand-bg border border-brand-border px-3 py-2">
                      <Truck size={13} className="text-brand-textMuted flex-shrink-0" />
                      <span className="text-[10px] uppercase tracking-wide text-brand-textMuted">Transport:</span>
                      <span className="font-semibold text-brand-text">{formatINR(Number(cfg.transportChargePerKm))}/km</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-sm bg-brand-bg border border-brand-border px-3 py-2">
                      <Clock size={13} className="text-brand-textMuted flex-shrink-0" />
                      <span className="text-[10px] uppercase tracking-wide text-brand-textMuted">Slot Hours:</span>
                      <span className="font-semibold text-brand-text">{(cfg.slotStartHour ?? 6).toString().padStart(2, "0")}:00 – {(cfg.slotEndHour ?? 20).toString().padStart(2, "0")}:00</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-sm bg-brand-bg border border-brand-border px-3 py-2">
                      <Tag size={13} className="text-brand-textMuted flex-shrink-0" />
                      <span className="text-[10px] uppercase tracking-wide text-brand-textMuted">Bulk discounts:</span>
                      <div className="flex flex-wrap gap-1.5 ml-1">
                        {Number(cfg.bulkDiscount2) > 0 && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">2→+{cfg.bulkDiscount2}%</span>
                        )}
                        {Number(cfg.bulkDiscount3) > 0 && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">3→+{cfg.bulkDiscount3}%</span>
                        )}
                        {Number(cfg.bulkDiscount4Plus) > 0 && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">4+→+{cfg.bulkDiscount4Plus}%</span>
                        )}
                        {Number(cfg.bulkDiscount2) === 0 && Number(cfg.bulkDiscount3) === 0 && Number(cfg.bulkDiscount4Plus) === 0 && (
                          <span className="text-brand-textMuted text-xs">None set</span>
                        )}
                      </div>
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
