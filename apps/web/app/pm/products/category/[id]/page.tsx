"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { formatINR } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
}

interface Subcategory {
  id: string;
  name: string;
  categoryName: string;
  categoryType: "PRODUCT" | "SERVICE";
}

interface Product {
  id: string;
  categoryId: string;
  subcategoryId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: string;
  isReplaceable: boolean;
  isRefundable: boolean;
  isReturnable: boolean;
  returnWindowDays: number;
  isActive: boolean;
  category: {
    id: string;
    name: string;
  };
  subcategory: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

interface FormState {
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  basePrice: number;
  isReplaceable: boolean;
  isRefundable: boolean;
  isReturnable: boolean;
  returnWindowDays: number;
  isActive: boolean;
}

const empty = (categoryId = ""): FormState => ({
  categoryId,
  name: "",
  description: "",
  imageUrl: null,
  basePrice: 0,
  isReplaceable: false,
  isRefundable: false,
  isReturnable: false,
  returnWindowDays: 0,
  isActive: true,
});

export default function PMCategoryProductsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState<string>("");

  const { data: category, isLoading: categoryLoading } = useQuery<Category>({
    queryKey: ["pm", "category", params.id],
    queryFn: async () => {
      const all = await api.get<any[]>("/api/pm/categories");
      const cat = all.find((c) => c.id === params.id);
      if (!cat) throw new Error("Category not found");
      return {
        id: cat.id,
        name: cat.name,
        type: cat.type,
      };
    },
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["pm", "subcategories", params.id],
    queryFn: () =>
      api.get(`/api/pm/subcategories?categoryId=${params.id}`),
    enabled: !!category,
  });

  const subcategoryIds = subcategories.map((s) => s.id).join(",");

  const { data: rows = [], isLoading } = useQuery<Product[]>({
    queryKey: ["pm", "products", params.id, search],
    queryFn: () => {
      const qs = new URLSearchParams();
      qs.set("categoryId", params.id);
      if (search) qs.set("search", search);
      return api.get(`/api/pm/products?${qs.toString()}`);
    },
    enabled: !!category,
  });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty());

  const save = useMutation({
    mutationFn: (input: FormState) =>
      editingId
        ? api.put(`/api/pm/products/${editingId}`, input)
        : api.post("/api/pm/products", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm", "products"] });
      qc.invalidateQueries({ queryKey: ["pm", "stats"] });
      toast.success(editingId ? "Product updated" : "Product created");
      reset();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Save failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/pm/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm", "products"] });
      toast.success("Product deleted");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Delete failed"),
  });

  function openCreate() {
    setEditingId(null);
    setForm(empty(params.id));
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      categoryId: p.categoryId,
      name: p.name,
      description: p.description ?? "",
      imageUrl: p.imageUrl,
      basePrice: Number(p.basePrice),
      isReplaceable: p.isReplaceable,
      isRefundable: p.isRefundable,
      isReturnable: p.isReturnable,
      returnWindowDays: p.returnWindowDays,
      isActive: p.isActive,
    });
    setOpen(true);
  }

  function reset() {
    setOpen(false);
    setEditingId(null);
    setForm(empty());
  }

  if (categoryLoading) {
    return <div className="text-brand-textMuted text-sm">Loading…</div>;
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft size={14} />
          </Button>
          <div>
            <h1 className="font-heading text-3xl text-brand-text">
              {category?.name ?? "Category"}
            </h1>
            <p className="text-brand-textMuted text-sm mt-1">
              Products for this category
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          New product
        </Button>
      </div>

      <Card>
        <CardContent className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name…"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-brand-textMuted text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-brand-textMuted text-sm">
            No products found for this category.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rows.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} className="w-full h-32 object-cover" />
              ) : (
                <div className="h-32 bg-brand-bg" />
              )}
              <CardContent className="space-y-2">
                <div>
                  <h3 className="font-heading text-base text-brand-text truncate">
                    {p.name}
                  </h3>
                  <p className="text-xs text-brand-textMuted truncate">
                    {p.category.name}
                    {p.subcategory && ` → ${p.subcategory.name}`}
                  </p>
                </div>
                <p className="font-mono text-lg text-brand-primary">
                  {formatINR(Number(p.basePrice))}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    <Pencil size={14} />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete "${p.name}"?`)) remove.mutate(p.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onClose={reset}
        title={editingId ? "Edit product" : "New product"}
        size="lg"
      >
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <Input
              label="Base price (₹)"
              type="number"
              min={0}
              step={0.01}
              value={form.basePrice}
              onChange={(e) =>
                setForm({ ...form, basePrice: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full p-3 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
            />
          </div>
          <ImageUpload
            label="Image"
            value={form.imageUrl}
            onChange={(url) => setForm({ ...form, imageUrl: url })}
            folder="products"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-brand-text">
              <input
                type="checkbox"
                checked={form.isReplaceable}
                onChange={(e) => setForm({ ...form, isReplaceable: e.target.checked })}
                className="accent-brand-primary"
              />
              Replaceable
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-text">
              <input
                type="checkbox"
                checked={form.isRefundable}
                onChange={(e) => setForm({ ...form, isRefundable: e.target.checked })}
                className="accent-brand-primary"
              />
              Refundable
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-text">
              <input
                type="checkbox"
                checked={form.isReturnable}
                onChange={(e) => setForm({ ...form, isReturnable: e.target.checked })}
                className="accent-brand-primary"
              />
              Returnable
            </label>
            <Input
              label="Return window (days)"
              type="number"
              min={0}
              max={90}
              value={form.returnWindowDays}
              onChange={(e) =>
                setForm({
                  ...form,
                  returnWindowDays: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-brand-text">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="accent-brand-primary"
            />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
            <Button
              onClick={() => save.mutate(form)}
              loading={save.isPending}
              disabled={
                !form.categoryId || form.name.trim().length < 2 || form.basePrice < 0
              }
            >
              {editingId ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
