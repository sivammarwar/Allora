"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Map as MapIcon } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
  const { data: areas = [], isLoading } = useQuery<AgentArea[]>({
    queryKey: ["agent", "areas"],
    queryFn: () => api.get("/api/agent/areas"),
  });

  const [mapOpen, setMapOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AgentArea | null>(null);

  const openMap = (area: AgentArea) => {
    setSelectedArea(area);
    setMapOpen(true);
  };

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl text-brand-text">My areas</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Areas assigned to you by the admin. Verification requests in these areas are routed to you.
        </p>
      </div>
      {isLoading ? (
        <p className="text-brand-textMuted text-sm">Loading…</p>
      ) : areas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-brand-textMuted text-sm">
            No areas assigned yet. Contact your admin to get areas assigned to you.
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
