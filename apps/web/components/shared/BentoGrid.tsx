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
const SLOT: Record<number, [number, number, number, number]> = {
  1: [1, 3, 1, 3],   // hero — left tall (2 rows × 2 cols)
  2: [3, 4, 1, 2],   // top-right small
  3: [4, 5, 1, 2],   // top-right small
  4: [3, 5, 2, 3],   // bottom-right landscape (2 cols × 1 row)
  5: [1, 3, 3, 4],   // bottom-left wide (2 cols × 1 row)
  6: [3, 5, 3, 4],   // bottom-right wide (2 cols × 1 row)
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
    <div className={`flex items-center gap-2 flex-wrap ${large ? "mt-2" : "mt-1"}`}>
      {/* Service charge */}
      <div className="flex items-center gap-1">
        {disc > 0 && (
          <span className="line-through text-stone-400 text-[10px]">₹{base}</span>
        )}
        <span className={`font-bold text-brand-primary ${large ? "text-sm" : "text-xs"}`}>
          ₹{discounted.toFixed(0)}
        </span>
        {disc > 0 && (
          <span className="text-[9px] bg-green-100 text-green-700 px-1 py-0.5 rounded-full leading-none">
            {disc}% off
          </span>
        )}
      </div>
      {/* Transport */}
      {transport !== null && transport !== undefined && transport > 0 && (
        <span className="text-[9px] text-stone-400 leading-none">
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

  // Image takes more vertical space, text block is tighter
  const textPx = hasPricing ? (large ? "px-3 pt-2 pb-2.5 sm:px-4" : "px-2.5 pt-1.5 pb-2") : (large ? "px-3 pt-2 pb-3 sm:px-4" : "px-2.5 pt-1.5 pb-2.5");

  return (
    <div
      onClick={() => onClick?.(item)}
      className="group relative overflow-hidden rounded-[14px] bg-white cursor-pointer h-full flex flex-col"
    >
      {/* Image block */}
      <div className="overflow-hidden" style={{ flex: hasPricing ? "0 0 68%" : "0 0 62%" }}>
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl!}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-primary/8 to-brand-primary/4 flex items-center justify-center">
            <CategoryIcon name={item.imageUrl} size={large ? 44 : 28} className="text-brand-primary/50" />
          </div>
        )}
      </div>

      {/* Text + pricing block */}
      <div className={`flex-1 ${textPx} flex flex-col justify-center`}>
        <p className="text-[8px] sm:text-[9px] font-sans font-light tracking-[0.12em] uppercase text-stone-400 leading-none mb-1 truncate">
          {item.categoryName}
        </p>
        <h3
          className={`font-cormorant font-semibold text-gray-900 leading-tight line-clamp-2 ${
            large ? "text-xl sm:text-2xl" : "text-sm sm:text-base"
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
        gridTemplateRows: "220px 200px 230px",
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
              large={pos === 1}
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
      {/* pos 1 — hero: full width */}
      <div style={{ height: 260 }}>
        <BentoCard item={byPos.get(1)} pos={1} large editable={editable} onClick={onItemClick} onEmptyClick={onEmptyClick} />
      </div>
      {/* pos 2 + 3 — 2 col */}
      <div className="grid grid-cols-2 gap-2.5" style={{ height: 200 }}>
        {[2, 3].map((p) => (
          <BentoCard key={p} item={byPos.get(p)} pos={p} large={false} editable={editable} onClick={onItemClick} onEmptyClick={onEmptyClick} />
        ))}
      </div>
      {/* pos 4 — landscape: full width */}
      <div style={{ height: 200 }}>
        <BentoCard item={byPos.get(4)} pos={4} large={false} editable={editable} onClick={onItemClick} onEmptyClick={onEmptyClick} />
      </div>
      {/* pos 5 + 6 — 2 col */}
      <div className="grid grid-cols-2 gap-2.5" style={{ height: 200 }}>
        {[5, 6].map((p) => (
          <BentoCard key={p} item={byPos.get(p)} pos={p} large={false} editable={editable} onClick={onItemClick} onEmptyClick={onEmptyClick} />
        ))}
      </div>
    </div>
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
