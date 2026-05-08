"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, Search, X, Tag } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/shared/ImageUpload";

interface AgentCategory { id: string; name: string; imageUrl: string | null; }
interface AgentItem {
  id: string;
  name: string;
  brandName: string | null;
  imageUrl: string | null;
  buyCount: number;
  categoryId: string | null;
  category: AgentCategory | null;
}

const emptyForm = { name: "", brandName: "", imageUrl: null as string | null, categoryId: "" };

export default function ItemCatalogItemsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AgentItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: cats = [] } = useQuery<AgentCategory[]>({
    queryKey: ["ic", "cats"],
    queryFn: () => api.get("/api/item-catalog/categories"),
  });

  const { data: items = [], isLoading } = useQuery<AgentItem[]>({
    queryKey: ["ic", "items", search, filterCat],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCat) params.set("categoryId", filterCat);
      return api.get(`/api/item-catalog/items?${params}`);
    },
  });

  const createMut = useMutation({
    mutationFn: (d: typeof form) => api.post("/api/item-catalog/items", {
      name: d.name, brandName: d.brandName || null, imageUrl: d.imageUrl,
      categoryId: d.categoryId || null,
    }),
    onSuccess: () => { toast.success("Item added"); qc.invalidateQueries({ queryKey: ["ic", "items"] }); closeForm(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: typeof form }) => api.put(`/api/item-catalog/items/${id}`, {
      name: d.name, brandName: d.brandName || null, imageUrl: d.imageUrl,
      categoryId: d.categoryId || null,
    }),
    onSuccess: () => { toast.success("Item updated"); qc.invalidateQueries({ queryKey: ["ic", "items"] }); closeForm(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/item-catalog/items/${id}`),
    onSuccess: () => { toast.success("Item removed"); qc.invalidateQueries({ queryKey: ["ic", "items"] }); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  function closeForm() { setShowForm(false); setEditing(null); setForm(emptyForm); }
  function openEdit(item: AgentItem) {
    setEditing(item);
    setForm({ name: item.name, brandName: item.brandName ?? "", imageUrl: item.imageUrl, categoryId: item.categoryId ?? "" });
    setShowForm(false);
  }
  function submit() {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    if (editing) updateMut.mutate({ id: editing.id, d: form });
    else createMut.mutate(form);
  }

  const isOpen = showForm || !!editing;

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl text-brand-text">Items</h1>
          <p className="text-brand-textMuted text-sm mt-1">Global catalog — agents set prices &amp; stock in their inventory</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}>
          <Plus size={14} className="mr-2" /> Add Item
        </Button>
      </div>

      {isOpen && (
        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg text-brand-text">{editing ? "Edit Item" : "New Item"}</h2>
              <button onClick={closeForm}><X size={18} className="text-brand-textMuted" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Item name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
              <Input label="Brand name" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full p-2.5 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
              >
                <option value="">— No category —</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <ImageUpload label="Item image" value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} folder="agent-items" />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button onClick={submit} loading={createMut.isPending || updateMut.isPending}>
                {editing ? "Save changes" : "Add item"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…"
            className="w-full pl-9 pr-4 py-2.5 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary" />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2.5 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary min-w-40">
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-brand-textMuted text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-brand-textMuted text-sm">
          <Package size={28} className="mx-auto mb-3 text-brand-textMuted" />No items found.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="w-full h-40 lg:h-56 object-cover" />
              ) : (
                <div className="w-full h-40 lg:h-56 bg-brand-bg flex items-center justify-center">
                  <Package size={32} className="text-brand-textMuted" />
                </div>
              )}
              <CardContent className="p-4 lg:p-5 space-y-2">
                <div>
                  <h3 className="font-medium text-brand-text lg:text-lg">{item.name}</h3>
                  {item.brandName && <p className="text-xs text-brand-textMuted">{item.brandName}</p>}
                  {item.category && (
                    <span className="inline-flex items-center gap-1 text-xs text-brand-primary mt-1">
                      <Tag size={10} /> {item.category.name}
                    </span>
                  )}
                  {item.buyCount > 0 && (
                    <p className="text-xs text-brand-textMuted mt-0.5">{item.buyCount} sold</p>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(item)}>
                    <Pencil size={12} className="mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-brand-error border-brand-error/30"
                    onClick={() => deleteMut.mutate(item.id)} loading={deleteMut.isPending}>
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
