"use client";

import { Plus, Pencil } from "lucide-react";
import { CategoryIcon } from "./CategoryIcon";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface BentoItem {
  id: string;
  name: string;
  imageUrl: string | null;
  viralImageUrl?: string | null;
  position: number;        // 1–6
  categoryName: string;
  categoryType: "PRODUCT" | "SERVICE";
  pricing?: {
    baseServiceCharge: number;
    discountPercent: number;
    transportChargePerKm: number | null;
  } | null;
}

interface Props {
  items: BentoItem[];
  onItemClick?: (item: BentoItem) => void;
  onEmptyClick?: (pos: number) => void;
  editable?: boolean;
}

// ─── Slot geometry (4-col × 3-row grid) ──────────────────────────────────────
// Layout:
//   [  BIG-1  ][  BIG-1  ][ sm-2 ][ sm-3 ]
//   [  BIG-1  ][  BIG-1  ][  BIG-4  ][  BIG-4  ]
//   [ sm-5 ][ sm-6 ][  BIG-4  ][  BIG-4  ]
const SLOT: Record<number, [number, number, number, number]> = {
  1: [1, 3, 1, 3],   // big left  (2 cols × 2 rows)
  2: [3, 4, 1, 2],   // small top-right
  3: [4, 5, 1, 2],   // small top-right
  4: [3, 5, 2, 4],   // big right (2 cols × 2 rows)
  5: [1, 2, 3, 4],   // small bottom-left
  6: [2, 3, 3, 4],   // small bottom-left
};

function isUrl(s?: string | null) {
  return !!s && (s.startsWith("http") || s.startsWith("/"));
}

// ─── Compact pricing row ──────────────────────────────────────────────────────
function PricingRow({ pricing, large }: { pricing: NonNullable<BentoItem["pricing"]>; large: boolean }) {
  const base = pricing.baseServiceCharge;
  const disc = pricing.discountPercent;
  const discounted = base * (1 - disc / 100);
  const transport = pricing.transportChargePerKm;

  return (
    <div className={`flex items-center gap-1.5 overflow-hidden ${large ? "mt-1.5" : "mt-1"}`}>
      {disc > 0 && (
        <span className="line-through text-stone-400 text-[9px] shrink-0">₹{base}</span>
      )}
      <span className={`font-bold text-brand-primary shrink-0 ${large ? "text-sm" : "text-[11px]"}`}>
        ₹{discounted.toFixed(0)}
      </span>
      {disc > 0 && (
        <span className="text-[8px] bg-green-100 text-green-700 px-1 py-0.5 rounded-full leading-none shrink-0">
          {disc}% off
        </span>
      )}
      {transport !== null && transport !== undefined && transport > 0 && (
        <span className="text-[8px] text-stone-400 leading-none shrink-0 hidden sm:inline">
          · ₹{transport}/km
        </span>
      )}
    </div>
  );
}

// ─── Single card ─────────────────────────────────────────────────────────────
function BentoCard({
  item,
  pos,
  large,
  editable,
  onClick,
  onEmptyClick,
}: {
  item?: BentoItem;
  pos: number;
  large: boolean;
  editable?: boolean;
  onClick?: (item: BentoItem) => void;
  onEmptyClick?: (pos: number) => void;
}) {
  if (!item) {
    if (!editable) return <div className="rounded-[14px] bg-gray-100/60" />;
    return (
      <button
        onClick={() => onEmptyClick?.(pos)}
        className="rounded-[14px] border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-brand-primary/40 transition-colors flex flex-col items-center justify-center gap-2 w-full h-full"
      >
        <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
          <Plus size={14} className="text-brand-primary" />
        </div>
        <span className="text-[11px] font-medium text-gray-400">Slot {pos}</span>
      </button>
    );
  }

  const displayUrl = item.viralImageUrl ?? item.imageUrl;
  const hasImage = isUrl(displayUrl);
  const hasPricing = !!item.pricing;

  return (
    <div
      onClick={() => onClick?.(item)}
      className="group relative overflow-hidden rounded-[14px] bg-white cursor-pointer h-full flex flex-col"
    >
      {/* Image block */}
      <div className="overflow-hidden" style={{ flex: large ? (hasPricing ? "0 0 74%" : "0 0 70%") : (hasPricing ? "0 0 66%" : "0 0 62%") }}>
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl!}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-primary/8 to-brand-primary/4 flex items-center justify-center">
            <CategoryIcon name={item.imageUrl} size={large ? 44 : 24} className="text-brand-primary/50" />
          </div>
        )}
      </div>

      {/* Text + pricing block */}
      <div className={`flex-1 flex flex-col justify-center ${large ? "px-3.5 py-1.5 sm:px-4" : "px-2.5 py-1.5"}`}>
        <p className="text-[8px] font-sans font-light tracking-[0.1em] uppercase text-stone-400 leading-none mb-0.5 truncate">
          {item.categoryName}
        </p>
        <h3
          className={`font-cormorant font-semibold text-gray-900 leading-tight ${
            large ? "text-xl sm:text-2xl line-clamp-2" : "text-sm line-clamp-1"
          }`}
        >
          {item.name}
        </h3>
        {item.pricing && <PricingRow pricing={item.pricing} large={large} />}
      </div>

      {/* Edit badge (editable mode) */}
      {editable && (
        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
          <Pencil size={12} className="text-gray-600" />
        </div>
      )}
    </div>
  );
}

