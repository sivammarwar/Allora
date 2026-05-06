"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Package, X, WarehouseIcon, ChevronDown } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CatalogItem {
  id: string;
  name: string;
  brandName: string | null;
  imageUrl: string | null;
}

interface InventoryItem {
  id: string;
  agentId: string;
  itemId: string;
  quantity: number;
  mrp: number | null;
  price: number;
  specification: string | null;
  isActive: boolean;
  createdAt: string;
  item: CatalogItem;
}

const emptyInvForm = {
  itemId: "",
  quantity: "",
  mrp: "",
  price: "",
  specification: "",
};

export default function AgentInventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRow, setEditingRow] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyInvForm);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);

  const { data: inventory = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["agent", "inventory", search],
    queryFn: () => api.get(`/api/agent/inventory?search=${encodeURIComponent(search)}`),
  });

  const { data: catalog = [] } = useQuery<CatalogItem[]>({
    queryKey: ["agent", "items", catalogSearch],
    queryFn: () => api.get(`/api/agent/items?search=${encodeURIComponent(catalogSearch)}`),
    enabled: showAddForm,
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post("/api/agent/inventory", {
        itemId: data.itemId,
        quantity: Number(data.quantity),
        mrp: data.mrp ? Number(data.mrp) : null,
        price: Number(data.price),
        specification: data.specification || null,
      }),
    onSuccess: () => {
      toast.success("Item added to inventory");
      qc.invalidateQueries({ queryKey: ["agent", "inventory"] });
      setShowAddForm(false);
      setForm(emptyInvForm);
      setCatalogSearch("");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) =>
      api.put(`/api/agent/inventory/${id}`, {
        quantity: Number(data.quantity),
        mrp: data.mrp ? Number(data.mrp) : null,
        price: Number(data.price),
        specification: data.specification || null,
      }),
    onSuccess: () => {
      toast.success("Inventory updated");
      qc.invalidateQueries({ queryKey: ["agent", "inventory"] });
      setEditingRow(null);
      setForm(emptyInvForm);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/agent/inventory/${id}`),
    onSuccess: () => {
      toast.success("Removed from inventory");
      qc.invalidateQueries({ queryKey: ["agent", "inventory"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const openEdit = (row: InventoryItem) => {
    setEditingRow(row);
    setForm({
      itemId: row.itemId,
      quantity: String(row.quantity),
      mrp: row.mrp ? String(Number(row.mrp)) : "",
      price: String(Number(row.price)),
      specification: row.specification ?? "",
    });
    setShowAddForm(false);
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingRow(null);
    setForm(emptyInvForm);
    setCatalogSearch("");
  };

  const handleSubmit = () => {
    if (!form.quantity || !form.price) {
      toast.error("Quantity and price are required");
      return;
    }
    if (editingRow) {
      updateMutation.mutate({ id: editingRow.id, data: form });
    } else {
      if (!form.itemId) {
        toast.error("Select an item from the catalog");
        return;
      }
      addMutation.mutate(form);
    }
  };

  const selectedCatalogItem = catalog.find((c) => c.id === form.itemId);

  const filteredCatalog = catalog.filter((c) => {
    const q = catalogSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.brandName ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">My Inventory</h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Set your prices, stock quantities and specifications for each item
          </p>
        </div>
        <Button
          onClick={() => {
            setShowAddForm(true);
            setEditingRow(null);
            setForm(emptyInvForm);
          }}
        >
          <Plus size={14} className="mr-2" />
          Add to Inventory
        </Button>
      </div>

      {/* Add / Edit Form */}
      {(showAddForm || !!editingRow) && (
        <Card>
          <CardContent className="py-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg text-brand-text">
                {editingRow ? `Edit — ${editingRow.item.name}` : "Add Item to Inventory"}
              </h2>
              <button onClick={closeForm} className="text-brand-textMuted hover:text-brand-text">
                <X size={18} />
              </button>
            </div>

            {/* Catalog picker — only shown when adding new */}
            {!editingRow && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-text">
                  Select catalog item *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCatalogOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
                  >
                    {selectedCatalogItem ? (
                      <span className="flex items-center gap-2">
                        {selectedCatalogItem.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selectedCatalogItem.imageUrl}
                            alt=""
                            className="w-6 h-6 rounded object-cover"
                          />
                        )}
                        {selectedCatalogItem.name}
                        {selectedCatalogItem.brandName && (
                          <span className="text-brand-textMuted">({selectedCatalogItem.brandName})</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-brand-textMuted">Choose from catalog…</span>
                    )}
                    <ChevronDown size={14} className={`transition-transform ${catalogOpen ? "rotate-180" : ""}`} />
                  </button>

                  {catalogOpen && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-brand-surface border border-brand-border rounded-sm shadow-lg max-h-56 overflow-y-auto">
                      <div className="p-2 border-b border-brand-border">
                        <input
                          autoFocus
                          type="text"
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                          placeholder="Search catalog…"
                          className="w-full px-2 py-1.5 rounded-sm bg-brand-bg border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
                        />
                      </div>
                      {filteredCatalog.length === 0 ? (
                        <p className="p-3 text-xs text-brand-textMuted text-center">No items found</p>
                      ) : (
                        filteredCatalog.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, itemId: c.id });
                              setCatalogOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-text hover:bg-brand-bg text-left"
                          >
                            {c.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.imageUrl} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded bg-brand-bg flex items-center justify-center flex-shrink-0">
                                <Package size={13} className="text-brand-textMuted" />
                              </div>
                            )}
                            <span>
                              {c.name}
                              {c.brandName && (
                                <span className="text-brand-textMuted ml-1">({c.brandName})</span>
                              )}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Quantity (units) *"
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
              <Input
                label="Specification"
                value={form.specification}
                onChange={(e) => setForm({ ...form, specification: e.target.value })}
                placeholder="Size, colour, variant…"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="MRP (₹)"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.mrp}
                  onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                  placeholder="Optional — show strikethrough price"
                />
              </div>
              <div>
                <Input
                  label="Selling price (₹) *"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
                {form.mrp && form.price && Number(form.mrp) > Number(form.price) && (
                  <p className="mt-1 text-xs text-green-600 font-medium">
                    {Math.round((1 - Number(form.price) / Number(form.mrp)) * 100)}% off
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                loading={addMutation.isPending || updateMutation.isPending}
              >
                {editingRow ? "Save changes" : "Add to inventory"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search inventory…"
          className="w-full pl-9 pr-4 py-2.5 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
        />
      </div>

      {/* Inventory grid */}
      {isLoading ? (
        <div className="text-center py-10 text-brand-textMuted text-sm">Loading…</div>
      ) : inventory.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center space-y-3">
            <WarehouseIcon size={30} className="mx-auto text-brand-textMuted" />
            <p className="text-brand-textMuted text-sm">
              {search ? "No inventory items match your search." : "Your inventory is empty. Add items from the catalog."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.map((row) => (
            <Card key={row.id} className="overflow-hidden">
              {row.item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.item.imageUrl} alt={row.item.name} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-brand-bg flex items-center justify-center">
                  <Package size={30} className="text-brand-textMuted" />
                </div>
              )}
              <CardContent className="p-4 space-y-2">
                <div>
                  <h3 className="font-medium text-brand-text">{row.item.name}</h3>
                  {row.item.brandName && (
                    <p className="text-xs text-brand-textMuted">{row.item.brandName}</p>
                  )}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-brand-primary">₹{Number(row.price)}</span>
                      {row.mrp && Number(row.mrp) > Number(row.price) && (
                        <span className="text-xs text-brand-textMuted line-through">₹{Number(row.mrp)}</span>
                      )}
                    </div>
                    {row.mrp && Number(row.mrp) > Number(row.price) && (
                      <span className="text-[11px] font-semibold text-green-600">
                        {Math.round((1 - Number(row.price) / Number(row.mrp)) * 100)}% off
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0 ${
                      row.quantity === 0
                        ? "bg-red-500/10 text-red-600"
                        : row.quantity <= 5
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-green-500/10 text-green-600"
                    }`}
                  >
                    {row.quantity === 0 ? "Out of stock" : `${row.quantity} in stock`}
                  </span>
                </div>

                {row.specification && (
                  <p className="text-xs text-brand-textMuted line-clamp-2">{row.specification}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(row)}>
                    <Pencil size={12} className="mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-brand-error border-brand-error/30 hover:bg-brand-error/5"
                    onClick={() => removeMutation.mutate(row.id)}
                    loading={removeMutation.isPending}
                  >
                    <Trash2 size={12} className="mr-1" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
