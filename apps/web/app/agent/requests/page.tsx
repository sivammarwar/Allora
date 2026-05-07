"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronRight, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface VerificationRequest {
  id: string;
  requestType: "HERO" | "DELIVERY_BOY";
  status: "PENDING" | "IN_PROGRESS" | "VERIFIED" | "REJECTED";
  details: any;
  requester: { id: string; email: string; name: string | null };
  createdAt: string;
}

const STATUSES = ["PENDING", "IN_PROGRESS", "VERIFIED", "REJECTED"] as const;

export default function AgentRequestsPage() {
  const [filter, setFilter] = useState<typeof STATUSES[number] | "ALL">("PENDING");

  const { data: rows = [], isLoading } = useQuery<VerificationRequest[]>({
    queryKey: ["agent", "requests", filter],
    queryFn: () =>
      api.get(filter === "ALL" ? "/api/agent/requests" : `/api/agent/requests?status=${filter}`),
  });

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl text-brand-text">Verification requests</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Review providers who want to operate in your areas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["PENDING", "IN_PROGRESS", "VERIFIED", "REJECTED", "ALL"] as const).map(
          (s) => (
            <Button
              key={s}
              variant={filter === s ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilter(s)}
            >
              {s.replace("_", " ")}
            </Button>
          )
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-brand-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-brand-textMuted text-sm">
            No requests in this state.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link key={r.id} href={`/agent/requests/${r.id}`}>
              <Card className="hover:shadow-soft-lg transition-shadow">
                <CardContent className="flex items-center gap-4 py-4">
                  <div
                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      r.requestType === "HERO"
                        ? "bg-brand-primary/10 text-brand-primary"
                        : "bg-brand-secondary/10 text-brand-secondary"
                    }`}
                  >
                    {r.status === "VERIFIED" ? (
                      <ShieldCheck size={18} />
                    ) : (
                      <ShieldAlert size={18} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-brand-text">
                        {r.details?.name ?? r.requester.name ?? r.requester.email}
                      </h3>
                      <span className="text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded-sm bg-brand-bg border border-brand-border text-brand-textMuted">
                        {r.requestType.replace("_", " ")}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded-sm ${
                          r.status === "PENDING"
                            ? "bg-brand-warning/15 text-brand-warning"
                            : r.status === "IN_PROGRESS"
                              ? "bg-brand-primary/15 text-brand-primary"
                              : r.status === "VERIFIED"
                                ? "bg-brand-success/15 text-brand-success"
                                : "bg-brand-error/15 text-brand-error"
                        }`}
                      >
                        {r.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-brand-textMuted truncate">
                      {r.requestType === "HERO"
                        ? r.details?.serviceName
                        : r.details?.purpose ?? "Delivery partner"}{" "}
                      · {r.requester.email} ·{" "}
                      {new Date(r.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <ChevronRight className="text-brand-textMuted" size={18} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
