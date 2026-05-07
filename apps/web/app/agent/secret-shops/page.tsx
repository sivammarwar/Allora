"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, ShieldX, Store, Clock } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SecretShopRequest {
  id: string;
  shopName: string;
  phone: string;
  address: string;
  purpose: string | null;
  status: string;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
}

export default function AgentSecretShopsPage() {
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery<SecretShopRequest[]>({
    queryKey: ["agent", "secret-shop-requests"],
    queryFn: () => api.get("/api/agent/secret-shop-requests"),
    refetchInterval: 30000,
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
                    <p className="text-sm text-brand-textMuted">{req.address}</p>
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