// ─── Desktop bento grid ───────────────────────────────────────────────────────
function DesktopBento({ byPos, editable, onItemClick, onEmptyClick }: {
  byPos: Map<number, BentoItem>;
  editable?: boolean;
  onItemClick?: (item: BentoItem) => void;
  onEmptyClick?: (pos: number) => void;
}) {
  return (
    <div
      className="hidden sm:grid w-full gap-3"
      style={{
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: "200px 180px 200px",
      }}
    >
      {[1, 2, 3, 4, 5, 6].map((pos) => {
        const [cs, ce, rs, re] = SLOT[pos];
        const item = byPos.get(pos);
        return (
          <div
            key={pos}
            style={{ gridColumnStart: cs, gridColumnEnd: ce, gridRowStart: rs, gridRowEnd: re }}
          >
            <BentoCard
              item={item}
              pos={pos}
              large={pos === 1 || pos === 4}
              editable={editable}
              onClick={onItemClick}
              onEmptyClick={onEmptyClick}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Mobile layout ────────────────────────────────────────────────────────────
function MobileBento({ byPos, editable, onItemClick, onEmptyClick }: {
  byPos: Map<number, BentoItem>;
  editable?: boolean;
  onItemClick?: (item: BentoItem) => void;
  onEmptyClick?: (pos: number) => void;
}) {
  return (
    <div className="sm:hidden space-y-2.5">
      {/* pos 1 — big left: full width */}
      <div style={{ height: 260 }}>
        <BentoCard item={byPos.get(1)} pos={1} large editable={editable} onClick={onItemClick} onEmptyClick={onEmptyClick} />
      </div>
      {/* pos 2 + 3 — 2 col small top-right */}
      <div className="grid grid-cols-2 gap-2.5" style={{ height: 190 }}>
        {[2, 3].map((p) => (
          <BentoCard key={p} item={byPos.get(p)} pos={p} large={false} editable={editable} onClick={onItemClick} onEmptyClick={onEmptyClick} />
        ))}
      </div>
      {/* pos 4 — big right: full width */}
      <div style={{ height: 260 }}>
        <BentoCard item={byPos.get(4)} pos={4} large editable={editable} onClick={onItemClick} onEmptyClick={onEmptyClick} />
      </div>
      {/* pos 5 + 6 — 2 col small bottom-left */}
      <div className="grid grid-cols-2 gap-2.5" style={{ height: 190 }}>
        {[5, 6].map((p) => (
          <BentoCard key={p} item={byPos.get(p)} pos={p} large={false} editable={editable} onClick={onItemClick} onEmptyClick={onEmptyClick} />
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
export function BentoGridSkeleton() {
  return (
    <>
      {/* Desktop skeleton — mirrors exact slot geometry */}
      <div
        className="hidden sm:grid w-full gap-3"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "200px 180px 200px" }}
      >
        {[1, 2, 3, 4, 5, 6].map((pos) => {
          const [cs, ce, rs, re] = SLOT[pos];
          return (
            <div key={pos} style={{ gridColumnStart: cs, gridColumnEnd: ce, gridRowStart: rs, gridRowEnd: re }}>
              <div className="skeleton w-full h-full rounded-[14px]" />
            </div>
          );
        })}
      </div>
      {/* Mobile skeleton */}
      <div className="sm:hidden space-y-2.5">
        <div className="skeleton rounded-[14px]" style={{ height: 260 }} />
        <div className="grid grid-cols-2 gap-2.5" style={{ height: 190 }}>
          <div className="skeleton rounded-[14px]" />
          <div className="skeleton rounded-[14px]" />
        </div>
        <div className="skeleton rounded-[14px]" style={{ height: 260 }} />
        <div className="grid grid-cols-2 gap-2.5" style={{ height: 190 }}>
          <div className="skeleton rounded-[14px]" />
          <div className="skeleton rounded-[14px]" />
        </div>
      </div>
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────
export function BentoGrid({ items, onItemClick, onEmptyClick, editable = false }: Props) {
  const byPos = new Map<number, BentoItem>();
  items.forEach((i) => byPos.set(i.position, i));

  return (
    <>
      <DesktopBento byPos={byPos} editable={editable} onItemClick={onItemClick} onEmptyClick={onEmptyClick} />
      <MobileBento byPos={byPos} editable={editable} onItemClick={onItemClick} onEmptyClick={onEmptyClick} />
    </>
  );
}
