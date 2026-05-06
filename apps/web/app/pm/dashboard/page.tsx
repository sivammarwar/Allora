"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";

interface PMStats {
  categories: number;
  subcategories: number;
  products: number;
  services: number;
}

export default function PMDashboardPage() {
  const { data, isLoading } = useQuery<PMStats>({
    queryKey: ["pm", "stats"],
    queryFn: () => api.get("/api/pm/stats"),
  });

  const tiles: Array<[string, number | string, string]> = [
    ["Categories", data?.categories ?? "—", "Top-level groupings"],
    ["Subcategories", data?.subcategories ?? "—", "Across products & services"],
    ["Products", data?.products ?? "—", "In the catalog"],
    ["Service pages", data?.services ?? "—", "Service-type subcategories"],
  ];

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Catalog overview</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Manage what heroes can offer on the platform.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(([label, value, hint]) => (
          <Card key={label}>
            <CardContent className="py-6">
              <p className="text-xs uppercase tracking-widest font-mono text-brand-primary">
                {label}
              </p>
              <p className="mt-2 font-heading text-4xl text-brand-text">
                {isLoading ? "…" : value}
              </p>
              <p className="mt-1 text-sm text-brand-textMuted">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
