"use client";

import { useState } from "react";
import { CategoryIcon } from "./CategoryIcon";

interface ViralSubcategory {
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

interface Props {
  items: ViralSubcategory[];
  onItemClick?: (item: ViralSubcategory) => void;
  emptyCellClick?: (position: number) => void;
  editable?: boolean;
}

// Grid layout definitions for each position (1-21)
// Format: [col-start, col-end, row-start, row-end]
const GRID_LAYOUTS: Record<number, [number, number, number, number]> = {
  1: [1, 3, 1, 3],    // tall-wide left block
  2: [3, 4, 1, 2],    // medium square
  3: [4, 5, 1, 2],    // tall narrow
  4: [5, 7, 1, 2],    // wide banner (2 cols)
  5: [7, 8, 1, 2],    // medium square
  6: [8, 9, 1, 2],    // narrow tall
  7: [3, 4, 2, 3],    // medium square (below item 2)
  8: [4, 5, 2, 4],    // tall block (spans 2 rows)
  9: [5, 7, 2, 3],    // wide block
  10: [7, 8, 2, 3],   // medium
  11: [8, 9, 2, 3],   // medium
  12: [1, 3, 3, 5],   // large wide block (bottom left)
  13: [4, 5, 3, 5],   // tall (same as item 8 col continues)
  14: [5, 6, 3, 4],   // small block
  15: [6, 7, 3, 4],   // small block
  16: [5, 6, 4, 5],   // small block
  17: [6, 7, 4, 5],   // small block
  18: [7, 8, 3, 4],   // small
  19: [8, 9, 3, 4],   // small
  20: [7, 8, 4, 5],   // small
  21: [8, 9, 4, 5],   // small
};

export function ViralGrid({ items, onItemClick, emptyCellClick, editable = false }: Props) {
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);

  // Map items by their viral position
  const itemsByPosition = new Map<number, ViralSubcategory>();
  items.forEach((item) => {
    if (item.viralPosition) {
      itemsByPosition.set(item.viralPosition, item);
    }
  });

  // Items sorted by viral position for the mobile strip
  const sortedItems = [...items]
    .filter((i) => i.viralPosition != null)
    .sort((a, b) => (a.viralPosition ?? 0) - (b.viralPosition ?? 0));

