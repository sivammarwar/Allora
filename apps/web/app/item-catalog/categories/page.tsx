"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/shared/ImageUpload";

interface AgentCategory {
  id: string;
  name: string;
  imageUrl: string | null;
  isActive: boolean;
}

const emptyForm = { name: "", imageUrl: null as string | null };

export default function ItemCatalogCategoriesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AgentCategory | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: cats = [], isLoading } = useQuery<AgentCategory[]>({
    queryKey: ["ic", "cats"],
    queryFn: () => api.get("/api/item-catalog/categories"),
  });

  const createMut = useMutation({
    mutationFn: (d: typeof form) => api.post("/api/item-catalog/categories", d),
    onSuccess: () => { toast.success("Category added"); qc.invalidateQueries({ queryKey: ["ic", "cats"] }); closeForm(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: typeof form }) => api.put(`/api/item-catalog/categories/${id}`, d),
    onSuccess: () => { toast.success("Category updated"); qc.invalidateQueries({ queryKey: ["ic", "cats"] }); closeForm(); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/item-catalog/categories/${id}`),
    onSuccess: () => { toast.success("Category removed"); qc.invalidateQueries({ queryKey: ["ic", "cats"] }); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  function closeForm() { setShowForm(false); setEditing(null); setForm(emptyForm); }
  function openEdit(c: AgentCategory) { setEditing(c); setForm({ name: c.name, imageUrl: c.imageUrl }); setShowForm(false); }

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
          <h1 className="font-heading text-2xl sm:text-3xl text-brand-text">Categories</h1>
          <p className="text-brand-textMuted text-sm mt-1">Organise items into named categories with images</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditing(null); setForm(emptyForm); }}>
          <Plus size={14} className="mr-2" /> Add Category
        </Button>
      </div>

      {isOpen && (
        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg text-brand-text">{editing ? "Edit Category" : "New Category"}</h2>
              <button onClick={closeForm}><X size={18} className="text-brand-textMuted" /></button>
            </div>
            <Input label="Category name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            <ImageUpload label="Category image" value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} folder="agent-categories" />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeForm}>Cancel</Button>
              <Button onClick={submit} loading={createMut.isPending || updateMut.isPending}>
                {editing ? "Save changes" : "Add category"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-10 text-brand-textMuted text-sm">Loading…</div>
      ) : cats.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-brand-textMuted text-sm">No categories yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {cats.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              {c.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.imageUrl} alt={c.name} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-brand-bg flex items-center justify-center">
                  <Tag size={28} className="text-brand-textMuted" />
                </div>
              )}
              <CardContent className="p-3 space-y-2">
                <p className="font-medium text-brand-text text-sm truncate">{c.name}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(c)}>
                    <Pencil size={11} className="mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-brand-error border-brand-error/30"
                    onClick={() => deleteMut.mutate(c.id)} loading={deleteMut.isPending}>
                    <Trash2 size={11} className="mr-1" /> Remove
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
