"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit2, Check, X, Search, Loader2, BadgeDollarSign,
  Truck, Tag, ChevronDown, ChevronUp,
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
  discountPercent: string;
  slotDurationHours: number;
  subcategory: SubcategoryOption;
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
  category: { id: string; name: string; type: string };
}

function discountedPrice(base: number, discountPct: number) {
  return base * (1 - Math.min(100, Math.max(0, discountPct)) / 100);
}

function CatEditRow({ cfg, onDone }: { cfg: CategoryConfig; onDone: () => void }) {
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
    <div className="space-y-3 pt-3 border-t border-brand-border">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Input
          label="Transport per km (₹)"
          type="number" min={0} step={0.01} value={transport}
          onChange={(e) => setTransport(Math.max(0, Number(e.target.value) || 0))}
        />
        <Input
          label="Bulk: 2 services (%)"
          type="number" min={0} max={100} step={0.01} value={d2}
          onChange={(e) => setD2(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
        />
        <Input
          label="Bulk: 3 services (%)"
          type="number" min={0} max={100} step={0.01} value={d3}
          onChange={(e) => setD3(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
        />
        <Input
          label="Bulk: 4+ services (%)"
          type="number" min={0} max={100} step={0.01} value={d4}
          onChange={(e) => setD4(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
        />
      </div>
      <p className="text-xs font-medium text-brand-text">Slot Hours</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
      <div className="flex gap-2">
        <Button size="sm" onClick={() => save.mutate()} loading={save.isPending}>
          <Check size={14} /> Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}><X size={14} /></Button>
      </div>
    </div>
  );
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
  const [discount, setDiscount] = useState(Number(entry.discountPercent));
  const [duration, setDuration] = useState(entry.slotDurationHours ?? 1);

  const finalPrice = discountedPrice(base, discount);

  const update = useMutation({
    mutationFn: () =>
      api.put(`/api/agent/price-control/${entry.id}`, {
        baseServiceCharge: base,
        discountPercent: discount,
        slotDurationHours: duration,
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
          label="Discount (%)"
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={discount}
          onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <label className="mb-1.5 block text-sm font-medium text-brand-text">Slot duration (hrs)</label>
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full p-2.5 rounded-sm border border-brand-border bg-brand-surface text-sm text-brand-text focus:outline-none focus:border-brand-primary"
        >
          {[1, 2, 3, 4].map((h) => (
            <option key={h} value={h}>{h} hr{h > 1 ? "s" : ""}</option>
          ))}
        </select>
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

  // ── category config state ──
  const [catSectionOpen, setCatSectionOpen] = useState(true);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<{ id: string; name: string } | null>(null);
  const [catTransport, setCatTransport] = useState(0);
  const [catD2, setCatD2] = useState(0);
  const [catD3, setCatD3] = useState(0);
  const [catD4, setCatD4] = useState(0);
  const [catStartHr, setCatStartHr] = useState(6);
  const [catEndHr, setCatEndHr] = useState(20);

  // ── subcategory pricing state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [subSearch, setSubSearch] = useState("");
  const [selectedSub, setSelectedSub] = useState<SubcategoryOption | null>(null);
  const [base, setBase] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [duration, setDuration] = useState(1);

  // ── category config queries ──
  const { data: configs = [], isLoading: configsLoading } = useQuery<CategoryConfig[]>({
    queryKey: ["agent", "category-config"],
    queryFn: () => api.get("/api/agent/category-config"),
  });

  const { data: allCategories = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["categories", "service-all"],
    queryFn: async () => {
      const rows = await api.get<{ id: string; name: string; type: string }[]>("/api/user/categories");
      return rows.filter((c) => c.type === "SERVICE");
    },
    enabled: addCatOpen,
  });

  const configuredCatIds = new Set(configs.map((c) => c.categoryId));
  const availableCats = allCategories.filter(
    (c) => !configuredCatIds.has(c.id) && c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const addCat = useMutation({
    mutationFn: () =>
      api.post("/api/agent/category-config", {
        categoryId: selectedCat!.id,
        transportChargePerKm: catTransport,
        bulkDiscount2: catD2,
        bulkDiscount3: catD3,
        bulkDiscount4Plus: catD4,
        slotStartHour: catStartHr,
        slotEndHour: catEndHr,
      }),
    onSuccess: () => {
      toast.success(`Category config added for ${selectedCat!.name}`);
      qc.invalidateQueries({ queryKey: ["agent", "category-config"] });
      setAddCatOpen(false); setSelectedCat(null);
      setCatTransport(0); setCatD2(0); setCatD3(0); setCatD4(0); setCatSearch("");
      setCatStartHr(6); setCatEndHr(20);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const removeCat = useMutation({
    mutationFn: (categoryId: string) => api.delete(`/api/agent/category-config/${categoryId}`),
    onSuccess: () => {
      toast.success("Category config removed");
      qc.invalidateQueries({ queryKey: ["agent", "category-config"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  // ── subcategory pricing queries ──
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
        discountPercent: discount,
        slotDurationHours: duration,
      }),
    onSuccess: () => {
      toast.success(`Price control added for ${selectedSub!.name}`);
      qc.invalidateQueries({ queryKey: ["agent", "price-control"] });
      setAddOpen(false);
      setSelectedSub(null);
      setBase(0);
      setDiscount(0);
      setDuration(1);
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
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">Price Control</h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Configure category transport charges first, then set per-subcategory pricing.
          </p>
        </div>
      </div>

      {/* ── Step 1: Category charges ── */}
      <div className="space-y-3">
        <button
          onClick={() => setCatSectionOpen((v) => !v)}
          className="w-full flex items-center justify-between px-1 group"
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary text-white text-xs font-bold flex-shrink-0">1</div>
            <div className="text-left">
              <p className="font-heading text-base text-brand-text">Category charges</p>
              <p className="text-xs text-brand-textMuted">Transport rate &amp; bulk-booking discounts per category</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-brand-textMuted font-mono bg-brand-surface px-2 py-0.5 rounded">
              {configs.length} configured
            </span>
            {catSectionOpen ? <ChevronUp size={15} className="text-brand-textMuted" /> : <ChevronDown size={15} className="text-brand-textMuted" />}
          </div>
        </button>

        {catSectionOpen && (
          <div className="space-y-3">
            {/* Add category config panel */}
            {addCatOpen ? (
              <Card>
                <CardContent className="space-y-4 py-5">
                  <h2 className="font-heading text-base text-brand-text">Configure new category</h2>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted" />
                    <input
                      value={catSearch}
                      onChange={(e) => { setCatSearch(e.target.value); setSelectedCat(null); }}
                      placeholder="Search service category…"
                      className="w-full pl-8 pr-3 py-2 text-sm border border-brand-border rounded-sm bg-brand-bg text-brand-text focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                  {selectedCat ? (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-sm bg-brand-primary/10 border border-brand-primary/20 text-sm">
                      <span className="font-medium text-brand-text">{selectedCat.name}</span>
                      <button onClick={() => setSelectedCat(null)} className="text-brand-textMuted hover:text-brand-text"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="border border-brand-border rounded-sm max-h-40 overflow-y-auto divide-y divide-brand-border">
                      {availableCats.length === 0 ? (
                        <p className="text-sm text-brand-textMuted px-3 py-3 text-center">
                          {allCategories.length === 0 ? "Loading…" : "All categories configured"}
                        </p>
                      ) : availableCats.map((c) => (
                        <button key={c.id} onClick={() => setSelectedCat(c)} className="w-full text-left px-3 py-2 hover:bg-brand-bg transition-colors text-sm font-medium text-brand-text">
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Input label="Transport per km (₹)" type="number" min={0} step={0.01} value={catTransport}
                      onChange={(e) => setCatTransport(Math.max(0, Number(e.target.value) || 0))} />
                    <Input label="Bulk: 2 services (%)" type="number" min={0} max={100} step={0.01} value={catD2}
                      onChange={(e) => setCatD2(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
                    <Input label="Bulk: 3 services (%)" type="number" min={0} max={100} step={0.01} value={catD3}
                      onChange={(e) => setCatD3(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
                    <Input label="Bulk: 4+ services (%)" type="number" min={0} max={100} step={0.01} value={catD4}
                      onChange={(e) => setCatD4(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
                  </div>
                  <p className="text-xs font-medium text-brand-text">Slot Hours</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-brand-text">Start hour</label>
                      <select value={catStartHr} onChange={(e) => setCatStartHr(Number(e.target.value))} className="w-full p-2.5 rounded-sm border border-brand-border bg-brand-surface text-sm text-brand-text focus:outline-none focus:border-brand-primary">
                        {Array.from({ length: 24 }, (_, i) => (<option key={i} value={i}>{i.toString().padStart(2, "0")}:00</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-brand-text">End hour</label>
                      <select value={catEndHr} onChange={(e) => setCatEndHr(Number(e.target.value))} className="w-full p-2.5 rounded-sm border border-brand-border bg-brand-surface text-sm text-brand-text focus:outline-none focus:border-brand-primary">
                        {Array.from({ length: 24 }, (_, i) => (<option key={i + 1} value={i + 1}>{(i + 1).toString().padStart(2, "0")}:00</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => { setAddCatOpen(false); setSelectedCat(null); setCatSearch(""); }}>Cancel</Button>
                    <Button onClick={() => addCat.mutate()} loading={addCat.isPending} disabled={!selectedCat}>Add</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <button
                onClick={() => setAddCatOpen(true)}
                className="w-full flex items-center gap-2 px-4 py-3 border-2 border-dashed border-brand-border rounded-lg hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-colors text-sm text-brand-textMuted hover:text-brand-primary"
              >
                <Plus size={15} /> Add category config
              </button>
            )}

            {/* Category config cards */}
            {configsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="animate-spin text-brand-primary" size={24} /></div>
            ) : configs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {configs.map((cfg) => (
                  <Card key={cfg.id}>
                    <CardContent className="space-y-3 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-heading text-sm text-brand-text">{cfg.category.name}</h3>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingCatId(editingCatId === cfg.id ? null : cfg.id)}
                            className="p-1.5 rounded-sm hover:bg-brand-bg text-brand-textMuted hover:text-brand-text transition-colors"
                          ><Edit2 size={13} /></button>
                          <button
                            onClick={() => removeCat.mutate(cfg.categoryId)}
                            className="p-1.5 rounded-sm hover:bg-red-50 text-brand-textMuted hover:text-red-500 transition-colors"
                          ><Trash2 size={13} /></button>
                        </div>
                      </div>
                      {editingCatId === cfg.id ? (
                        <CatEditRow cfg={cfg} onDone={() => setEditingCatId(null)} />
                      ) : (
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 bg-brand-bg border border-brand-border px-2.5 py-1 rounded-full text-brand-text">
                            <Truck size={11} className="text-brand-textMuted" />
                            {formatINR(Number(cfg.transportChargePerKm))}/km
                          </span>
                          <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full">
                            🕐 {(cfg.slotStartHour ?? 6).toString().padStart(2, "0")}:00–{(cfg.slotEndHour ?? 20).toString().padStart(2, "0")}:00
                          </span>
                          {Number(cfg.bulkDiscount2) > 0 && (
                            <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 rounded-full">
                              <Tag size={11} /> 2 svcs +{cfg.bulkDiscount2}%
                            </span>
                          )}
                          {Number(cfg.bulkDiscount3) > 0 && (
                            <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 rounded-full">
                              <Tag size={11} /> 3 svcs +{cfg.bulkDiscount3}%
                            </span>
                          )}
                          {Number(cfg.bulkDiscount4Plus) > 0 && (
                            <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 rounded-full">
                              <Tag size={11} /> 4+ svcs +{cfg.bulkDiscount4Plus}%
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Step 2: Subcategory pricing ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary text-white text-xs font-bold flex-shrink-0">2</div>
            <div>
              <p className="font-heading text-base text-brand-text">Subcategory pricing</p>
              <p className="text-xs text-brand-textMuted">Base charge, discount &amp; slot duration per subcategory</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add subcategory
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Input
                label="Base service charge (₹)"
                type="number"
                min={0}
                step={0.01}
                value={base}
                onChange={(e) => setBase(Math.max(0, Number(e.target.value) || 0))}
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
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-text">Slot duration (hrs)</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full p-2.5 rounded-sm border border-brand-border bg-brand-surface text-sm text-brand-text focus:outline-none focus:border-brand-primary"
                >
                  {[1, 2, 3, 4].map((h) => (
                    <option key={h} value={h}>{h} hr{h > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
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
                    <div className="col-span-2 rounded-sm bg-brand-bg border border-brand-border px-3 py-1.5 flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-brand-textMuted">Slot duration:</span>
                      <span className="font-semibold text-brand-primary text-sm">{entry.slotDurationHours ?? 1} hr{(entry.slotDurationHours ?? 1) > 1 ? "s" : ""}</span>
                    </div>
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
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>{/* end Step 2 */}
    </div>
  );
}
