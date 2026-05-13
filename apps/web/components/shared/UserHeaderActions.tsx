"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MapPin, X, Loader2, ChevronRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { detectLocation } from "@/lib/location";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { useT } from "@/lib/i18n";

interface SubcategoryResult {
  id: string;
  name: string;
  imageUrl: string | null;
  categoryId: string;
  categoryName: string;
  categoryType: "PRODUCT" | "SERVICE";
  isActive: boolean;
  isPinned: boolean;
  viralPosition: number | null;
}

export function UserHeaderActions() {
  const router = useRouter();
  const t = useT();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: allSubs = [] } = useQuery<SubcategoryResult[]>({
    queryKey: ["user", "all-subcategories-search"],
    queryFn: () => api.get("/api/user/subcategories"),
    staleTime: 5 * 60 * 1000,
  });

  const trimmed = query.trim();

  const activeSubs = allSubs.filter((s) => s.isActive);

  const results = trimmed.length < 2
    ? []
    : activeSubs
        .filter(
          (s) =>
            s.name.toLowerCase().includes(trimmed.toLowerCase()) ||
            s.categoryName.toLowerCase().includes(trimmed.toLowerCase())
        )
        .slice(0, 15);

  const trendingChips = activeSubs
    .filter((s) => s.isPinned || s.viralPosition != null)
    .sort((a, b) => (a.viralPosition ?? 999) - (b.viralPosition ?? 999))
    .slice(0, 8);

  // Group by category
  const grouped = results.reduce<
    Record<string, { catName: string; catType: string; items: SubcategoryResult[] }>
  >((acc, s) => {
    if (!acc[s.categoryId])
      acc[s.categoryId] = { catName: s.categoryName, catType: s.categoryType, items: [] };
    acc[s.categoryId].items.push(s);
    return acc;
  }, {});

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      document.body.style.overflow = "hidden";
    } else {
      setQuery("");
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [searchOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleUpdateLocation = async () => {
    setLocating(true);
    try {
      await detectLocation();
      window.location.reload();
    } catch {
      // ignore — browser will show permission dialog
    }
    setLocating(false);
  };

  const handleSelect = (sub: SubcategoryResult) => {
    setSearchOpen(false);
    router.push(`/dashboard/subcategory/${sub.id}`);
  };

  return (
    <>
      {/* ── Header buttons ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {/* Search pill */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all rounded-full pl-3 pr-4 h-8"
        >
          <Search size={13} className="text-gray-500 flex-shrink-0" />
          <span className="text-xs font-medium text-gray-500 hidden sm:block whitespace-nowrap">
            {t("search.pill")}
          </span>
        </button>

        {/* Location pin */}
        <button
          onClick={handleUpdateLocation}
          disabled={locating}
          title="Update location"
          className="w-8 h-8 rounded-full flex items-center justify-center bg-brand-primary/10 hover:bg-brand-primary/20 active:scale-95 transition-all"
        >
          {locating ? (
            <Loader2 size={13} className="text-brand-primary animate-spin" />
          ) : (
            <MapPin size={13} className="text-brand-primary" />
          )}
        </button>
      </div>

      {/* ── Search overlay ───────────────────────────────────────────────── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex flex-col"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
        >
          {/* Panel */}
          <div className="bg-white flex flex-col" style={{ maxHeight: "90dvh", minHeight: "60dvh" }}>
            {/* ── Top bar ── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <div className="flex-1 flex items-center gap-3 bg-gray-100 rounded-2xl px-4 h-11">
                <Search size={16} className="text-gray-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("search.placeholder")}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                />
                {query && (
                  <button onClick={() => setQuery("")}>
                    <X size={14} className="text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setSearchOpen(false)}
                className="text-sm font-medium text-brand-primary px-1 py-1 whitespace-nowrap"
              >
                {t("search.cancel")}
              </button>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto">

              {/* Empty state — no query */}
              {trimmed.length < 2 && (
                <div className="px-5 pt-6 pb-4 space-y-5">
                  {/* Trending */}
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                      {t("search.trending")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {trendingChips.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setQuery(sub.name)}
                          className="flex items-center gap-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-brand-primary/10 hover:text-brand-primary px-3 py-1.5 rounded-full transition-colors"
                        >
                          <Sparkles size={11} className="text-brand-primary" />
                          {sub.name}
                        </button>
                      ))}
                      {trendingChips.length === 0 && activeSubs.slice(0, 6).map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setQuery(sub.name)}
                          className="flex items-center gap-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-brand-primary/10 hover:text-brand-primary px-3 py-1.5 rounded-full transition-colors"
                        >
                          <Sparkles size={11} className="text-brand-primary" />
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Popular categories */}
                  {allSubs.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                        {t("search.allCategories")}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from(
                          new Map(activeSubs.map((s) => [s.categoryId, { id: s.categoryId, name: s.categoryName }])).values()
                        ).slice(0, 6).map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setQuery(cat.name)}
                            className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 hover:bg-brand-primary/5 text-left transition-colors border border-gray-100"
                          >
                            <div className="w-7 h-7 rounded-lg bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                              <CategoryIcon name={null} size={13} className="text-brand-primary" />
                            </div>
                            <span className="text-xs font-medium text-gray-700 truncate">{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No results */}
              {trimmed.length >= 2 && results.length === 0 && (
                <div className="py-16 flex flex-col items-center gap-3 text-center px-8">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Search size={22} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">{t("search.noResults", { query: trimmed })}</p>
                  <p className="text-xs text-gray-400">{t("search.tryDifferent")}</p>
                </div>
              )}

              {/* Results */}
              {results.length > 0 && (
                <div className="py-2">
                  {Object.entries(grouped).map(([catId, group]) => (
                    <div key={catId}>
                      {/* Category header */}
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {group.catName}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          group.catType === "SERVICE"
                            ? "bg-blue-50 text-blue-500"
                            : "bg-orange-50 text-orange-500"
                        }`}>
                          {group.catType === "SERVICE" ? t("search.service") : t("search.product")}
                        </span>
                      </div>
                      {group.items.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleSelect(sub)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left border-b border-gray-50"
                        >
                          <div className="w-10 h-10 rounded-xl bg-brand-primary/8 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100">
                            {sub.imageUrl &&
                            (sub.imageUrl.startsWith("http") || sub.imageUrl.startsWith("/")) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={sub.imageUrl}
                                alt={sub.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <CategoryIcon name={sub.imageUrl} size={16} className="text-brand-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{sub.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{group.catName}</p>
                          </div>
                          <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tap-outside to close */}
          <div className="flex-1" onClick={() => setSearchOpen(false)} />
        </div>
      )}
    </>
  );
}
