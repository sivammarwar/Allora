"use client";

import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Search, X } from "lucide-react";
import { CategoryIcon } from "./CategoryIcon";

interface Props {
  value: string | null;
  onChange: (icon: string | null) => void;
  label?: string;
  className?: string;
}

/**
 * Curated set of Lucide icons that work well as category emblems.
 * Users can also type any other Lucide icon name directly into the input
 * and it will preview if valid.
 */
const SUGGESTED: string[] = [
  "Home",
  "Sparkles",
  "Wrench",
  "Hammer",
  "Paintbrush",
  "Scissors",
  "Drill",
  "Plug",
  "Lightbulb",
  "Wifi",
  "Tv",
  "Refrigerator",
  "WashingMachine",
  "AirVent",
  "Fan",
  "Bath",
  "ShowerHead",
  "Droplets",
  "BrushCleaning",
  "Trash2",
  "Sprout",
  "Flower",
  "TreePine",
  "Leaf",
  "Carrot",
  "Apple",
  "Beef",
  "Fish",
  "Egg",
  "Milk",
  "Pizza",
  "Coffee",
  "Cookie",
  "IceCream",
  "Utensils",
  "ChefHat",
  "Soup",
  "ShoppingBag",
  "ShoppingCart",
  "Store",
  "Package",
  "Gift",
  "Tag",
  "Shirt",
  "Watch",
  "Glasses",
  "BookOpen",
  "GraduationCap",
  "Pencil",
  "Briefcase",
  "Laptop",
  "Smartphone",
  "Headphones",
  "Camera",
  "Music",
  "Mic",
  "Gamepad2",
  "Dice5",
  "Heart",
  "Stethoscope",
  "Pill",
  "Syringe",
  "Activity",
  "Dumbbell",
  "Bike",
  "Car",
  "Bus",
  "Truck",
  "Plane",
  "Ship",
  "Train",
  "Wallet",
  "CreditCard",
  "Banknote",
  "Coins",
  "Receipt",
  "PiggyBank",
  "Building2",
  "Hotel",
  "School",
  "Hospital",
  "Church",
  "MapPin",
  "Map",
  "Compass",
  "Globe",
  "Sun",
  "Moon",
  "CloudRain",
  "Umbrella",
  "Flame",
  "Battery",
  "Zap",
  "Wind",
  "Mountain",
  "Trees",
  "PawPrint",
  "Bone",
  "Bird",
  "Cat",
  "Dog",
];

export function IconPicker({ value, onChange, label = "Icon", className }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SUGGESTED;
    return SUGGESTED.filter((n) => n.toLowerCase().includes(q));
  }, [query]);

  // If the user typed something that isn't in SUGGESTED but IS a real Lucide
  // icon, surface it as a single-result match.
  const customMatch = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    if (filtered.includes(q)) return null;
    const Comp = (Icons as unknown as Record<string, unknown>)[q];
    return typeof Comp === "function" || (Comp && typeof Comp === "object") ? q : null;
  }, [query, filtered]);

  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-brand-text">
        {label}
      </label>

      {/* Current selection preview */}
      <div className="flex items-center gap-3 mb-3 p-3 rounded-sm border border-brand-border bg-brand-bg">
        <div className="h-12 w-12 rounded-sm bg-brand-surface border border-brand-border flex items-center justify-center text-brand-primary">
          <CategoryIcon name={value} size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-brand-text truncate">
            {value ? (
              <>
                Selected:{" "}
                <span className="font-mono">{value}</span>
              </>
            ) : (
              <span className="text-brand-textMuted">No icon selected</span>
            )}
          </p>
          <p className="text-[11px] text-brand-textMuted mt-0.5">
            Type a Lucide icon name (e.g. <span className="font-mono">Home</span>) or
            pick one below.
          </p>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-brand-textMuted hover:text-brand-text"
            aria-label="Clear icon"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="relative mb-2">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons by name…"
          className="w-full h-10 pl-9 pr-3 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text placeholder:text-brand-textMuted focus:outline-none focus:border-brand-primary"
        />
      </div>

      {/* Grid of icons */}
      <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-56 overflow-auto p-2 rounded-sm border border-brand-border bg-brand-bg">
        {customMatch && (
          <button
            type="button"
            onClick={() => onChange(customMatch)}
            title={`${customMatch} (custom)`}
            className={`aspect-square flex items-center justify-center rounded-sm border-2 border-brand-primary text-brand-primary hover:bg-brand-primary/10 transition-colors`}
          >
            <CategoryIcon name={customMatch} size={18} />
          </button>
        )}
        {filtered.map((name) => {
          const isActive = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              title={name}
              className={`aspect-square flex items-center justify-center rounded-sm border transition-colors ${
                isActive
                  ? "bg-brand-primary text-white border-brand-primary"
                  : "border-brand-border text-brand-text hover:bg-brand-surface"
              }`}
            >
              <CategoryIcon name={name} size={18} />
            </button>
          );
        })}
        {filtered.length === 0 && !customMatch && (
          <p className="col-span-full text-center text-xs text-brand-textMuted py-4">
            No icons match "{query}". Try another keyword.
          </p>
        )}
      </div>
    </div>
  );
}
