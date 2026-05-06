"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface AdminStats {
  areas: number;
  agents: number;
  pendingRequests: number;
  heroes: number;
  deliveryBoys: number;
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get("/api/admin/stats"),
  });

  const tiles: Array<[string, number | string, string]> = [
    ["Areas", data?.areas ?? "—", "Total mapped service areas"],
    ["Agents", data?.agents ?? "—", "Verifying providers on the ground"],
    ["Pending requests", data?.pendingRequests ?? "—", "Awaiting agent verification"],
    ["Heroes", data?.heroes ?? "—", "Verified service providers"],
    ["Delivery partners", data?.deliveryBoys ?? "—", "Verified delivery boys"],
  ];

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Dashboard</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Operational overview of your platform.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
