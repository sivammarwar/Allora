"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Pin, Trash2, X, Sparkles, Pencil, Plus, LayoutGrid } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BentoGrid, type BentoItem } from "@/components/shared/BentoGrid";
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
  newlyAddedPosition: number | null;
  category: {
    id: string;
    name: string;
    type: "PRODUCT" | "SERVICE";
    imageUrl: string | null;
  };
  [key: string]: unknown;
}

// ─── Shared slot manager (used for both Most Used and Newly Added) ───────────
type SlotField = "viral" | "newly";

function SlotManager({
  label,
  slotField,
  pinnedItems,
  subcategories,
  onRefresh,
}: {
  label: string;
  slotField: SlotField;
  pinnedItems: PinnedSubcategory[];
  subcategories: Subcategory[];
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedPos, setSelectedPos] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<PinnedSubcategory | null>(null);
  const [editImage, setEditImage] = useState("");
  const [editPos, setEditPos] = useState(1);
  const [saving, setSaving] = useState(false);
  const [unpinTarget, setUnpinTarget] = useState<PinnedSubcategory | null>(null);
  const [unpinning, setUnpinning] = useState(false);

  const posField = slotField === "viral" ? "viralPosition" : "newlyAddedPosition";
  const filtered = subcategories.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.categoryName.toLowerCase().includes(search.toLowerCase())
  );

  const bentoItems: BentoItem[] = pinnedItems.map((p) => ({
    id: p.id,
    name: p.name,
    imageUrl: p.imageUrl,
    viralImageUrl: p.viralImageUrl,
    position: (p[posField] as number) ?? 0,
    categoryName: p.category.name,
    categoryType: p.category.type,
  }));

  const openEdit = (item: BentoItem) => {
    const full = pinnedItems.find((p) => p.id === item.id);
    if (!full) return;
    setEditItem(full);
    setEditImage(full.viralImageUrl ?? "");
    setEditPos((full[posField] as number) ?? 1);
  };

  const handleSave = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const fullSub = subcategories.find((s) => s.id === editItem.id);
      await api.patch(`/api/admin/viral-image/${editItem.id}`, { viralImageUrl: editImage.trim() || null });
      if (editPos !== editItem[posField] && fullSub) {
        await api.put(`/api/pm/subcategories/${editItem.id}`, {
          categoryId: fullSub.categoryId, name: fullSub.name, imageUrl: fullSub.imageUrl,
          isActive: fullSub.isActive, isPinned: slotField === "viral" ? true : fullSub.isPinned,
          [posField]: editPos,
        });
      }
      toast.success("Saved");
      onRefresh();
      setEditItem(null);
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  };

  const handleUnpin = async (item: PinnedSubcategory) => {
    const fullSub = subcategories.find((s) => s.id === item.id);
    if (!fullSub) return;
    setUnpinning(true);
    try {
      await api.put(`/api/pm/subcategories/${item.id}`, {
        categoryId: fullSub.categoryId, name: fullSub.name, imageUrl: fullSub.imageUrl,
        isActive: fullSub.isActive,
        isPinned: slotField === "viral" ? false : fullSub.isPinned,
        [posField]: null,
      });
      toast.success(`Removed "${item.name}"`);
      onRefresh();
      setUnpinTarget(null);
      setEditItem(null);
    } catch { toast.error("Failed"); }
    setUnpinning(false);
  };

  const handlePin = async (sub: Subcategory) => {
    if (!selectedPos) return;
    try {
      await api.put(`/api/pm/subcategories/${sub.id}`, {
        categoryId: sub.categoryId, name: sub.name, imageUrl: sub.imageUrl,
        isActive: true,
        isPinned: slotField === "viral" ? true : sub.isPinned,
        [posField]: selectedPos,
      });
      toast.success(`Pinned "${sub.name}" to slot ${selectedPos}`);
      setDialogOpen(false); setSelectedPos(null); setSearch("");
      onRefresh();
    } catch { toast.error("Failed to pin"); }
  };

  return (
    <div className="space-y-6">
      {/* BentoGrid preview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-brand-text">{label} — Bento Preview</h2>
            <span className="text-xs text-brand-textMuted bg-brand-bg px-2 py-1 rounded-md border border-brand-border">
              {pinnedItems.length}/6 filled
            </span>
          </div>
          <BentoGrid
            items={bentoItems}
            editable
            onItemClick={openEdit}
            onEmptyClick={(pos) => { setSelectedPos(pos); setDialogOpen(true); }}
          />
          <div className="mt-4 flex items-center gap-6 text-xs text-brand-textMuted">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-brand-primary/20" /><span>Filled — click to edit</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-gray-100 border border-dashed border-gray-300" /><span>Empty — click to pin</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Slot list */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-medium text-brand-text mb-4">Pinned slots ({pinnedItems.length}/6)</h2>
          {pinnedItems.length === 0 ? (
            <div className="text-center py-10 text-brand-textMuted">
              <Pin size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No slots filled yet. Click any empty cell above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...pinnedItems].sort((a, b) => ((a[posField] as number) ?? 0) - ((b[posField] as number) ?? 0)).map((item) => {
                const img = item.viralImageUrl || (item.imageUrl && (item.imageUrl.startsWith("http") || item.imageUrl.startsWith("/")) ? item.imageUrl : null);
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-brand-bg border border-brand-border hover:border-brand-primary/40 transition-colors">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-brand-surface flex-shrink-0 flex items-center justify-center">
                      {img ? <img src={img} alt={item.name} className="w-full h-full object-cover" /> : <CategoryIcon name={item.imageUrl} size={22} className="text-brand-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded">#{item[posField]}</span>
                      <p className="text-sm font-medium text-brand-text truncate mt-1">{item.name}</p>
                      <p className="text-xs text-brand-textMuted truncate">{item.category.name}</p>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => { setEditItem(item); setEditImage(item.viralImageUrl ?? ""); setEditPos((item[posField] as number) ?? 1); }} className="text-xs h-7 px-2"><Pencil size={12} /> Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => setUnpinTarget(item)} className="text-brand-error hover:text-brand-error h-7 px-2 text-xs"><Trash2 size={12} /> Remove</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} onClick={(e) => { if (e.target === e.currentTarget) setEditItem(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b">
              <div>
                <h2 className="font-heading text-lg text-brand-text">Edit Slot</h2>
                <p className="text-xs text-brand-textMuted mt-0.5">{editItem.name} · {editItem.category.name}</p>
              </div>
              <button onClick={() => setEditItem(null)} className="p-1.5 rounded-full hover:bg-gray-100"><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="px-5 py-5 space-y-5">
              <ImageUpload label="Custom image (shown in bento grid)" value={editImage || null} onChange={(url) => setEditImage(url ?? "")} folder="viral" aspect="wide" />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-text">Position (1–6)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => {
                    const occupied = pinnedItems.some((p) => (p[posField] as number) === n && p.id !== editItem.id);
                    return (
                      <button key={n} onClick={() => !occupied && setEditPos(n)} disabled={occupied} className={`w-9 h-9 text-sm rounded-lg font-mono transition-colors ${editPos === n ? "bg-brand-primary text-white" : occupied ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-brand-bg border border-brand-border text-brand-textMuted hover:border-brand-primary"}`}>{n}</button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <Button variant="ghost" className="text-brand-error hover:text-brand-error" onClick={() => { setUnpinTarget(editItem); setEditItem(null); }}><Trash2 size={14} /> Remove</Button>
              <div className="flex-1" />
              <Button variant="ghost" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={handleSave} loading={saving}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Unpin confirm */}
      {unpinTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }} onClick={(e) => { if (e.target === e.currentTarget) setUnpinTarget(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 shadow-2xl p-6 space-y-4">
            <h2 className="font-heading text-lg text-brand-text">Remove from {label}?</h2>
            <p className="text-sm text-brand-textMuted"><span className="font-medium text-brand-text">{unpinTarget.name}</span> will be removed from slot #{unpinTarget[posField]}.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setUnpinTarget(null)}>Cancel</Button>
              <Button className="bg-brand-error hover:bg-brand-error/90 text-white" loading={unpinning} onClick={() => handleUnpin(unpinTarget)}>Remove</Button>
            </div>
          </div>
        </div>
      )}

      {/* Pin dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setSelectedPos(null); setSearch(""); }} title={`Pin to slot ${selectedPos}`} description="Choose a subcategory for this position.">
        <div className="px-6 py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted" size={18} />
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {filtered.length === 0 ? <p className="text-center text-brand-textMuted py-4">No subcategories found</p> : filtered.map((sub) => {
              const alreadyUsed = pinnedItems.some((p) => p.id === sub.id);
              return (
                <button key={sub.id} onClick={() => handlePin(sub)} disabled={alreadyUsed} className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${alreadyUsed ? "opacity-50 cursor-not-allowed bg-brand-bg/50 border-brand-border" : "bg-brand-surface border-brand-border hover:border-brand-primary"}`}>
                  <div className="w-10 h-10 rounded-lg bg-brand-bg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {sub.imageUrl && (sub.imageUrl.startsWith("http") || sub.imageUrl.startsWith("/")) ? <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover" /> : <CategoryIcon name={sub.imageUrl} size={20} className={alreadyUsed ? "text-brand-textMuted" : "text-brand-primary"} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${alreadyUsed ? "text-brand-textMuted" : "text-brand-text"}`}>{sub.name}</p>
                    <p className="text-xs text-brand-textMuted">{sub.categoryName}{alreadyUsed ? " · Already in this section" : ""}</p>
                  </div>
                  <Pin size={15} className={alreadyUsed ? "text-brand-primary" : "text-brand-textMuted"} />
                </button>
              );
            })}
          </div>
          <div className="flex justify-end pt-2 border-t border-brand-border">
            <Button variant="ghost" onClick={() => { setDialogOpen(false); setSelectedPos(null); setSearch(""); }}>Cancel</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminViralPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"most-used" | "newly-added">("most-used");

  const { data: subcategories = [], isLoading: subsLoading } = useQuery<Subcategory[]>({
    queryKey: ["pm", "subcategories", "all"],
    queryFn: () => api.get("/api/pm/subcategories"),
  });

  const { data: viralItems = [], isLoading: viralLoading } = useQuery<PinnedSubcategory[]>({
    queryKey: ["user", "viral-subcategories"],
    queryFn: () => api.get("/api/user/viral-subcategories"),
  });

  const { data: newlyItems = [], isLoading: newlyLoading } = useQuery<PinnedSubcategory[]>({
    queryKey: ["user", "newly-added-subcategories"],
    queryFn: () => api.get("/api/user/newly-added-subcategories"),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pm", "subcategories"] });
    qc.invalidateQueries({ queryKey: ["user", "viral-subcategories"] });
    qc.invalidateQueries({ queryKey: ["user", "newly-added-subcategories"] });
  };

  const isLoading = subsLoading || viralLoading || newlyLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-brand-text flex items-center gap-2">
          <LayoutGrid className="text-brand-primary" size={24} />
          Featured Sections Manager
        </h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Manage the 6-slot bento grids for Most Used and Newly Added sections on the user dashboard.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-brand-bg rounded-xl p-1 w-fit border border-brand-border">
        {([["most-used", "Most Used", Sparkles], ["newly-added", "Newly Added", Plus]] as const).map(([id, lbl, Icon]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? "bg-white text-brand-primary shadow-sm" : "text-brand-textMuted hover:text-brand-text"}`}
          >
            <Icon size={15} />
            {lbl}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        </div>
      ) : activeTab === "most-used" ? (
        <SlotManager label="Most Used" slotField="viral" pinnedItems={viralItems} subcategories={subcategories} onRefresh={refresh} />
      ) : (
        <SlotManager label="Newly Added" slotField="newly" pinnedItems={newlyItems} subcategories={subcategories} onRefresh={refresh} />
      )}
    </div>
  );
}
