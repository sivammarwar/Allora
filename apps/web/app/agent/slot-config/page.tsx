"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Save } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const fmt = (h: number) => `${String(h).padStart(2, "0")}:00 ${h < 12 ? "AM" : h === 12 ? "PM" : "PM"}`.replace(/^0/, "").replace("00:00 AM", "12:00 AM").replace("12:00 PM","12:00 PM");
const fmtHour = (h: number) => {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
};

export default function SlotConfigPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ slotStartHour: number; slotEndHour: number }>({
    queryKey: ["agent", "slot-config"],
    queryFn: () => api.get("/api/agent/slot-config"),
  });

  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);

  const startVal = start ?? data?.slotStartHour ?? 6;
  const endVal = end ?? data?.slotEndHour ?? 20;

  const save = useMutation({
    mutationFn: () => api.put("/api/agent/slot-config", { slotStartHour: startVal, slotEndHour: endVal }),
    onSuccess: () => {
      toast.success("Slot hours updated");
      qc.invalidateQueries({ queryKey: ["agent", "slot-config"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div className="page-enter max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Slot Hours</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Set the daily booking window for heroes in your area.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-6 py-6">
          {isLoading ? (
            <p className="text-sm text-brand-textMuted text-center py-4">Loading…</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-brand-primary flex-shrink-0" />
                <span className="text-sm font-medium text-brand-text">
                  Current window: <span className="text-brand-primary">{fmtHour(data?.slotStartHour ?? 6)} – {fmtHour(data?.slotEndHour ?? 20)}</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-brand-text">Start time</label>
                  <select
                    value={startVal}
                    onChange={(e) => setStart(Number(e.target.value))}
                    className="w-full p-2.5 rounded-sm border border-brand-border bg-brand-surface text-sm text-brand-text focus:outline-none focus:border-brand-primary"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{fmtHour(h)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-brand-text">End time</label>
                  <select
                    value={endVal}
                    onChange={(e) => setEnd(Number(e.target.value))}
                    className="w-full p-2.5 rounded-sm border border-brand-border bg-brand-surface text-sm text-brand-text focus:outline-none focus:border-brand-primary"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{fmtHour(h)}</option>
                    ))}
                  </select>
                </div>
              </div>
              {startVal >= endVal && (
                <p className="text-xs text-red-500">Start time must be before end time.</p>
              )}
              <div className="flex justify-end">
                <Button onClick={() => save.mutate()} loading={save.isPending} disabled={startVal >= endVal}>
                  <Save size={15} /> Save
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
