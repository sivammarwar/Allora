"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileCode2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/shared/ImageUpload";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Category {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
}

interface PageContent {
  html?: string;
  assets?: Array<{ name: string; url: string }>;
}

interface Subcategory {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryType: "PRODUCT" | "SERVICE";
  name: string;
  nameHi: string | null;
  descriptionHi: string | null;
  imageUrl: string | null;
  pageContent: PageContent | null;
  isActive: boolean;
  isPinned: boolean;
  viralPosition: number | null;
  productCount: number;
  createdAt: string;
}

interface FormState {
  categoryId: string;
  name: string;
  nameHi: string;
  descriptionHi: string;
  imageUrl: string | null;
  isActive: boolean;
  isPinned: boolean;
  viralPosition: number | null;
}

const emptyForm = (categoryId = ""): FormState => ({
  categoryId,
  name: "",
  nameHi: "",
  descriptionHi: "",
  imageUrl: null,
  isActive: true,
  isPinned: false,
  viralPosition: null,
});

export default function PMSubcategoriesPage() {
  const qc = useQueryClient();
  const [filterCategory, setFilterCategory] = useState<string>("");

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["pm", "categories", "compact"],
    queryFn: async () => {
      const all = await api.get<any[]>("/api/pm/categories");
      return all
        .filter((c) => c.type === "SERVICE")
        .map((c) => ({ id: c.id, name: c.name, type: c.type }));
    },
  });

  const { data: rows = [], isLoading } = useQuery<Subcategory[]>({
    queryKey: ["pm", "subcategories", filterCategory],
    queryFn: async () => {
      const all = await api.get<Subcategory[]>(
        filterCategory
          ? `/api/pm/subcategories?categoryId=${filterCategory}`
          : "/api/pm/subcategories"
      );
      return all.filter((s) => s.categoryType === "SERVICE");
    },
  });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  // Service page builder state
  const [pageOpen, setPageOpen] = useState<Subcategory | null>(null);
  const [pageHtml, setPageHtml] = useState("");
  const [pageAssets, setPageAssets] = useState<File[]>([]);
  const [pageSaving, setPageSaving] = useState(false);

  const selectedCategoryType = useMemo(
    () => categories.find((c) => c.id === form.categoryId)?.type ?? null,
    [categories, form.categoryId]
  );

  const save = useMutation({
    mutationFn: (input: FormState) => {
      const payload = {
        ...input,
        nameHi: input.nameHi.trim() || null,
        descriptionHi: input.descriptionHi.trim() || null,
      };
      return editingId
        ? api.put(`/api/pm/subcategories/${editingId}`, payload)
        : api.post("/api/pm/subcategories", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm", "subcategories"] });
      qc.invalidateQueries({ queryKey: ["pm", "stats"] });
      toast.success(editingId ? "Subcategory updated" : "Subcategory created");
      reset();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Save failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/pm/subcategories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm", "subcategories"] });
      toast.success("Subcategory deleted");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Delete failed"),
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(filterCategory || categories[0]?.id || ""));
    setOpen(true);
  }

  function openEdit(s: Subcategory) {
    setEditingId(s.id);
    setForm({
      categoryId: s.categoryId,
      name: s.name,
      nameHi: s.nameHi ?? "",
      descriptionHi: s.descriptionHi ?? "",
      imageUrl: s.imageUrl,
      isActive: s.isActive,
      isPinned: s.isPinned,
      viralPosition: s.viralPosition,
    });
    setOpen(true);
  }

  function reset() {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function openPageBuilder(s: Subcategory) {
    setPageOpen(s);
    setPageHtml(s.pageContent?.html ?? "");
    setPageAssets([]);
  }

  async function savePage() {
    if (!pageOpen) return;
    if (pageHtml.trim().length === 0) {
      toast.error("HTML content is required");
      return;
    }
    setPageSaving(true);
    try {
      const fd = new FormData();
      fd.append("html", pageHtml);
      pageAssets.forEach((f) => fd.append("assets", f));
      const res = await fetch(
        `${API_URL}/api/pm/subcategories/${pageOpen.id}/upload-page`,
        { method: "POST", body: fd, credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new ApiError(
          (data as any)?.error ?? "Save failed",
          res.status,
          data
        );
      }
      qc.invalidateQueries({ queryKey: ["pm", "subcategories"] });
      toast.success("Service page saved");
      setPageOpen(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setPageSaving(false);
    }
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">Subcategories</h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Group products under subcategories. For services, build the customer-facing page here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-10 px-3 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
          <Button onClick={openCreate} disabled={categories.length === 0}>
            <Plus size={16} />
            New
          </Button>
        </div>
      </div>

      {categories.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-brand-textMuted">
            Create at least one category before adding subcategories.
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-brand-textMuted text-sm">Loading…</div>
      ) : rows.length === 0 && categories.length > 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-brand-textMuted text-sm">
            No subcategories match the current filter.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-bg border-b border-brand-border">
                <tr className="text-left text-brand-textMuted">
                  <th className="px-4 py-3 font-medium">Image</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">हिंदी नाम</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Page</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {rows.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-[rgba(192,98,106,0.04)]"
                  >
                    <td className="px-4 py-3">
                      {s.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.imageUrl}
                          alt={s.name}
                          className="h-10 w-10 object-cover rounded-sm border border-brand-border"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-sm bg-brand-bg border border-brand-border flex items-center justify-center text-brand-textMuted text-xs">
                          No image
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-brand-text">{s.name}</td>
                    <td className="px-4 py-3 text-brand-textMuted">
                      {s.nameHi ? (
                        <span className="text-brand-text">{s.nameHi}</span>
                      ) : (
                        <span className="text-xs text-brand-warning italic">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-brand-text">{s.categoryName}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-sm bg-brand-bg border border-brand-border">
                        {s.categoryType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand-textMuted">
                      {s.categoryType === "PRODUCT" ? s.productCount : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {s.categoryType === "SERVICE" ? (
                        s.pageContent?.html ? (
                          <span className="text-xs text-brand-success">Configured</span>
                        ) : (
                          <span className="text-xs text-brand-warning">Empty</span>
                        )
                      ) : (
                        <span className="text-xs text-brand-textMuted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {s.categoryType === "SERVICE" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPageBuilder(s)}
                          >
                            <FileCode2 size={14} />
                            Page
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete "${s.name}"?`)) remove.mutate(s.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit / Create dialog */}
      <Dialog
        open={open}
        onClose={reset}
        title={editingId ? "Edit subcategory" : "New subcategory"}
        size="md"
      >
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Category
            </label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full h-10 px-3 rounded-sm bg-brand-surface border border-brand-border text-brand-text"
              disabled={!!editingId}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Name (English)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
          <Input
            label="Name in Hindi / हिंदी में नाम (optional)"
            value={form.nameHi}
            onChange={(e) => setForm({ ...form, nameHi: e.target.value })}
            placeholder="जैसे: पुरुष सैलून"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Description in Hindi / हिंदी विवरण (optional)
            </label>
            <textarea
              value={form.descriptionHi}
              onChange={(e) => setForm({ ...form, descriptionHi: e.target.value })}
              rows={3}
              placeholder="जैसे: बालों की कटाई और स्टाइलिंग…"
              className="w-full p-3 rounded-sm bg-brand-bg border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary resize-none"
            />
          </div>
          <ImageUpload
            label="Image"
            value={form.imageUrl}
            onChange={(url) => setForm({ ...form, imageUrl: url })}
            folder="subcategories"
            aspect="square"
          />
          <label className="flex items-center gap-2 text-sm text-brand-text">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="accent-brand-primary"
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-text">
            <input
              type="checkbox"
              checked={form.isPinned}
              onChange={(e) =>
                setForm({
                  ...form,
                  isPinned: e.target.checked,
                  viralPosition: e.target.checked ? form.viralPosition ?? 1 : null,
                })
              }
              className="accent-brand-primary"
            />
            Pin to Viral Section
          </label>
          {form.isPinned && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">
                Viral Grid Position (1-21)
              </label>
              <input
                type="number"
                min={1}
                max={21}
                value={form.viralPosition ?? 1}
                onChange={(e) =>
                  setForm({
                    ...form,
                    viralPosition: Math.min(21, Math.max(1, parseInt(e.target.value) || 1)),
                  })
                }
                className="w-full h-10 px-3 rounded-sm bg-brand-surface border border-brand-border text-brand-text focus:outline-none focus:border-brand-primary"
              />
              <p className="mt-1 text-xs text-brand-textMuted">
                Position in the viral grid (1-21). Each position corresponds to a specific cell in the 7x4 masonry layout.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
            <Button
              onClick={() => save.mutate(form)}
              loading={save.isPending}
              disabled={!form.categoryId || form.name.trim().length < 2}
            >
              {editingId ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Service page builder */}
      <Dialog
        open={!!pageOpen}
        onClose={() => setPageOpen(null)}
        title={`Service page · ${pageOpen?.name ?? ""}`}
        description="Paste the HTML for the customer-facing service page and attach optional images."
        size="xl"
      >
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              HTML content
            </label>
            <textarea
              value={pageHtml}
              onChange={(e) => setPageHtml(e.target.value)}
              rows={14}
              spellCheck={false}
              placeholder="<section>...</section>"
              className="w-full p-3 rounded-sm bg-brand-bg border border-brand-border text-sm font-mono text-brand-text focus:outline-none focus:border-brand-primary"
            />
            <p className="mt-1 text-xs text-brand-textMuted">
              Max 200KB. Will be rendered server-side on the user-facing subcategory page.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Asset images (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPageAssets(Array.from(e.target.files ?? []))}
              className="block w-full text-sm text-brand-text file:mr-3 file:py-2 file:px-3 file:rounded-sm file:border file:border-brand-border file:bg-brand-bg file:text-brand-text"
            />
            {pageAssets.length > 0 && (
              <p className="mt-1 text-xs text-brand-textMuted">
                {pageAssets.length} file(s) selected
              </p>
            )}
            {pageOpen?.pageContent?.assets && pageOpen.pageContent.assets.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-brand-textMuted mb-2">Existing assets:</p>
                <div className="flex flex-wrap gap-2">
                  {pageOpen.pageContent.assets.map((a) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={a.url}
                      src={a.url}
                      alt={a.name}
                      className="h-16 w-16 object-cover rounded-sm border border-brand-border"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setPageOpen(null)}>
              Cancel
            </Button>
            <Button onClick={savePage} loading={pageSaving}>
              Save page
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
