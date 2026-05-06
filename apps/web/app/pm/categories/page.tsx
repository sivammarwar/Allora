"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/shared/ImageUpload";

type CategoryType = "PRODUCT" | "SERVICE";

interface Category {
  id: string;
  name: string;
  type: CategoryType;
  imageUrl: string | null;
  isActive: boolean;
  subcategoryCount: number;
  createdAt: string;
}

interface FormState {
  name: string;
  type: CategoryType;
  imageUrl: string | null;
  isActive: boolean;
}

const empty: FormState = {
  name: "",
  type: "PRODUCT",
  imageUrl: null,
  isActive: true,
};

export default function PMCategoriesPage() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery<Category[]>({
    queryKey: ["pm", "categories"],
    queryFn: () => api.get("/api/pm/categories"),
  });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const save = useMutation({
    mutationFn: (input: FormState) =>
      editingId
        ? api.put(`/api/pm/categories/${editingId}`, input)
        : api.post("/api/pm/categories", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm", "categories"] });
      qc.invalidateQueries({ queryKey: ["pm", "stats"] });
      toast.success(editingId ? "Category updated" : "Category created");
      reset();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Save failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean; deletedSubcategories?: number }>(`/api/pm/categories/${id}`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pm", "categories"] });
      const subCount = data?.deletedSubcategories ?? 0;
      toast.success(subCount > 0 
        ? `Category and ${subCount} subcategory(s) deleted` 
        : "Category deleted");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Delete failed"),
  });

  function openCreate() {
    setEditingId(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(c: Category) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      type: c.type,
      imageUrl: c.imageUrl,
      isActive: c.isActive,
    });
    setOpen(true);
  }
  function reset() {
    setOpen(false);
    setEditingId(null);
    setForm(empty);
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">Categories</h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Define what kinds of products and services exist on the platform.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          New category
        </Button>
      </div>

      {isLoading ? (
        <div className="text-brand-textMuted text-sm">Loading…</div>
      ) : (
        (() => {
          const filtered = rows.filter((c) => !["Product", "Service"].includes(c.name));
          if (filtered.length === 0) {
            return (
              <Card>
                <CardContent className="py-12 text-center text-brand-textMuted text-sm">
                  No categories yet.
                </CardContent>
              </Card>
            );
          }
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => (
                <Card key={c.id} className="overflow-hidden">
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="shrink-0 h-12 w-12 rounded-sm bg-brand-bg border border-brand-border overflow-hidden">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.imageUrl}
                          alt={c.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-brand-textMuted text-xs">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading text-lg text-brand-text truncate">
                        {c.name}
                      </h3>
                      <p className="text-xs text-brand-textMuted">
                        {c.subcategoryCount} subcategor
                        {c.subcategoryCount === 1 ? "y" : "ies"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] uppercase tracking-widest font-mono px-2 py-1 rounded-sm ${
                      c.type === "PRODUCT"
                        ? "bg-brand-primary/10 text-brand-primary"
                        : "bg-brand-secondary/10 text-brand-secondary"
                    }`}
                  >
                    {c.type}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-brand-textMuted">
                  <span>{c.isActive ? "Active" : "Inactive"}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                    <Pencil size={14} />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete "${c.name}"?`)) remove.mutate(c.id);
                    }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
              ))}
            </div>
          );
        })()
      )}

      <Dialog
        open={open}
        onClose={reset}
        title={editingId ? "Edit category" : "New category"}
        size="md"
      >
        <div className="px-6 py-5 space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Home cleaning"
            autoFocus
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as CategoryType })
              }
              className="w-full h-10 px-3 rounded-sm bg-brand-surface border border-brand-border text-brand-text focus:outline-none focus:border-brand-primary"
            >
              <option value="PRODUCT">Product</option>
              <option value="SERVICE">Service</option>
            </select>
          </div>
          <ImageUpload
            label="Image"
            value={form.imageUrl}
            onChange={(url) => setForm({ ...form, imageUrl: url })}
            folder="categories"
            aspect="square"
          />
          <label className="flex items-center gap-2 text-sm text-brand-text">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="accent-brand-primary"
            />
            Active (visible to customers)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
            <Button
              onClick={() => save.mutate(form)}
              loading={save.isPending}
              disabled={form.name.trim().length < 2}
            >
              {editingId ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
