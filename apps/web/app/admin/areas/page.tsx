"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, MapPin, Pencil, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import {
  PolygonDrawer,
  type LngLat,
  type ExistingPolygon,
} from "@/components/maps/PolygonDrawer";

interface AreaRow {
  id: string;
  name: string;
  code: string;
  polygon: GeoJSON.Polygon;
  agentCount: number;
  createdAt: string;
}

export default function AdminAreasPage() {
  const qc = useQueryClient();

  const { data: areas = [], isLoading } = useQuery<AreaRow[]>({
    queryKey: ["admin", "areas"],
    queryFn: () => api.get("/api/admin/areas"),
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPoints, setDraftPoints] = useState<LngLat[]>([]);
  const [draftClosed, setDraftClosed] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});

  const editing = useMemo(
    () => areas.find((a) => a.id === editingId) ?? null,
    [areas, editingId]
  );

  const existingForOverlay: ExistingPolygon[] = useMemo(
    () =>
      areas
        .filter((a) => a.id !== editingId)
        .map((a) => ({
          id: a.id,
          name: a.name,
          coordinates: a.polygon.coordinates[0] as LngLat[],
        })),
    [areas, editingId]
  );

  const initialPoints: LngLat[] | undefined = editing
    ? (editing.polygon.coordinates[0].slice(0, -1) as LngLat[])
    : undefined;

  const saveMutation = useMutation({
    mutationFn: (input: {
      name: string;
      code: string;
      polygon: GeoJSON.Polygon;
    }) => {
      if (editingId) {
        return api.put(`/api/admin/areas/${editingId}`, input);
      }
      return api.post(`/api/admin/areas`, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "areas"] });
      toast.success(editingId ? "Area updated" : "Area created");
      closeAll();
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to save area";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/areas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "areas"] });
      toast.success("Area deleted");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to delete";
      toast.error(msg);
    },
  });

  function openCreate() {
    setEditingId(null);
    setDraftPoints([]);
    setDraftClosed(false);
    setName("");
    setCode("");
    setErrors({});
    setDrawerOpen(true);
  }

  function openEdit(id: string) {
    const a = areas.find((x) => x.id === id);
    if (!a) return;
    setEditingId(id);
    setName(a.name);
    setCode(a.code);
    setDraftPoints(a.polygon.coordinates[0].slice(0, -1) as LngLat[]);
    setDraftClosed(true);
    setErrors({});
    setDrawerOpen(true);
  }

  function closeAll() {
    setDrawerOpen(false);
    setSavePromptOpen(false);
    setEditingId(null);
    setDraftPoints([]);
    setDraftClosed(false);
  }

  function onSubmitSave() {
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = "Name must be at least 2 characters";
    if (!/^[A-Za-z0-9]{20}$/.test(code))
      next.code = "Code must be exactly 20 alphanumeric characters";
    setErrors(next);
    if (Object.keys(next).length) return;

    if (draftPoints.length < 3 || !draftClosed) {
      toast.error("Close the polygon path before saving");
      return;
    }
    const ring = [...draftPoints, draftPoints[0]];
    const polygon: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [ring],
    };
    saveMutation.mutate({ name: name.trim(), code, polygon });
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">Areas</h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Define service boundaries on the map. Each area gets a unique 20-character code.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          New area
        </Button>
      </div>

      {isLoading ? (
        <div className="text-brand-textMuted text-sm">Loading…</div>
      ) : areas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MapPin className="mx-auto text-brand-primary/60 mb-3" size={28} />
            <p className="font-heading text-lg text-brand-text">
              No areas defined yet
            </p>
            <p className="mt-1 text-brand-textMuted text-sm">
              Click "New area" to draw your first service boundary.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-heading text-lg text-brand-text truncate">
                      {a.name}
                    </h3>
                    <p className="font-mono text-[11px] text-brand-textMuted break-all">
                      {a.code}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-mono px-2 py-1 rounded-sm bg-brand-bg border border-brand-border text-brand-textMuted">
                    {a.agentCount} agent{a.agentCount === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="text-xs text-brand-textMuted">
                  Created {new Date(a.createdAt).toLocaleDateString("en-IN")}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(a.id)}
                  >
                    <Pencil size={14} />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete area "${a.name}"?`)) {
                        deleteMutation.mutate(a.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full-screen draw modal */}
      <Dialog
        open={drawerOpen}
        onClose={closeAll}
        size="full"
        title={editingId ? `Edit area${editing ? ` — ${editing.name}` : ""}` : "Draw a new area"}
        description="Click on the map to drop up to 20 points. After 3+ points the polygon previews live. Click 'Close path' to finalize."
      >
        <div className="absolute inset-0 top-[var(--dialog-header,0)] flex flex-col">
          <div className="flex-1 relative min-h-[400px]">
            <PolygonDrawer
              key={editingId ?? "new"}
              initialPoints={initialPoints}
              existing={existingForOverlay}
              onChange={(pts) => setDraftPoints(pts)}
              onValidityChange={(isClosed) => setDraftClosed(isClosed)}
            />
          </div>
          <div className="flex items-center justify-end gap-2 p-3 border-t border-brand-border bg-brand-surface">
            <Button variant="ghost" onClick={closeAll}>
              Cancel
            </Button>
            <Button
              onClick={() => setSavePromptOpen(true)}
              disabled={!draftClosed || draftPoints.length < 3}
            >
              Save area…
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Name + code prompt */}
      <Dialog
        open={savePromptOpen}
        onClose={() => setSavePromptOpen(false)}
        title={editingId ? "Update area details" : "Name your area"}
        description="The 20-character code uniquely identifies this area for agents."
      >
        <div className="px-6 py-5 space-y-4">
          <Input
            label="Area name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Indiranagar — North"
            error={errors.name}
            autoFocus
          />
          <Input
            label="20-character code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))}
            placeholder="e.g. INDIRA20A4F92K1XQB7L"
            className="font-mono tracking-wider"
            error={errors.code}
            maxLength={20}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setSavePromptOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmitSave} loading={saveMutation.isPending}>
              {editingId ? "Update area" : "Create area"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
