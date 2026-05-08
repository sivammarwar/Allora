"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Download, Package, ChevronDown, ChevronUp,
  X, MapPin, AlertCircle, TrendingDown, CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";

interface InventoryItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  mrp: number | null;
  quantity: number;
}

interface AgentGroup {
  agentId: string;
  agentName: string;
  areaName: string;
  items: InventoryItem[];
}

interface FlatItem extends InventoryItem {
  agentName: string;
  areaName: string;
}

type FilterKey = "name" | "category" | "price" | "quantity" | "area";

function ColumnFilter({
  label, values, selected, onChange,
}: {
  label: string;
  values: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const shown = values.filter(v => v.toLowerCase().includes(q.toLowerCase()));
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-1 rounded-lg transition-colors ${selected.length ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:bg-gray-100"}`}
      >
        {label}
        {selected.length > 0 && (
          <span className="bg-blue-600 text-white rounded-full text-[9px] leading-none w-4 h-4 flex items-center justify-center font-bold">{selected.length}</span>
        )}
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2">
          <div className="relative mb-2">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`}
              className="w-full pl-6 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" />
          </div>
          {selected.length > 0 && (
            <button onClick={() => onChange([])} className="text-[11px] text-blue-500 hover:underline mb-1.5 px-1 block">Clear all</button>
          )}
          <div className="max-h-44 overflow-y-auto space-y-0.5">
            {shown.length === 0 && <p className="text-xs text-gray-400 px-1 py-2 text-center">No results</p>}
            {shown.map(v => (
              <label key={v} className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(v)} onChange={() => toggle(v)} className="accent-blue-600 w-3.5 h-3.5" />
                <span className="text-xs text-gray-800 truncate flex-1">{v}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function downloadCSV(agent: AgentGroup) {
  const headers = ["Item Name", "Brand", "Category", "MRP", "Price", "Quantity"];
  const rows = agent.items.map((i) => [
    `"${i.name}"`, `"${i.brand}"`, `"${i.category}"`,
    i.mrp ?? "", i.price, i.quantity,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${agent.agentName}-${agent.areaName}-inventory.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MainInventoryPage() {
  const [tab, setTab] = useState<"agents" | "products">("agents");

  // ── By-Agent tab state ────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggleOpen = (id: string) =>
    setOpenIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── All-Products tab state ────────────────────────────────────────────────
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>({ name: [], category: [], price: [], quantity: [], area: [] });
  const setFilter = useCallback((k: FilterKey, v: string[]) => setFilters(f => ({ ...f, [k]: v })), []);

  // Summary
  const [summaryArea, setSummaryArea] = useState("__all__");
  const [outThreshold, setOutThreshold] = useState(0);
  const [lowThreshold, setLowThreshold] = useState(5);
  const [stockModal, setStockModal] = useState<"out" | "low" | "in" | null>(null);

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: agents = [], isLoading } = useQuery<AgentGroup[]>({
    queryKey: ["main-inventory"],
    queryFn: () => api.get("/api/main-inventory"),
  });

  const allItems = useMemo<FlatItem[]>(() =>
    agents.flatMap(a => a.items.map(i => ({ ...i, agentName: a.agentName, areaName: a.areaName }))),
    [agents]);

  const allAreas = useMemo(() => [...new Set(agents.map(a => a.areaName))].sort(), [agents]);

  // Unique values per column (for filter dropdowns)
  const uniq = useCallback((key: keyof FlatItem) =>
    [...new Set(allItems.map(i => String(i[key])))].sort((a, b) => isNaN(+a) ? a.localeCompare(b) : +a - +b),
    [allItems]);

  // Filtered flat items
  const filteredItems = useMemo(() => allItems.filter(p => {
    if (filters.name.length && !filters.name.includes(p.name)) return false;
    if (filters.category.length && !filters.category.includes(p.category)) return false;
    if (filters.price.length && !filters.price.includes(String(p.price))) return false;
    if (filters.quantity.length && !filters.quantity.includes(String(p.quantity))) return false;
    if (filters.area.length && !filters.area.includes(p.areaName)) return false;
    return true;
  }), [allItems, filters]);

  // Summary stats
  const summaryItems = useMemo(() =>
    summaryArea === "__all__" ? allItems : allItems.filter(p => p.areaName === summaryArea),
    [allItems, summaryArea]);
  const outItems = useMemo(() => summaryItems.filter(p => p.quantity <= outThreshold), [summaryItems, outThreshold]);
  const lowItems = useMemo(() => summaryItems.filter(p => p.quantity > outThreshold && p.quantity <= lowThreshold), [summaryItems, outThreshold, lowThreshold]);
  const inItems = useMemo(() => summaryItems.filter(p => p.quantity > lowThreshold), [summaryItems, lowThreshold]);
  const modalItems = stockModal === "out" ? outItems : stockModal === "low" ? lowItems : inItems;

  // By-Agent search filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return agents;
    return agents.filter(a => a.agentName.toLowerCase().includes(q) || a.areaName.toLowerCase().includes(q));
  }, [agents, search]);

  const hasFilters = Object.values(filters).some(v => v.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm px-4 pt-4 pb-0">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Main Inventory</h1>
        <div className="flex gap-1">
          {(["agents", "products"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${tab === t ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
              {t === "agents" ? "By Agent" : "All Products"}
            </button>
          ))}
        </div>
      </div>

      {/* ══ TAB: By Agent ══ */}
      {tab === "agents" && (
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by agent name or area…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400" />
          </div>
          {isLoading && <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>}
          {!isLoading && filtered.length === 0 && <div className="text-center py-16 text-gray-400 text-sm">No results.</div>}
          {filtered.map(agent => {
            const isOpen = openIds.has(agent.agentId);
            return (
              <div key={agent.agentId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => toggleOpen(agent.agentId)}
                  className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{agent.agentName}</p>
                    <p className="text-xs text-blue-600 font-medium mt-0.5">📍 {agent.areaName}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">{agent.items.length} items</span>
                    <button onClick={e => { e.stopPropagation(); downloadCSV(agent); }}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
                      <Download size={12} /> CSV
                    </button>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </button>
                {isOpen && (agent.items.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-gray-400 text-sm"><Package size={16} /> No items</div>
                ) : (
                  <>
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="text-left text-xs text-gray-400 font-medium border-b border-gray-100">
                          <th className="px-4 py-2">Item</th><th className="px-4 py-2">Brand</th>
                          <th className="px-4 py-2">Category</th><th className="px-4 py-2 text-right">MRP</th>
                          <th className="px-4 py-2 text-right">Price</th><th className="px-4 py-2 text-right">Qty</th>
                        </tr></thead>
                        <tbody>{agent.items.map((item, i) => (
                          <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                            <td className="px-4 py-2.5 font-medium text-gray-900">{item.name}</td>
                            <td className="px-4 py-2.5 text-gray-500">{item.brand}</td>
                            <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">{item.category}</span></td>
                            <td className="px-4 py-2.5 text-right text-gray-400 line-through text-xs">{item.mrp ? `₹${item.mrp}` : "—"}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-900">₹{item.price}</td>
                            <td className="px-4 py-2.5 text-right"><span className={`font-semibold ${item.quantity === 0 ? "text-red-500" : item.quantity < 5 ? "text-amber-500" : "text-green-600"}`}>{item.quantity}</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <div className="sm:hidden divide-y divide-gray-100">
                      {agent.items.map(item => (
                        <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{item.brand} · <span className="text-blue-500">{item.category}</span></p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-gray-900 text-sm">₹{item.price}</p>
                            {item.mrp && <p className="text-xs text-gray-400 line-through">₹{item.mrp}</p>}
                            <p className={`text-xs font-semibold mt-0.5 ${item.quantity === 0 ? "text-red-500" : item.quantity < 5 ? "text-amber-500" : "text-green-600"}`}>Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ TAB: All Products ══ */}
      {tab === "products" && (
        <div className="p-4 space-y-4">

          {/* ── Summary Card ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Area Summary</p>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-blue-500" />
                  <span className="text-sm font-semibold text-gray-800">{allAreas.length} areas total</span>
                </div>
              </div>
              {/* Area dropdown */}
              <select value={summaryArea} onChange={e => setSummaryArea(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus:outline-none focus:border-blue-400 text-gray-800">
                <option value="__all__">All Areas</option>
                {allAreas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Threshold inputs */}
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-500">
                Out of stock ≤
                <input type="number" min={0} value={outThreshold} onChange={e => setOutThreshold(Number(e.target.value))}
                  className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-red-400 text-gray-800" />
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-500">
                Low stock ≤
                <input type="number" min={0} value={lowThreshold} onChange={e => setLowThreshold(Number(e.target.value))}
                  className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 text-gray-800" />
              </label>
            </div>

            {/* Stats chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-center">
                <p className="text-lg font-bold text-gray-900">{summaryItems.length}</p>
                <p className="text-[11px] text-gray-400 font-medium">Total Products</p>
              </div>
              <button onClick={() => setStockModal("out")}
                className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-center hover:bg-red-100 transition-colors">
                <div className="flex items-center justify-center gap-1 mb-0.5"><AlertCircle size={12} className="text-red-500" /></div>
                <p className="text-lg font-bold text-red-600">{outItems.length}</p>
                <p className="text-[11px] text-red-400 font-medium">Out of Stock</p>
              </button>
              <button onClick={() => setStockModal("low")}
                className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-center hover:bg-amber-100 transition-colors">
                <div className="flex items-center justify-center gap-1 mb-0.5"><TrendingDown size={12} className="text-amber-500" /></div>
                <p className="text-lg font-bold text-amber-600">{lowItems.length}</p>
                <p className="text-[11px] text-amber-400 font-medium">Low Stock</p>
              </button>
              <button onClick={() => setStockModal("in")}
                className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-center hover:bg-green-100 transition-colors">
                <div className="flex items-center justify-center gap-1 mb-0.5"><CheckCircle2 size={12} className="text-green-500" /></div>
                <p className="text-lg font-bold text-green-600">{inItems.length}</p>
                <p className="text-[11px] text-green-400 font-medium">In Stock</p>
              </button>
            </div>
          </div>

          {/* ── Filter bar ── */}
          {hasFilters && (
            <button onClick={() => setFilters({ name: [], category: [], price: [], quantity: [], area: [] })}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg bg-red-50 border border-red-100">
              <X size={12} /> Clear all filters
            </button>
          )}

          {/* ── All Products Table ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium border-b border-gray-100 bg-gray-50">
                    <th className="px-3 py-3 text-gray-500 w-10">S.No</th>
                    <th className="px-3 py-3"><ColumnFilter label="Product Name" values={uniq("name")} selected={filters.name} onChange={v => setFilter("name", v)} /></th>
                    <th className="px-3 py-3"><ColumnFilter label="Category" values={uniq("category")} selected={filters.category} onChange={v => setFilter("category", v)} /></th>
                    <th className="px-3 py-3"><ColumnFilter label="Quantity" values={uniq("quantity")} selected={filters.quantity} onChange={v => setFilter("quantity", v)} /></th>
                    <th className="px-3 py-3"><ColumnFilter label="Unit Price" values={uniq("price")} selected={filters.price} onChange={v => setFilter("price", v)} /></th>
                    <th className="px-3 py-3"><ColumnFilter label="Area" values={uniq("areaName")} selected={filters.area} onChange={v => setFilter("area", v)} /></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Loading…</td></tr>
                  )}
                  {!isLoading && filteredItems.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No products match the selected filters.</td></tr>
                  )}
                  {filteredItems.map((item, i) => (
                    <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                      <td className="px-3 py-2.5 text-xs text-gray-400 font-medium">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{item.name}</td>
                      <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium whitespace-nowrap">{item.category}</span></td>
                      <td className="px-3 py-2.5">
                        <span className={`font-semibold text-sm ${item.quantity === 0 ? "text-red-500" : item.quantity <= outThreshold ? "text-red-400" : item.quantity <= lowThreshold ? "text-amber-500" : "text-green-600"}`}>{item.quantity}</span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">₹{item.price}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">📍 {item.areaName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!isLoading && filteredItems.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 text-right">{filteredItems.length} products</div>
            )}
          </div>
        </div>
      )}

      {/* ══ Stock Detail Modal ══ */}
      {stockModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className={`flex items-center justify-between px-5 py-4 border-b ${stockModal === "out" ? "bg-red-50 border-red-100" : stockModal === "low" ? "bg-amber-50 border-amber-100" : "bg-green-50 border-green-100"}`}>
              <div>
                <p className="font-bold text-gray-900 text-sm">
                  {stockModal === "out" ? "Out of Stock" : stockModal === "low" ? "Low Stock" : "In Stock"} — {summaryArea === "__all__" ? "All Areas" : summaryArea}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{modalItems.length} products</p>
              </div>
              <button onClick={() => setStockModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-500">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {modalItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No items in this category.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-400 font-medium border-b border-gray-100 bg-gray-50 sticky top-0">
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2">Area</th>
                  </tr></thead>
                  <tbody>{modalItems.map((item, i) => (
                    <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{item.category}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-red-500">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">₹{item.price}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">📍 {item.areaName}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
