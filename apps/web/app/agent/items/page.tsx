"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Package, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/shared/ImageUpload";

interface AgentItem {
  id: string;
  name: string;
  brandName: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = {
  name: "",
  brandName: "",
  imageUrl: null as string | null,
};

export default function AgentItemsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<AgentItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: items = [], isLoading } = useQuery<AgentItem[]>({
    queryKey: ["agent", "items", search],
    queryFn: () => api.get(`/api/agent/items?search=${search}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post("/api/agent/items", {
        name: data.name,
        brandName: data.brandName || null,
        imageUrl: data.imageUrl ?? null,
      }),
    onSuccess: () => {
      toast.success("Item added");
      qc.invalidateQueries({ queryKey: ["agent", "items"] });
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) =>
      api.put(`/api/agent/items/${id}`, {
        name: data.name,
        brandName: data.brandName || null,
        imageUrl: data.imageUrl ?? null,
      }),
    onSuccess: () => {
      toast.success("Item updated");
      qc.invalidateQueries({ queryKey: ["agent", "items"] });
      setEditingItem(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/agent/items/${id}`),
    onSuccess: () => {
      toast.success("Item removed");
      qc.invalidateQueries({ queryKey: ["agent", "items"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const openEdit = (item: AgentItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      brandName: item.brandName ?? "",
      imageUrl: item.imageUrl ?? null,
    });
    setShowForm(false);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setForm(emptyForm);
  };

  const handleSubmit = () => {
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isFormOpen = showForm || !!editingItem;

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">Item Catalog</h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Global catalog — name &amp; image only. Set prices &amp; stock in My Inventory.
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingItem(null); setForm(emptyForm); }}>
          <Plus size={14} className="mr-2" />
          Add Item
        </Button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg text-brand-text">
                {editingItem ? "Edit Item" : "New Item"}
              </h2>
              <button onClick={closeForm} className="text-brand-textMuted hover:text-brand-text">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Item name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
              <Input
                label="Brand name"
                value={form.brandName}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              />
            </div>
            <ImageUpload
              label="Image"
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
              folder="agent-items"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingItem ? "Save changes" : "Add item"}
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
          placeholder="Search items..."
          className="w-full pl-9 pr-4 py-2.5 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
        />
      </div>

      {/* Items list */}
      {isLoading ? (
        <div className="text-center py-10 text-brand-textMuted text-sm">Loading...</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-brand-textMuted text-sm">
            <Package size={28} className="mx-auto mb-3 text-brand-textMuted" />
            No items yet. Add your first item above.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-brand-bg flex items-center justify-center">
                  <Package size={32} className="text-brand-textMuted" />
                </div>
              )}
              <CardContent className="p-4 space-y-2">
                <div>
                  <h3 className="font-medium text-brand-text">{item.name}</h3>
                  {item.brandName && (
                    <p className="text-xs text-brand-textMuted">{item.brandName}</p>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(item)}>
                    <Pencil size={12} className="mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-brand-error border-brand-error/30 hover:bg-brand-error/5"
                    onClick={() => deleteMutation.mutate(item.id)}
                    loading={deleteMutation.isPending}
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
