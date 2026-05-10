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

  return (
    <div
      className="w-full"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gridAutoRows: "80px",
        gap: "6px",
      }}
    >
      {Array.from({ length: 21 }, (_, i) => i + 1).map((position) => {
        const layout = GRID_LAYOUTS[position];
        const item = itemsByPosition.get(position);
        const isHovered = hoveredPosition === position;

        return (
          <div
            key={position}
            onClick={() => {
              if (item && onItemClick) {
                onItemClick(item);
              } else if (!item && emptyCellClick) {
                emptyCellClick(position);
              }
            }}
            onMouseEnter={() => setHoveredPosition(position)}
            onMouseLeave={() => setHoveredPosition(null)}
            style={{
              gridColumnStart: layout[0],
              gridColumnEnd: layout[1],
              gridRowStart: layout[2],
              gridRowEnd: layout[3],
              borderRadius: "12px",
              overflow: "hidden",
              background: item ? "#111" : editable ? "#1a1a1a" : "#0a0a0a",
              cursor: onItemClick || (editable && emptyCellClick) ? "pointer" : "default",
              border: isHovered ? "2px solid #c0626a" : "2px solid transparent",
              transition: "all 0.2s ease",
              position: "relative",
            }}
          >
            {item ? (
              <>
                {/* Background fill: real image or dark overlay */}
                {item.imageUrl && (item.imageUrl.startsWith("http") || item.imageUrl.startsWith("/")) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : null}
                {/* Dark gradient overlay + label */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-start justify-end p-2">
                  {(!item.imageUrl || (!item.imageUrl.startsWith("http") && !item.imageUrl.startsWith("/"))) && (
                    <div className="w-8 h-8 rounded-full bg-brand-surface flex items-center justify-center mb-1 self-center">
                      <CategoryIcon name={item.imageUrl} size={18} className="text-brand-primary" />
                    </div>
                  )}
                  <span className="text-[10px] text-white font-semibold leading-tight line-clamp-2 w-full">
                    {item.name}
                  </span>
                  {editable && (
                    <span className="text-[8px] text-white/60 mt-0.5">
                      Pos {item.viralPosition}
                    </span>
                  )}
                </div>
              </>
            ) : editable ? (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[10px] text-brand-textMuted">+ {position}</span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export { GRID_LAYOUTS };
export type { ViralSubcategory };
