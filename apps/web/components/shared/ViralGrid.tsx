"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { CategoryIcon } from "./CategoryIcon";

interface ViralSubcategory {
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

interface Props {
  items: ViralSubcategory[];
  onItemClick?: (item: ViralSubcategory) => void;
  emptyCellClick?: (position: number) => void;
  onUpdateImage?: (item: ViralSubcategory) => void;
  editable?: boolean;
}

// Grid layout definitions for each position (1-21)
// Format: [col-start, col-end, row-start, row-end]
const GRID_LAYOUTS: Record<number, [number, number, number, number]> = {
  1:  [1, 3, 1, 3],
  2:  [3, 4, 1, 2],
  3:  [4, 5, 1, 2],
  4:  [5, 7, 1, 2],
  5:  [7, 8, 1, 2],
  6:  [8, 9, 1, 2],
  7:  [3, 4, 2, 3],
  8:  [4, 5, 2, 4],
  9:  [5, 7, 2, 3],
  10: [7, 8, 2, 3],
  11: [8, 9, 2, 3],
  12: [1, 3, 3, 5],
  13: [4, 5, 3, 5],
  14: [5, 6, 3, 4],
  15: [6, 7, 3, 4],
  16: [5, 6, 4, 5],
  17: [6, 7, 4, 5],
  18: [7, 8, 3, 4],
  19: [8, 9, 3, 4],
  20: [7, 8, 4, 5],
  21: [8, 9, 4, 5],
};

function isUrl(s?: string | null) {
  return !!s && (s.startsWith("http") || s.startsWith("/"));
}

export function ViralGrid({ items, onItemClick, emptyCellClick, onUpdateImage, editable = false }: Props) {
  const [hoveredPos, setHoveredPos] = useState<number | null>(null);

  const byPos = new Map<number, ViralSubcategory>();
  items.forEach((i) => { if (i.viralPosition) byPos.set(i.viralPosition, i); });

  const sorted = [...items]
    .filter((i) => i.viralPosition != null)
    .sort((a, b) => (a.viralPosition ?? 0) - (b.viralPosition ?? 0));

  /* ── Reusable tile renderer ── */
  function Tile({ item, pos, large = false }: { item?: ViralSubcategory; pos: number; large?: boolean }) {
    if (!item) {
      return editable ? (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 transition-colors">
          <span className="text-zinc-500 text-xs">+{pos}</span>
        </div>
      ) : (
        <div className="w-full h-full" style={{ background: "#0a0a0a" }} />
      );
    }
    const displayUrl = item.viralImageUrl ?? item.imageUrl;
    const hasImage = isUrl(displayUrl);
    return (
      <div className="relative w-full h-full overflow-hidden group">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl!}
            alt={item.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
            <CategoryIcon name={item.imageUrl} size={large ? 38 : 22} className="text-zinc-500" />
          </div>
        )}
        {editable && onUpdateImage && (
          <button
            className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-full bg-black/60 hover:bg-brand-primary transition-colors opacity-0 group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); onUpdateImage(item); }}
            title="Update viral image"
          >
            <Camera size={11} className="text-white" />
          </button>
        )}
        {/* gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />
        {/* label */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6">
          <p className={`text-white font-bold leading-snug line-clamp-2 ${large ? "text-[13px]" : "text-[10px]"}`}>
            {item.name}
          </p>
          {large && (
            <p className="text-white/50 text-[10px] mt-0.5 truncate">{item.category?.name}</p>
          )}
          {editable && <p className="text-white/30 text-[9px] mt-0.5">#{item.viralPosition}</p>}
        </div>
        {/* editable hover ring */}
        {editable && hoveredPos === pos && (
          <div className="absolute inset-0 ring-2 ring-inset ring-brand-primary pointer-events-none" />
        )}
      </div>
    );
  }

  return (
    <>
      {/* ════════════════════════════════════════════════
          MOBILE — edge-to-edge magazine grid
          ════════════════════════════════════════════════ */}
      <div className="sm:hidden -mx-4 overflow-hidden" style={{ background: "#0a0a0a" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>

          {/* Hero tile: full-width, cinematic */}
          {(() => {
            const hero = editable ? byPos.get(1) : sorted[0];
            const pos = editable ? 1 : (sorted[0]?.viralPosition ?? 1);
            if (!hero && !editable) return null;
            return (
              <div
                key="hero"
                style={{ gridColumn: "1 / -1", height: "58vw", cursor: (hero && onItemClick) || (!hero && emptyCellClick) ? "pointer" : "default" }}
                onClick={() => { if (hero && onItemClick) onItemClick(hero); else if (!hero && emptyCellClick) emptyCellClick(pos); }}
              >
                <Tile item={hero} pos={pos} large />
              </div>
            );
          })()}

          {/* Remaining tiles: 2-col square grid */}
          {(editable
            ? Array.from({ length: 20 }, (_, i) => ({ item: byPos.get(i + 2), pos: i + 2 }))
            : sorted.slice(1).map((s) => ({ item: s, pos: s.viralPosition ?? 0 }))
          ).map(({ item, pos }) => {
            if (!item && !editable) return null;
            return (
              <div
                key={pos}
                style={{
                  aspectRatio: "1 / 1",
                  cursor: (item && onItemClick) || (!item && emptyCellClick) ? "pointer" : "default",
                }}
                onClick={() => {
                  if (item && onItemClick) onItemClick(item!);
                  else if (!item && emptyCellClick) emptyCellClick(pos);
                }}
              >
                <Tile item={item} pos={pos} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          DESKTOP — seamless bento masonry
          ════════════════════════════════════════════════ */}
      <div className="hidden sm:block w-full rounded-2xl overflow-hidden" style={{ background: "#0a0a0a" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 1fr)",
            gridAutoRows: "clamp(70px, 8.5vw, 128px)",
            gap: 3,
          }}
        >
          {Array.from({ length: 21 }, (_, i) => i + 1).map((pos) => {
            const [cs, ce, rs, re] = GRID_LAYOUTS[pos];
            const item = byPos.get(pos);
            const isLarge = (ce - cs) >= 2 || (re - rs) >= 2;
            return (
              <div
                key={pos}
                onMouseEnter={() => setHoveredPos(pos)}
                onMouseLeave={() => setHoveredPos(null)}
                onClick={() => {
                  if (item && onItemClick) onItemClick(item);
                  else if (!item && emptyCellClick) emptyCellClick(pos);
                }}
                style={{
                  gridColumnStart: cs,
                  gridColumnEnd: ce,
                  gridRowStart: rs,
                  gridRowEnd: re,
                  overflow: "hidden",
                  cursor: (item && onItemClick) || (!item && emptyCellClick) ? "pointer" : "default",
                }}
              >
                <Tile item={item} pos={pos} large={isLarge} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export { GRID_LAYOUTS };
export type { ViralSubcategory };
