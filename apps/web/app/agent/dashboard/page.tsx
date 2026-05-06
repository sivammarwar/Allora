"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPinned, ShieldCheck, ShieldAlert, Truck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface AgentArea {
  id: string;
  name: string;
  code: string;
}

interface AgentStats {
  areas: number;
  pendingRequests: number;
  verifiedHeroes: number;
  verifiedDeliveryBoys: number;
}

export default function AgentDashboardPage() {
  const qc = useQueryClient();
  const { data: areas = [], isLoading } = useQuery<AgentArea[]>({
    queryKey: ["agent", "areas"],
    queryFn: () => api.get("/api/agent/areas"),
  });

  const { data: stats } = useQuery<AgentStats>({
    queryKey: ["agent", "stats"],
    queryFn: () => api.get("/api/agent/stats"),
    enabled: areas.length > 0,
  });

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const addWorkspace = useMutation({
    mutationFn: () =>
      api.post("/api/agent/workspace", {
        areaName: name.trim(),
        areaCode: code.trim().toUpperCase(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent", "areas"] });
      qc.invalidateQueries({ queryKey: ["agent", "stats"] });
      toast.success("Area added to your workspace");
      setName("");
      setCode("");
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Failed to add area"),
  });

  if (!isLoading && areas.length === 0) {
    return (
      <div className="page-enter max-w-xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <MapPinned className="mx-auto text-brand-primary" size={28} />
            <h1 className="font-heading text-2xl text-brand-text">
              Set up your workspace
            </h1>
            <p className="text-brand-textMuted text-sm">
              Enter the name and 20-character code of an area assigned to you by the admin.
            </p>
          </CardContent>
          <CardContent className="space-y-4 border-t border-brand-border">
            <Input
              label="Area name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Input
              label="20-character code"
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 20)
                )
              }
              className="font-mono tracking-wider"
              maxLength={20}
            />
            <div className="flex justify-end">
              <Button
                onClick={() => addWorkspace.mutate()}
                loading={addWorkspace.isPending}
                disabled={name.trim().length < 1 || code.length !== 20}
              >
                Add area
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tiles: Array<[string, number | string, string, any]> = [
    ["Pending requests", stats?.pendingRequests ?? "—", "Awaiting your verification", ShieldAlert],
    ["Verified heroes", stats?.verifiedHeroes ?? "—", "Service providers in your areas", ShieldCheck],
    ["Verified delivery", stats?.verifiedDeliveryBoys ?? "—", "Delivery partners in your areas", Truck],
  ];

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Dashboard</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Operating across {areas.length} area{areas.length === 1 ? "" : "s"}.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map(([label, value, hint, Icon]) => (
          <Card key={label}>
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-brand-primary" />
                <p className="text-xs uppercase tracking-widest font-mono text-brand-primary">
                  {label}
                </p>
              </div>
              <p className="mt-2 font-heading text-4xl text-brand-text">{value}</p>
              <p className="mt-1 text-sm text-brand-textMuted">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
