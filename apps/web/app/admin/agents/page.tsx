"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";

interface AgentRow {
  id: string;
  user: { id: string; email: string; name: string | null };
  primaryArea: { id: string; name: string; code: string } | null;
  agentAreas: Array<{ id: string; name: string; code: string }>;
  isVerifiedByAdmin: boolean;
  addedAt: string;
}

interface AreaOption {
  id: string;
  name: string;
  code: string;
}

export default function AdminAgentsPage() {
  const qc = useQueryClient();

  const { data: agents = [], isLoading } = useQuery<AgentRow[]>({
    queryKey: ["admin", "agents"],
    queryFn: () => api.get("/api/admin/agents"),
  });

  const { data: areas = [] } = useQuery<AreaOption[]>({
    queryKey: ["admin", "areas-options"],
    queryFn: () => api.get("/api/admin/areas?fields=options"),
  });

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [areaIds, setAreaIds] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: (input: { email: string; name?: string; areaIds: string[] }) =>
      api.post("/api/admin/agents", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agents"] });
      toast.success("Agent added");
      setOpen(false);
      setEmail("");
      setName("");
      setAreaIds([]);
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Failed to add agent");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/agents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agents"] });
      toast.success("Agent removed");
    },
  });

  const toggleArea = (id: string) =>
    setAreaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const submit = () => {
    if (!email || areaIds.length === 0) {
      toast.error("Email and at least one area are required");
      return;
    }
    createMutation.mutate({ email: email.toLowerCase(), name: name || undefined, areaIds });
  };

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">Agents</h1>
          <p className="text-brand-textMuted text-sm mt-1">
            Onboard agents to verify heroes and delivery boys in their areas.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={areas.length === 0}>
          <Plus size={16} />
          Add agent
        </Button>
      </div>

      {areas.length === 0 && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-brand-textMuted">
              Define at least one area before adding agents.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-brand-textMuted text-sm">Loading…</div>
      ) : agents.length === 0 && areas.length > 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-brand-textMuted text-sm">
            No agents yet. Click "Add agent" to onboard the first one.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-bg border-b border-brand-border">
                <tr className="text-left text-brand-textMuted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Areas</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {agents.map((a) => (
                  <tr key={a.id} className="hover:bg-[rgba(192,98,106,0.04)]">
                    <td className="px-4 py-3 text-brand-text">
                      {a.user.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-brand-text">{a.user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {a.agentAreas.length === 0 ? (
                          <span className="text-xs text-brand-textMuted">No areas</span>
                        ) : (
                          a.agentAreas.map((area) => (
                            <span
                              key={area.id}
                              className="text-[11px] px-2 py-0.5 rounded-sm bg-brand-bg border border-brand-border text-brand-text"
                            >
                              {area.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-textMuted text-xs">
                      {new Date(a.addedAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Remove agent ${a.user.email}?`)) {
                            removeMutation.mutate(a.id);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add agent"
        description="The agent will sign in with this email via OTP. Assign at least one area."
      >
        <div className="px-6 py-5 space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="agent@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <Input
            label="Display name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Assigned areas
            </label>
            <div className="space-y-1 max-h-48 overflow-auto rounded-sm border border-brand-border bg-brand-bg p-2">
              {areas.map((a) => {
                const checked = areaIds.includes(a.id);
                return (
                  <label
                    key={a.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-[rgba(192,98,106,0.06)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArea(a.id)}
                      className="accent-brand-primary"
                    />
                    <span className="text-sm text-brand-text">{a.name}</span>
                    <span className="ml-auto font-mono text-[10px] text-brand-textMuted">
                      {a.code}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={createMutation.isPending}>
              Add agent
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
