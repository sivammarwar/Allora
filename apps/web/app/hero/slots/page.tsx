"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function fmtHour(h: number) {
  const h12 = h === 0 || h === 24 ? 12 : h > 12 ? h - 12 : h;
  const suffix = h < 12 ? "AM" : "PM";
  return `${h12} ${suffix}`;
}
function fmtSlotRow(h: number) {
  const end = h + 1;
  const s = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const e = end === 24 ? 12 : end > 12 ? end - 12 : end;
  const sSuffix = h < 12 ? "AM" : "PM";
  const eSuffix = end <= 12 ? (end < 12 ? "AM" : "PM") : "PM";
  if (sSuffix === eSuffix) return `${s}\u2013${e} ${sSuffix}`;
  return `${fmtHour(h)}\u2013${fmtHour(end)}`;
}

function getNext7Days() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}
function toDateStr(d: Date) { return d.toISOString().split("T")[0]; }

interface SlotRecord {
  id: string;
  date: string;
  hour: number;
  isBooked: boolean;
  isBusyByHero: boolean;
  serviceRequest?: { id: string; userName: string; userPhone: string } | null;
}

export default function HeroSlotsPage() {
  const qc = useQueryClient();
  const t = useT();
  const days = getNext7Days();
  const from = toDateStr(days[0]);
  const to = toDateStr(days[6]);

  const { data, isLoading } = useQuery<{ slots: SlotRecord[]; slotStartHour: number; slotEndHour: number }>({
    queryKey: ["hero", "slots", from, to],
    queryFn: () => api.get(`/api/hero/slots?from=${from}&to=${to}`),
  });

  const slots = data?.slots ?? [];
  const startHour = data?.slotStartHour ?? 6;
  const endHour = data?.slotEndHour ?? 20;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  const busy = useMutation({
    mutationFn: ({ date, hour, isBusy }: { date: string; hour: number; isBusy: boolean }) =>
      api.post("/api/hero/slots/busy", { date, hour, isBusy }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hero", "slots"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  function getSlot(dateStr: string, hour: number) {
    return slots.find((s) => s.date.startsWith(dateStr) && s.hour === hour);
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-brand-text">{t("slots.title")}</h1>
          <p className="text-brand-textMuted text-sm mt-1">{t("slots.subtitle")}</p>
        </div>
        <span className="text-sm text-brand-textMuted">
          {days[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" })} –{" "}
          {days[6].toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-primary" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5 text-brand-textMuted font-medium w-16">Time</th>
                {days.map((d) => (
                  <th key={toDateStr(d)} className="px-1 py-1.5 text-center font-medium text-brand-text min-w-[72px]">
                    <div>{DAYS[d.getDay()]}</div>
                    <div className="text-[10px] text-brand-textMuted">{d.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((hour) => (
                <tr key={hour} className="border-t border-brand-border/40">
                  <td className="px-2 py-1 text-brand-textMuted font-mono text-[10px] whitespace-nowrap">{fmtSlotRow(hour)}</td>
                  {days.map((d) => {
                    const dateStr = toDateStr(d);
                    const slot = getSlot(dateStr, hour);
                    const isBooked = slot?.isBooked;
                    const isBusy = slot?.isBusyByHero;
                    const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));

                    let cellClass = "bg-brand-bg border border-brand-border/30 rounded-sm cursor-pointer hover:bg-brand-surface transition-colors";
                    let label = t("slots.free");
                    if (isBooked) { cellClass = "bg-green-500/20 border border-green-500/30 rounded-sm cursor-not-allowed"; label = t("slots.booked"); }
                    else if (isBusy) { cellClass = "bg-orange-400/20 border border-orange-400/30 rounded-sm cursor-pointer hover:bg-orange-400/30 transition-colors"; label = t("slots.busy"); }
                    if (isPast) cellClass += " opacity-40 pointer-events-none";

                    return (
                      <td key={dateStr} className="px-1 py-1">
                        <button
                          className={`w-full text-center py-1.5 text-[10px] font-medium rounded-sm ${cellClass}`}
                          disabled={isBooked || isPast || busy.isPending}
                          onClick={() =>
                            busy.mutate({ date: dateStr, hour, isBusy: !isBusy })
                          }
                          title={slot?.serviceRequest ? `${slot.serviceRequest.userName} · ${slot.serviceRequest.userPhone}` : undefined}
                        >
                          {label}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-bg border border-brand-border inline-block" /> {t("slots.free")}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400/20 border border-orange-400/30 inline-block" /> {t("slots.busyByYou")}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30 inline-block" /> {t("slots.booked")}</span>
      </div>
    </div>
  );
}
