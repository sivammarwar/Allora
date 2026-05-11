"use client";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell, CheckCircle, MapPin, Phone, Clock, Loader2, User, ChevronRight, CheckSquare2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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
  bulkDiscountPercent: string;
  transportCharge: string;
  userName: string;
  userPhone: string;
  userGender?: string;
  userAddress: string;
  subcategory: { id: string; name: string; category: { id: string; name: string } };
}

interface RequestGroup {
  key: string;
  categoryName: string;
  scheduledDate: string;
  scheduledHour: number;
  userName: string;
  userPhone: string;
  userGender?: string;
  userAddress: string;
  requests: ServiceRequest[];
  totalFinal: number;
}

function groupRequests(list: ServiceRequest[]): RequestGroup[] {
  const map = new Map<string, RequestGroup>();
  for (const r of list) {
    const key = `${r.subcategory.category.id}__${r.scheduledDate}__${r.scheduledHour}__${r.userPhone}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        categoryName: r.subcategory.category.name,
        scheduledDate: r.scheduledDate,
        scheduledHour: r.scheduledHour,
        userName: r.userName,
        userPhone: r.userPhone,
        userGender: r.userGender,
        userAddress: r.userAddress,
        requests: [],
        totalFinal: 0,
      });
    }
    const g = map.get(key)!;
    const afterInd = Number(r.charge) * (1 - Number(r.discountPercent) / 100);
    const final = afterInd * (1 - Number(r.bulkDiscountPercent) / 100);
    g.requests.push(r);
    g.totalFinal += final;
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );
}

export default function HeroRequestsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"incoming" | "accepted" | "history">("incoming");
  const [selected, setSelected] = useState<RequestGroup | null>(null);

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

  const incomingGroups = useMemo(() => groupRequests(incoming), [incoming]);
  const acceptedGroups = useMemo(() => groupRequests(accepted), [accepted]);
  const historyGroups  = useMemo(() => groupRequests(history),  [history]);

  useEffect(() => {
    const s = getSocket("/service");
    const onNew = (req: ServiceRequest) => {
      qc.invalidateQueries({ queryKey: ["hero", "service-requests", "incoming"] });
      toast.info(`New booking: ${req.subcategory?.category?.name ?? req.subcategory?.name ?? "Service"} at ${fmtHour(req.scheduledHour)}`);
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

  const acceptAll = useMutation({
    mutationFn: async (ids: string[]) => {
      let count = 0;
      let lastError: unknown = null;
      for (const id of ids) {
        try {
          await api.post(`/api/hero/service-requests/${id}/accept`, {});
          count++;
        } catch (e) {
          lastError = e;
          // ignore if already taken by another hero (409), but keep last error
        }
      }
      if (count === 0) {
        if (lastError instanceof ApiError) throw lastError;
        throw new Error("All requests already taken");
      }
      return count;
    },
    onSuccess: (count) => {
      toast.success(`Accepted ${count} booking${count > 1 ? "s" : ""}!`);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["hero", "service-requests"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : String(e)),
  });

  const completeAll = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.post(`/api/hero/service-requests/${id}/complete`, {})));
    },
    onSuccess: () => {
      toast.success("Session marked as completed");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["hero", "service-requests"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  function GroupCard({ g }: { g: RequestGroup }) {
    return (
      <Card className="hover:shadow-soft-lg transition-shadow cursor-pointer" onClick={() => setSelected(g)}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-brand-text">{g.categoryName}</p>
              <p className="text-xs text-brand-textMuted flex items-center gap-1 mt-0.5">
                <Clock size={11} />
                {new Date(g.scheduledDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} at {fmtHour(g.scheduledHour)}
              </p>
              <p className="text-xs text-brand-textMuted mt-0.5">
                {g.requests.length} service{g.requests.length > 1 ? "s" : ""}: {g.requests.map((r) => r.subcategory.name).join(", ")}
              </p>
              <p className="text-xs text-brand-textMuted flex items-center gap-1 mt-0.5">
                <User size={11} /> {g.userName} · {g.userPhone}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-heading text-lg text-brand-text">₹{g.totalFinal.toFixed(0)}</p>
            </div>
            <ChevronRight size={16} className="text-brand-textMuted shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const tabs = [
    { key: "incoming", label: "Incoming", count: incomingGroups.length },
    { key: "accepted", label: "Accepted",  count: acceptedGroups.length },
    { key: "history",  label: "History",   count: null },
  ] as const;

  const currentGroups =
    tab === "incoming" ? incomingGroups :
    tab === "accepted" ? acceptedGroups : historyGroups;

  const isLoading =
    tab === "incoming" ? loadingIncoming :
    tab === "accepted" ? loadingAccepted : loadingHistory;

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
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-brand-primary text-white">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-primary" /></div>
      ) : currentGroups.length === 0 ? (
        <div className="text-center py-12 text-brand-textMuted">
          {tab === "incoming"
            ? <Bell size={32} className="mx-auto mb-3 opacity-30" />
            : <CheckSquare2 size={32} className="mx-auto mb-3 opacity-30" />}
          <p className="text-sm">
            {tab === "incoming" ? "No incoming requests right now." :
             tab === "accepted" ? "No accepted requests." : "No completed services yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentGroups.map((g) => <GroupCard key={g.key} g={g} />)}
        </div>
      )}

      {/* Session detail dialog */}
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.categoryName}
        description={
          selected
            ? `${new Date(selected.scheduledDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} at ${fmtHour(selected.scheduledHour)}`
            : undefined
        }
        size="sm"
      >
        {selected && (() => {
          const bulkPct = Number(selected.requests[0]?.bulkDiscountPercent ?? 0);
          const subtotal = selected.requests.reduce(
            (s, r) => s + Number(r.charge) * (1 - Number(r.discountPercent) / 100), 0
          );
          const bulkSaving = subtotal * bulkPct / 100;
          return (
            <div className="px-6 py-4 space-y-4">
              {/* Services list */}
              <div className="divide-y divide-brand-border">
                {selected.requests.map((r) => {
                  const afterInd = Number(r.charge) * (1 - Number(r.discountPercent) / 100);
                  const indDisc = Number(r.discountPercent);
                  return (
                    <div key={r.id} className="py-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-brand-text">{r.subcategory.name}</p>
                      <p className="text-sm font-semibold text-brand-text shrink-0">
                        ₹{afterInd.toFixed(0)}
                        {indDisc > 0 && <span className="text-[10px] text-brand-textMuted ml-1">({indDisc}% off)</span>}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Bulk discount + total */}
              {bulkPct > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-brand-border">
                  <div className="flex items-center justify-between text-sm text-brand-textMuted">
                    <span>Subtotal ({selected.requests.length} services)</span>
                    <span>₹{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-success font-medium">Bulk discount ({selected.requests.length} services · {bulkPct}% off)</span>
                    <span className="text-brand-success font-medium">−₹{bulkSaving.toFixed(0)}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-brand-border">
                <p className="text-sm font-semibold text-brand-text">Total earnings</p>
                <p className="font-heading text-xl text-brand-text">₹{selected.totalFinal.toFixed(0)}</p>
              </div>

              {/* Customer info */}
              <div className="p-3 rounded-lg bg-brand-primary/5 border border-brand-primary/20 space-y-1 text-xs">
                <p className="font-medium text-brand-text mb-1">Customer</p>
                <p className="flex items-center gap-1.5 text-brand-textMuted">
                  <User size={11} /> {selected.userName}
                  {selected.userGender && <span>· {selected.userGender.toLowerCase()}</span>}
                </p>
                <p className="flex items-center gap-1.5 text-brand-textMuted">
                  <Phone size={11} /> {selected.userPhone}
                </p>
                <p className="flex items-center gap-1.5 text-brand-textMuted">
                  <MapPin size={11} /> {selected.userAddress}
                </p>
              </div>

              {/* Actions */}
              {tab === "incoming" && (
                <Button
                  className="w-full"
                  onClick={() => acceptAll.mutate(selected.requests.map((r) => r.id))}
                  loading={acceptAll.isPending}
                >
                  <CheckCircle size={14} />
                  Accept all {selected.requests.length} booking{selected.requests.length > 1 ? "s" : ""}
                </Button>
              )}
              {tab === "accepted" && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => completeAll.mutate(selected.requests.map((r) => r.id))}
                  loading={completeAll.isPending}
                >
                  <CheckSquare2 size={14} />
                  Mark all {selected.requests.length} as completed
                </Button>
              )}
            </div>
          );
        })()}
      </Dialog>
    </div>
  );
}
