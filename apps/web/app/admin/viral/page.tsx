"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Pin, Trash2, X, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ViralGrid } from "@/components/shared/ViralGrid";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
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
  const [search, setSearch] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch all subcategories from PM API
  const { data: subcategories = [], isLoading: subsLoading } = useQuery<Subcategory[]>({
    queryKey: ["pm", "subcategories", "all"],
    queryFn: () => api.get("/api/pm/subcategories"),
  });

  // Fetch currently pinned subcategories from User API
  const { data: pinnedItems = [], isLoading: pinnedLoading } = useQuery<PinnedSubcategory[]>({
    queryKey: ["user", "viral-subcategories"],
    queryFn: () => api.get("/api/user/viral-subcategories"),
  });

  const filteredSubcategories = subcategories.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.categoryName.toLowerCase().includes(search.toLowerCase())
  );

  const handleEmptyCellClick = (position: number) => {
    setSelectedPosition(position);
    setIsDialogOpen(true);
  };

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

      // Refresh data
      qc.invalidateQueries({ queryKey: ["pm", "subcategories"] });
      qc.invalidateQueries({ queryKey: ["user", "viral-subcategories"] });
    } catch (err) {
      toast.error("Failed to pin subcategory");
    }
  };

  const handleUnpin = async (item: PinnedSubcategory) => {
    // Find the full subcategory data
    const fullSub = subcategories.find((s) => s.id === item.id);
    if (!fullSub) {
      toast.error("Subcategory not found");
      return;
    }

    try {
      await api.put(`/api/pm/subcategories/${item.id}`, {
        categoryId: fullSub.categoryId,
        name: fullSub.name,
        imageUrl: fullSub.imageUrl,
        isActive: fullSub.isActive,
        isPinned: false,
        viralPosition: null,
      });

      toast.success(`Unpinned "${item.name}" from position ${item.viralPosition}`);

      // Refresh data
      qc.invalidateQueries({ queryKey: ["pm", "subcategories"] });
      qc.invalidateQueries({ queryKey: ["user", "viral-subcategories"] });
    } catch (err) {
      toast.error("Failed to unpin subcategory");
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
            Pin subcategories to the viral grid (21 positions). Click an empty cell to add, or click a pinned item to remove.
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
              <h2 className="font-medium text-brand-text mb-4">Viral Grid Layout</h2>
              <ViralGrid
                items={pinnedItems}
                onItemClick={(item) => handleUnpin(item)}
                emptyCellClick={handleEmptyCellClick}
                editable={true}
              />
              <div className="mt-4 flex items-center gap-6 text-sm text-brand-textMuted">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#111] border border-brand-border" />
                  <span>Occupied (click to unpin)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#1a1a1a] border border-brand-border border-dashed" />
                  <span>Empty (click to pin)</span>
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
                <p className="text-brand-textMuted text-sm">
                  No subcategories pinned yet. Click on an empty cell in the grid above to add one.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pinnedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-brand-bg border border-brand-border"
                    >
                      <div className="w-10 h-10 rounded-lg bg-brand-surface flex items-center justify-center">
                        <CategoryIcon
                          name={item.imageUrl}
                          size={20}
                          className="text-brand-primary"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-text truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-brand-textMuted">
                          {item.category.name} · Position {item.viralPosition}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnpin(item)}
                        className="text-brand-error hover:text-brand-error"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog to select subcategory for pinning */}
      <Dialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedPosition(null);
          setSearch("");
        }}
        title={`Pin to Position ${selectedPosition}`}
        description="Select a subcategory to pin to this grid position."
      >
        <div className="px-6 py-4 space-y-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted"
              size={18}
            />
            <Input
              placeholder="Search subcategories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {filteredSubcategories.length === 0 ? (
              <p className="text-center text-brand-textMuted py-4">
                {search ? "No subcategories found" : "Loading subcategories..."}
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
                  <div className="w-10 h-10 rounded-lg bg-brand-bg flex items-center justify-center">
                    <CategoryIcon
                      name={sub.imageUrl}
                      size={20}
                      className={sub.isPinned ? "text-brand-textMuted" : "text-brand-primary"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      sub.isPinned ? "text-brand-textMuted" : "text-brand-text"
                    }`}>
                      {sub.name}
                    </p>
                    <p className="text-xs text-brand-textMuted">
                      {sub.categoryName} ({sub.categoryType})
                      {sub.isPinned && ` · Already pinned at position ${sub.viralPosition}`}
                    </p>
                  </div>
                  {sub.isPinned ? (
                    <Pin size={16} className="text-brand-primary" />
                  ) : (
                    <Pin size={16} className="text-brand-textMuted" />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-brand-border">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedPosition(null);
                setSearch("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