  // Shared cell renderer
  function CellContent({ item, position, isHov }: { item?: ViralSubcategory; position: number; isHov: boolean }) {
    if (item) {
      const isRealImage = item.imageUrl && (item.imageUrl.startsWith("http") || item.imageUrl.startsWith("/"));
      return (
        <>
          {isRealImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl!} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col items-start justify-end p-2">
            {!isRealImage && (
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center mb-1 self-center">
                <CategoryIcon name={item.imageUrl} size={16} className="text-white" />
              </div>
            )}
            <span className="text-[10px] text-white font-semibold leading-tight line-clamp-2 w-full">
              {item.name}
            </span>
            {editable && <span className="text-[8px] text-white/50 mt-0.5">#{item.viralPosition}</span>}
          </div>
          {isHov && <div className="absolute inset-0 ring-2 ring-brand-primary rounded-xl pointer-events-none" />}
        </>
      );
    }
    if (editable) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-[11px] text-gray-600">+{position}</span>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {/* ── Mobile: hero card + staggered 2-row scroll strip (hidden sm+) ── */}
      <div className="sm:hidden space-y-3">
        {/* First item: full-width hero card */}
        {sortedItems[0] && (
          <div
            onClick={() => { if (onItemClick) onItemClick(sortedItems[0]); }}
            style={{
              width: "100%",
              height: 180,
              borderRadius: 20,
              overflow: "hidden",
              background: "#111",
              position: "relative",
              cursor: onItemClick ? "pointer" : "default",
            }}
          >
            <CellContent item={sortedItems[0]} position={sortedItems[0].viralPosition ?? 1} isHov={false} />
            {/* Larger name overlay for hero card */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
              <span className="text-sm text-white font-bold leading-snug line-clamp-2">
                {sortedItems[0].name}
              </span>
              <p className="text-[10px] text-white/60 mt-0.5">{sortedItems[0].category?.name}</p>
            </div>
          </div>
        )}

        {/* Remaining items: 2-row horizontal scroll */}
        {sortedItems.length > 1 && (
          <div className="overflow-x-auto -mx-1 pb-1" style={{ scrollbarWidth: "none" }}>
            <div style={{ display: "grid", gridTemplateRows: "repeat(2, 112px)", gridAutoFlow: "column", gap: 10, width: "max-content", padding: "0 4px" }}>
              {(editable
                ? Array.from({ length: 20 }, (_, i) => ({ ...itemsByPosition.get(i + 2), _pos: i + 2 } as any))
                : sortedItems.slice(1)
              ).map((item: any, idx: number) => {
                const realItem = editable ? itemsByPosition.get(item._pos) : item;
                const position = editable ? item._pos : (item?.viralPosition ?? idx + 2);
                if (!realItem && !editable) return null;
                return (
                  <div
                    key={position}
                    onClick={() => {
                      if (realItem && onItemClick) onItemClick(realItem);
                      else if (!realItem && emptyCellClick) emptyCellClick(position);
                    }}
                    style={{
                      width: 112,
                      height: 112,
                      borderRadius: 16,
                      overflow: "hidden",
                      background: realItem ? "#111" : "#1a1a1a",
                      position: "relative",
                      cursor: onItemClick || (editable && emptyCellClick) ? "pointer" : "default",
                      flexShrink: 0,
                    }}
                  >
                    <CellContent item={realItem} position={position} isHov={false} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Editable: show all 21 as flat scroll when no items yet */}
        {editable && sortedItems.length === 0 && (
          <div className="overflow-x-auto -mx-1 pb-1" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-2.5 px-1" style={{ width: "max-content" }}>
              {Array.from({ length: 21 }, (_, i) => i + 1).map((pos) => (
                <div
                  key={pos}
                  onClick={() => emptyCellClick?.(pos)}
                  style={{ width: 90, height: 90, borderRadius: 14, background: "#1a1a1a", position: "relative", flexShrink: 0, cursor: "pointer" }}
                >
                  <CellContent item={undefined} position={pos} isHov={false} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop: masonry grid (hidden below sm) ── */}
      <div
        className="hidden sm:grid w-full"
        style={{
          gridTemplateColumns: "repeat(8, 1fr)",
          gridAutoRows: "90px",
          gap: "8px",
        }}
      >
        {Array.from({ length: 21 }, (_, i) => i + 1).map((position) => {
          const layout = GRID_LAYOUTS[position];
          const item = itemsByPosition.get(position);
          const isHov = hoveredPosition === position;
          return (
            <div
              key={position}
              onClick={() => {
                if (item && onItemClick) onItemClick(item);
                else if (!item && emptyCellClick) emptyCellClick(position);
              }}
              onMouseEnter={() => setHoveredPosition(position)}
              onMouseLeave={() => setHoveredPosition(null)}
              style={{
                gridColumnStart: layout[0],
                gridColumnEnd: layout[1],
                gridRowStart: layout[2],
                gridRowEnd: layout[3],
                borderRadius: "14px",
                overflow: "hidden",
                background: item ? "#111" : editable ? "#1a1a1a" : "#0a0a0a",
                cursor: onItemClick || (editable && emptyCellClick) ? "pointer" : "default",
                border: isHov ? "2px solid #c0626a" : "2px solid transparent",
                transition: "all 0.2s ease",
                position: "relative",
              }}
            >
              <CellContent item={item} position={position} isHov={isHov} />
            </div>
          );
        })}
      </div>
    </>
  );
}

export { GRID_LAYOUTS };
export type { ViralSubcategory };
