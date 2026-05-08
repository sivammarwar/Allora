"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, Package } from "lucide-react";
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
  const [search, setSearch] = useState("");

  const { data: agents = [], isLoading } = useQuery<AgentGroup[]>({
    queryKey: ["main-inventory"],
    queryFn: () => api.get("/api/main-inventory"),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.agentName.toLowerCase().includes(q) ||
        a.areaName.toLowerCase().includes(q)
    );
  }, [agents, search]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Main Inventory</h1>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by agent name or area…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div className="p-4 space-y-5">
        {isLoading && (
          <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No results found.</div>
        )}
        {filtered.map((agent) => (
          <div key={agent.agentId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{agent.agentName}</p>
                <p className="text-xs text-blue-600 font-medium">📍 {agent.areaName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{agent.items.length} items</span>
                <button
                  onClick={() => downloadCSV(agent)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <Download size={12} /> CSV
                </button>
              </div>
            </div>

            {agent.items.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-6 text-gray-400 text-sm">
                <Package size={16} /> No inventory items
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 font-medium border-b border-gray-100">
                        <th className="px-4 py-2">Item</th>
                        <th className="px-4 py-2">Brand</th>
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2 text-right">MRP</th>
                        <th className="px-4 py-2 text-right">Price</th>
                        <th className="px-4 py-2 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agent.items.map((item, i) => (
                        <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{item.name}</td>
                          <td className="px-4 py-2.5 text-gray-500">{item.brand}</td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">{item.category}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-400 line-through text-xs">
                            {item.mrp ? `₹${item.mrp}` : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-gray-900">₹{item.price}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`font-semibold text-sm ${item.quantity === 0 ? "text-red-500" : item.quantity < 5 ? "text-amber-500" : "text-green-600"}`}>
                              {item.quantity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {agent.items.map((item) => (
                    <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.brand} · <span className="text-blue-500">{item.category}</span></p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-gray-900 text-sm">₹{item.price}</p>
                        {item.mrp && <p className="text-xs text-gray-400 line-through">₹{item.mrp}</p>}
                        <p className={`text-xs font-semibold mt-0.5 ${item.quantity === 0 ? "text-red-500" : item.quantity < 5 ? "text-amber-500" : "text-green-600"}`}>
                          Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
