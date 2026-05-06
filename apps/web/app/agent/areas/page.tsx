"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Map as MapIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { AreaMapView } from "@/components/maps/AreaMapView";

interface AgentArea {
  id: string;
  name: string;
  code: string;
  polygon: GeoJSON.Polygon;
}

export default function AgentAreasPage() {
  const qc = useQueryClient();
  const { data: areas = [], isLoading } = useQuery<AgentArea[]>({
    queryKey: ["agent", "areas"],
    queryFn: () => api.get("/api/agent/areas"),
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AgentArea | null>(null);

  const openMap = (area: AgentArea) => {
    setSelectedArea(area);
    setMapOpen(true);
  };

  const add = useMutation({
    mutationFn: () =>
      api.post("/api/agent/workspace", {
        areaName: name.trim(),
        areaCode: code.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent", "areas"] });
      toast.success("Area added");
      setOpen(false);
      setName("");
      setCode("");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">My areas</h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Areas you cover. Verification requests in these areas are routed to you.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add area
        </Button>
      </div>
      {isLoading ? (
        <p className="text-brand-textMuted text-sm">Loading…</p>
      ) : areas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-brand-textMuted text-sm">
            No areas yet. Add one with its 20-character code.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="font-heading text-lg text-brand-text">{a.name}</h3>
                  <p className="font-mono text-[11px] text-brand-textMuted break-all">
                    {a.code}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openMap(a)}
                  className="w-full"
                >
                  <MapIcon size={14} />
                  View on Map
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add area to workspace"
        description="Enter the name and 20-character code provided by the admin."
      >
        <div className="px-6 py-5 space-y-4">
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => add.mutate()}
              loading={add.isPending}
              disabled={name.trim().length < 1 || code.length !== 20}
            >
              Add area
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Map View Dialog */}
      <Dialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        title={selectedArea?.name ?? "Area Map"}
        description={`Area code: ${selectedArea?.code ?? ""}`}
        size="xl"
      >
        <div className="px-6 py-4">
          {selectedArea?.polygon ? (
            <AreaMapView
              polygon={selectedArea.polygon}
              areaName={selectedArea.name}
              className="h-[400px] w-full"
            />
          ) : (
            <div className="h-[400px] flex items-center justify-center text-brand-textMuted">
              No polygon data available for this area.
            </div>
          )}
          <div className="flex justify-end pt-4">
            <Button variant="ghost" onClick={() => setMapOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
