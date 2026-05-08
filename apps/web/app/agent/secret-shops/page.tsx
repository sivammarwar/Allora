"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, ShieldX, Store, Clock, MapPin, Pencil, X, Check } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SecretShopRequest {
  id: string;
  shopName: string;
  phone: string;
  address: string;
  locationLat: number;
  locationLng: number;
  purpose: string | null;
  status: string;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
}

export default function AgentSecretShopsPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState("");

  const { data: requests = [], isLoading } = useQuery<SecretShopRequest[]>({
    queryKey: ["agent", "secret-shop-requests"],
    queryFn: () => api.get("/api/agent/secret-shop-requests"),
    refetchInterval: 30000,
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ id, address }: { id: string; address: string }) =>
      api.patch(`/api/agent/secret-shop-requests/${id}/address`, { address }),
    onSuccess: () => {
      toast.success("Address updated");
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["agent", "secret-shop-requests"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to update address"),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: "approve" | "reject" }) =>
      api.post("/api/agent/secret-shop-requests/verify", { requestId, action }),
    onSuccess: (_data, vars) => {
      toast.success(vars.action === "approve" ? "Shop verified!" : "Request rejected");
      qc.invalidateQueries({ queryKey: ["agent", "secret-shop-requests"] });
      qc.invalidateQueries({ queryKey: ["agent", "verified-secret-shops"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl text-brand-text">Verify Secret Shops</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Review and approve verification requests from secret shops in your area
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-brand-textMuted text-sm">Loading...</div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Store size={28} className="mx-auto mb-3 text-brand-textMuted" />
            <p className="text-brand-textMuted text-sm">No pending verification requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req.id}>
              <CardContent className="py-5 space-y-4">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Store size={16} className="text-brand-primary" />
                      <h3 className="font-medium text-brand-text">{req.shopName}</h3>
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">
                        <Clock size={10} />
                        {req.status}
                      </span>
                    </div>
                    <p className="text-sm text-brand-textMuted">
                      {req.user.name || req.user.email} · {req.phone}
                    </p>
                    {editingId === req.id ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          autoFocus
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="flex-1 text-sm px-2.5 py-1.5 rounded border border-brand-primary/40 bg-brand-surface focus:outline-none focus:border-brand-primary text-brand-text"
                        />
                        <button
                          onClick={() => updateAddressMutation.mutate({ id: req.id, address: editAddress })}
                          disabled={updateAddressMutation.isPending || !editAddress.trim()}
                          className="w-7 h-7 flex items-center justify-center rounded bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 text-gray-500 hover:bg-gray-200"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-brand-textMuted">{req.address}</p>
                        <button
                          onClick={() => { setEditingId(req.id); setEditAddress(req.address); }}
                          className="inline-flex items-center gap-1 text-xs text-brand-textMuted hover:text-brand-primary font-medium"
                        >
                          <Pencil size={10} /> Edit
                        </button>
                        {req.locationLat !== 0 && req.locationLng !== 0 && (
                          <a
                            href={`https://www.google.com/maps?q=${req.locationLat},${req.locationLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline font-medium"
                          >
                            <MapPin size={11} /> View on Map
                          </a>
                        )}
                      </div>
                    )}
                    {req.purpose && (
                      <p className="text-xs text-brand-textMuted italic">{req.purpose}</p>
                    )}
                    <p className="text-xs text-brand-textMuted">
                      Submitted {new Date(req.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-brand-error border-brand-error/30 hover:bg-brand-error/5"
                      onClick={() => verifyMutation.mutate({ requestId: req.id, action: "reject" })}
                      loading={verifyMutation.isPending}
                    >
                      <ShieldX size={14} className="mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => verifyMutation.mutate({ requestId: req.id, action: "approve" })}
                      loading={verifyMutation.isPending}
                    >
                      <ShieldCheck size={14} className="mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
