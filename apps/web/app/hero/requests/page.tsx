"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, CheckCircle, MapPin, Phone, Clock, Loader2, User } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSocket } from "@/lib/socket";

function fmtHour(h: number) {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

interface ServiceRequest {
  id: string;
  status: string;
  subcategoryId: string;
  scheduledDate: string;
  scheduledHour: number;
  charge: string;
  discountPercent: string;
  transportCharge: string;
  userName: string;
  userPhone: string;
  userGender?: string;
  userAddress: string;
  subcategory: { id: string; name: string; category: { name: string } };
}

export default function HeroRequestsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"incoming" | "accepted" | "history">("incoming");

  const { data: incoming = [], isLoading: loadingIncoming } = useQuery<ServiceRequest[]>({
    queryKey: ["hero", "service-requests", "incoming"],
    queryFn: () => api.get("/api/hero/service-requests/incoming"),
    refetchInterval: 15000,
  });

  const { data: accepted = [], isLoading: loadingAccepted } = useQuery<ServiceRequest[]>({
    queryKey: ["hero", "service-requests", "ACCEPTED"],
    queryFn: () => api.get("/api/hero/service-requests?status=ACCEPTED"),
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery<ServiceRequest[]>({
    queryKey: ["hero", "service-requests", "history"],
    queryFn: () => api.get("/api/hero/service-requests?status=COMPLETED"),
    enabled: tab === "history",
  });

  useEffect(() => {
    const s = getSocket("/service");
    const onNew = (req: ServiceRequest) => {
      qc.invalidateQueries({ queryKey: ["hero", "service-requests", "incoming"] });
      toast.info(`New booking: ${req.subcategory?.name ?? "Service"} at ${fmtHour(req.scheduledHour)}`);
    };
    const onTaken = () => qc.invalidateQueries({ queryKey: ["hero", "service-requests", "incoming"] });
    const onCancelled = () => {
      qc.invalidateQueries({ queryKey: ["hero", "service-requests", "ACCEPTED"] });
      toast.warning("A booking was cancelled by the user");
    };
    s.on("service_request:new", onNew);
    s.on("service_request:taken", onTaken);
    s.on("service_request:cancelled", onCancelled);
    return () => {
      s.off("service_request:new", onNew);
      s.off("service_request:taken", onTaken);
      s.off("service_request:cancelled", onCancelled);
    };
  }, [qc]);

  const accept = useMutation({
    mutationFn: (id: string) => api.post(`/api/hero/service-requests/${id}/accept`, {}),
    onSuccess: () => {
      toast.success("Booking accepted!");
      qc.invalidateQueries({ queryKey: ["hero", "service-requests"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const complete = useMutation({
    mutationFn: (id: string) => api.post(`/api/hero/service-requests/${id}/complete`, {}),
    onSuccess: () => {
      toast.success("Marked as completed");
      qc.invalidateQueries({ queryKey: ["hero", "service-requests"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const discountedCharge = (req: ServiceRequest) => {
    const base = Number(req.charge);
    const disc = Number(req.discountPercent);
    return base * (1 - disc / 100);
  };

  function RequestCard({ req, actions }: { req: ServiceRequest; actions?: React.ReactNode }) {
    return (
      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-brand-text">{req.subcategory.category.name} › {req.subcategory.name}</p>
              <p className="text-xs text-brand-textMuted flex items-center gap-1 mt-0.5">
                <Clock size={11} /> {new Date(req.scheduledDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} at {fmtHour(req.scheduledHour)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-brand-text">₹{discountedCharge(req).toFixed(0)}</p>
              {Number(req.discountPercent) > 0 && (
                <p className="text-[10px] text-brand-success">{req.discountPercent}% off</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-brand-textMuted">
            <span className="flex items-center gap-1.5"><User size={11} /> {req.userName} · {req.userGender ?? "—"}</span>
            <span className="flex items-center gap-1.5"><Phone size={11} /> {req.userPhone}</span>
            <span className="flex items-center gap-1.5 col-span-full"><MapPin size={11} /> {req.userAddress}</span>
          </div>
          {actions && <div className="flex gap-2 pt-1">{actions}</div>}
        </CardContent>
      </Card>
    );
  }

  const tabs = [
    { key: "incoming", label: "Incoming", count: incoming.length },
    { key: "accepted", label: "Accepted", count: accepted.length },
    { key: "history", label: "History", count: null },
  ] as const;

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Service Requests</h1>
        <p className="text-brand-textMuted text-sm mt-1">Accept incoming requests. First to accept wins the booking.</p>
      </div>

      <div className="flex gap-1 border-b border-brand-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-brand-primary text-brand-primary" : "border-transparent text-brand-textMuted hover:text-brand-text"}`}
          >
            {t.label}{t.count !== null && t.count > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-brand-primary text-white">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === "incoming" && (
        <div className="space-y-3">
          {loadingIncoming ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-primary" /></div>
          ) : incoming.length === 0 ? (
            <div className="text-center py-12 text-brand-textMuted">
              <Bell size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No incoming requests right now.</p>
            </div>
          ) : (
            incoming.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                actions={
                  <Button size="sm" onClick={() => accept.mutate(req.id)} loading={accept.isPending}>
                    <CheckCircle size={14} /> Accept
                  </Button>
                }
              />
            ))
          )}
        </div>
      )}

      {tab === "accepted" && (
        <div className="space-y-3">
          {loadingAccepted ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-primary" /></div>
          ) : accepted.length === 0 ? (
            <p className="text-center py-12 text-sm text-brand-textMuted">No accepted requests.</p>
          ) : (
            accepted.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                actions={
                  <Button size="sm" variant="ghost" onClick={() => complete.mutate(req.id)} loading={complete.isPending}>
                    Mark as completed
                  </Button>
                }
              />
            ))
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {loadingHistory ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-primary" /></div>
          ) : history.length === 0 ? (
            <p className="text-center py-12 text-sm text-brand-textMuted">No completed services yet.</p>
          ) : (
            history.map((req) => <RequestCard key={req.id} req={req} />)
          )}
        </div>
      )}
    </div>
  );
}
