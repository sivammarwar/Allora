"use client";

import * as Icons from "lucide-react";
import { Box, type LucideProps } from "lucide-react";

interface Props extends Omit<LucideProps, "name"> {
  /** Lucide icon name in PascalCase (e.g. "Home", "Sparkles", "Wrench"). */
  name?: string | null;
  /** Fallback icon if name is missing/unknown. Defaults to Box. */
  fallback?: keyof typeof Icons;
}

/**
 * Renders a Lucide icon by name. Used by Category / Subcategory listings
 * across the platform. Stored value lives in `Category.imageUrl` for
 * historical reasons (string column repurposed for icon name).
 */
export function CategoryIcon({ name, fallback = "Box", ...rest }: Props) {
  const lookup = (n?: string | null) => {
    if (!n) return null;
    const key = n.trim();
    const Comp = (Icons as unknown as Record<string, unknown>)[key];
    if (typeof Comp === "function" || (Comp && typeof Comp === "object")) {
      return Comp as React.ComponentType<LucideProps>;
    }
    return null;
  };
  const Resolved =
    lookup(name) ??
    (lookup(fallback) as React.ComponentType<LucideProps> | null) ??
    Box;
  return <Resolved {...rest} />;
}
