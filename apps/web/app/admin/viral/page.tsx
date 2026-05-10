"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Pin, Trash2, X, Sparkles, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ViralGrid } from "@/components/shared/ViralGrid";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { toast } from "sonner";

interface Subcategory {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryType: "PRODUCT" | "SERVICE";
  name: string;
  imageUrl: string | null;
  isActive: boolean;
  isPinned: boolean;
  viralPosition: number | null;
  productCount: number;
}

interface PinnedSubcategory {
  id: string;
  name: string;
  imageUrl: string | null;
  viralImageUrl?: string | null;
  viralPosition: number | null;
  category: {
    id: string;
    name: string;
    type: "PRODUCT" | "SERVICE";
    imageUrl: string | null;
  };
  productCount: number;
}

export default function AdminViralPage() {
  const qc = useQueryClient();

  // Pin-dialog state
  const [search, setSearch] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Unified edit-modal state
  const [editItem, setEditItem] = useState<PinnedSubcategory | null>(null);
  const [editViralImage, setEditViralImage] = useState("");
  const [editPosition, setEditPosition] = useState<number>(1);
  const [editSaving, setEditSaving] = useState(false);

  // Unpin confirm state
  const [unpinTarget, setUnpinTarget] = useState<PinnedSubcategory | null>(null);
  const [unpinning, setUnpinning] = useState(false);

  // Data
  const { data: subcategories = [], isLoading: subsLoading } = useQuery<Subcategory[]>({
    queryKey: ["pm", "subcategories", "all"],
    queryFn: () => api.get("/api/pm/subcategories"),
  });

  const { data: pinnedItems = [], isLoading: pinnedLoading } = useQuery<PinnedSubcategory[]>({
    queryKey: ["user", "viral-subcategories"],
    queryFn: () => api.get("/api/user/viral-subcategories"),
  });

  const filteredSubcategories = subcategories.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.categoryName.toLowerCase().includes(search.toLowerCase())
  );

  // ── Open edit modal ──────────────────────────────────────────────────────
  const openEdit = (item: PinnedSubcategory) => {
    setEditItem(item);
    setEditViralImage(item.viralImageUrl ?? "");
    setEditPosition(item.viralPosition ?? 1);
  };

  // ── Save edits (image + position) ────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editItem) return;
    setEditSaving(true);
    try {
      const fullSub = subcategories.find((s) => s.id === editItem.id);

      // Update viral image
      await api.patch(`/api/admin/viral-image/${editItem.id}`, {
        viralImageUrl: editViralImage.trim() || null,
      });

      // Update position if changed
      if (editPosition !== editItem.viralPosition && fullSub) {
        await api.put(`/api/pm/subcategories/${editItem.id}`, {
          categoryId: fullSub.categoryId,
          name: fullSub.name,
          imageUrl: fullSub.imageUrl,
          isActive: fullSub.isActive,
          isPinned: true,
          viralPosition: editPosition,
        });
      }

      toast.success("Saved changes");
      qc.invalidateQueries({ queryKey: ["pm", "subcategories"] });
      qc.invalidateQueries({ queryKey: ["user", "viral-subcategories"] });
      setEditItem(null);
    } catch {
      toast.error("Failed to save changes");
    }
    setEditSaving(false);
  };

  // ── Unpin ────────────────────────────────────────────────────────────────
  const handleUnpin = async (item: PinnedSubcategory) => {
    const fullSub = subcategories.find((s) => s.id === item.id);
    if (!fullSub) { toast.error("Subcategory not found"); return; }
    setUnpinning(true);
    try {
      await api.put(`/api/pm/subcategories/${item.id}`, {
        categoryId: fullSub.categoryId,
        name: fullSub.name,
        imageUrl: fullSub.imageUrl,
        isActive: fullSub.isActive,
        isPinned: false,
        viralPosition: null,
      });
      toast.success(`Unpinned "${item.name}"`);
      qc.invalidateQueries({ queryKey: ["pm", "subcategories"] });
      qc.invalidateQueries({ queryKey: ["user", "viral-subcategories"] });
      setUnpinTarget(null);
      setEditItem(null);
    } catch {
      toast.error("Failed to unpin");
    }
    setUnpinning(false);
  };

  // ── Pin subcategory to selected empty cell ───────────────────────────────
  const handlePinSubcategory = async (subcategory: Subcategory) => {
    if (!selectedPosition) return;
    try {
      await api.put(`/api/pm/subcategories/${subcategory.id}`, {
        categoryId: subcategory.categoryId,
        name: subcategory.name,
        imageUrl: subcategory.imageUrl,
        isActive: true,
        isPinned: true,
        viralPosition: selectedPosition,
      });
      toast.success(`Pinned "${subcategory.name}" to position ${selectedPosition}`);
      setIsDialogOpen(false);
      setSelectedPosition(null);
      setSearch("");
      qc.invalidateQueries({ queryKey: ["pm", "subcategories"] });
      qc.invalidateQueries({ queryKey: ["user", "viral-subcategories"] });
    } catch {
      toast.error("Failed to pin subcategory");
    }
  };

  const isLoading = subsLoading || pinnedLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-brand-text flex items-center gap-2">
            <Sparkles className="text-brand-primary" size={24} />
            Viral Section Manager
          </h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Manage the viral grid (21 positions). Click an empty cell to pin a subcategory, or click a pinned cell to edit it.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        </div>
      ) : (
        <>
          {/* Viral Grid */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-brand-text">Viral Grid Layout</h2>
                <span className="text-xs text-brand-textMuted bg-brand-bg px-2 py-1 rounded-md border border-brand-border">
                  {pinnedItems.length}/21 filled
                </span>
              </div>
              <ViralGrid
                items={pinnedItems}
                onItemClick={(item) => openEdit(item as PinnedSubcategory)}
                emptyCellClick={(pos) => { setSelectedPosition(pos); setIsDialogOpen(true); }}
                onUpdateImage={(item) => openEdit(item as PinnedSubcategory)}
                editable={true}
              />
              <div className="mt-4 flex items-center gap-6 text-xs text-brand-textMuted">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#222]" />
                  <span>Pinned — click to edit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#0a0a0a] border border-dashed border-zinc-700" />
                  <span>Empty — click to pin</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Currently Pinned List */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-medium text-brand-text mb-4">
                Currently Pinned ({pinnedItems.length}/21)
              </h2>
              {pinnedItems.length === 0 ? (
                <div className="text-center py-10 text-brand-textMuted">
                  <Pin size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No subcategories pinned yet.</p>
                  <p className="text-xs mt-1">Click any empty cell in the grid above to add one.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...pinnedItems]
                    .sort((a, b) => (a.viralPosition ?? 0) - (b.viralPosition ?? 0))
                    .map((item) => {
                      const displayImage =
                        item.viralImageUrl ||
                        (item.imageUrl &&
                        (item.imageUrl.startsWith("http") || item.imageUrl.startsWith("/"))
                          ? item.imageUrl
                          : null);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-brand-bg border border-brand-border hover:border-brand-primary/40 transition-colors"
                        >
                          {/* Thumbnail */}
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-brand-surface flex-shrink-0 flex items-center justify-center">
                            {displayImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={displayImage} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <CategoryIcon name={item.imageUrl} size={22} className="text-brand-primary" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded">
                                #{item.viralPosition}
                              </span>
                              {item.viralImageUrl && (
                                <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                  Custom image
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-brand-text truncate mt-1">{item.name}</p>
                            <p className="text-xs text-brand-textMuted truncate">{item.category.name}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(item)}
                              className="text-xs h-7 px-2"
                            >
                              <Pencil size={12} /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUnpinTarget(item)}
                              className="text-brand-error hover:text-brand-error h-7 px-2 text-xs"
                            >
                              <Trash2 size={12} /> Unpin
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Edit modal ───────────────────────────────────────────────────── */}
      {editItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditItem(null); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
              <div>
                <h2 className="font-heading text-lg text-brand-text">Edit Viral Block</h2>
                <p className="text-xs text-brand-textMuted mt-0.5">{editItem.name} · {editItem.category.name}</p>
              </div>
              <button onClick={() => setEditItem(null)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-5">
              {/* Image upload */}
              <ImageUpload
                label="Viral Image (only shown in viral section)"
                value={editViralImage || null}
                onChange={(url) => setEditViralImage(url ?? "")}
                folder="viral"
                aspect="wide"
              />

              {/* Position picker */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-text">
                  Grid Position (1 – 21)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={21}
                    value={editPosition}
                    onChange={(e) =>
                      setEditPosition(Math.min(21, Math.max(1, parseInt(e.target.value) || 1)))
                    }
                    className="w-24 h-10 px-3 rounded-lg border border-brand-border bg-brand-surface text-brand-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  />
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: 21 }, (_, i) => i + 1).map((n) => {
                      const occupied = pinnedItems.some(
                        (p) => p.viralPosition === n && p.id !== editItem.id
                      );
                      return (
                        <button
                          key={n}
                          onClick={() => !occupied && setEditPosition(n)}
                          disabled={occupied}
                          className={`w-7 h-7 text-xs rounded-md font-mono transition-colors ${
                            editPosition === n
                              ? "bg-brand-primary text-white"
                              : occupied
                              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                              : "bg-brand-bg border border-brand-border text-brand-textMuted hover:border-brand-primary hover:text-brand-primary"
                          }`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="text-[10px] text-brand-textMuted mt-1.5">Grey cells are already occupied by another subcategory.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex gap-2">
              <Button
                variant="ghost"
                className="text-brand-error hover:text-brand-error"
                onClick={() => { setUnpinTarget(editItem); setEditItem(null); }}
              >
                <Trash2 size={14} /> Unpin
              </Button>
              <div className="flex-1" />
              <Button variant="ghost" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} loading={editSaving}>Save changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unpin confirm ────────────────────────────────────────────────── */}
      {unpinTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setUnpinTarget(null); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 shadow-2xl p-6 space-y-4">
            <h2 className="font-heading text-lg text-brand-text">Unpin subcategory?</h2>
            <p className="text-sm text-brand-textMuted">
              <span className="font-medium text-brand-text">{unpinTarget.name}</span> will be removed from position #{unpinTarget.viralPosition} in the viral grid.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setUnpinTarget(null)}>Cancel</Button>
              <Button
                className="bg-brand-error hover:bg-brand-error/90 text-white"
                loading={unpinning}
                onClick={() => handleUnpin(unpinTarget)}
              >
                Yes, unpin
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pin-to-position dialog ───────────────────────────────────────── */}
      <Dialog
        open={isDialogOpen}
        onClose={() => { setIsDialogOpen(false); setSelectedPosition(null); setSearch(""); }}
        title={`Pin subcategory to position ${selectedPosition}`}
        description="Choose a subcategory to place at this grid position."
      >
        <div className="px-6 py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted" size={18} />
            <Input
              placeholder="Search subcategories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {filteredSubcategories.length === 0 ? (
              <p className="text-center text-brand-textMuted py-4">
                {search ? "No subcategories found" : "Loading…"}
              </p>
            ) : (
              filteredSubcategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handlePinSubcategory(sub)}
                  disabled={sub.isPinned}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    sub.isPinned
                      ? "bg-brand-bg/50 border-brand-border opacity-50 cursor-not-allowed"
                      : "bg-brand-surface border-brand-border hover:border-brand-primary"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-bg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {sub.imageUrl && (sub.imageUrl.startsWith("http") || sub.imageUrl.startsWith("/")) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover" />
                    ) : (
                      <CategoryIcon
                        name={sub.imageUrl}
                        size={20}
                        className={sub.isPinned ? "text-brand-textMuted" : "text-brand-primary"}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${sub.isPinned ? "text-brand-textMuted" : "text-brand-text"}`}>
                      {sub.name}
                    </p>
                    <p className="text-xs text-brand-textMuted">
                      {sub.categoryName} ({sub.categoryType})
                      {sub.isPinned && ` · Already at position ${sub.viralPosition}`}
                    </p>
                  </div>
                  <Pin size={15} className={sub.isPinned ? "text-brand-primary" : "text-brand-textMuted"} />
                </button>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-brand-border">
            <Button variant="ghost" onClick={() => { setIsDialogOpen(false); setSelectedPosition(null); setSearch(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
