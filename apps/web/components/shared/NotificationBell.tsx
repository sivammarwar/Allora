"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { useCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  data?: unknown;
}

export function NotificationBell() {
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const s = getSocket("/notifications");

    const onAny = (event: string, payload: any) => {
      const n: NotificationItem = {
        id: payload?.id ?? `${event}:${Date.now()}`,
        type: event,
        message:
          payload?.message ??
          (event === "order:new"
            ? "New order received"
            : event === "order:status_update"
              ? "Order status updated"
              : event === "delivery:assigned"
                ? "New delivery assignment"
                : event === "verification:status_update"
                  ? "Verification status updated"
                  : event === "payment:confirmed"
                    ? "Payment confirmed"
                    : "Notification"),
        createdAt: new Date().toISOString(),
        data: payload,
      };
      setItems((prev) => [n, ...prev].slice(0, 25));
      setUnread((u) => u + 1);
    };

    const events = [
      "verification:status_update",
      "order:new",
      "order:status_update",
      "delivery:assigned",
      "payment:confirmed",
    ];
    events.forEach((e) => s.on(e, (p) => onAny(e, p)));

    return () => {
      events.forEach((e) => s.off(e));
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          setUnread(0);
        }}
        className="relative p-2 rounded-sm hover:bg-[rgba(192,98,106,0.08)] text-brand-text"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-primary text-white text-[10px] font-mono flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[60vh] overflow-auto card-surface z-40 animate-fade-slide-up">
          <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between">
            <span className="font-medium text-brand-text">Notifications</span>
            {items.length > 0 && (
              <button
                onClick={() => setItems([])}
                className="text-xs text-brand-textMuted hover:text-brand-text"
              >
                Clear
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-brand-textMuted">
              No notifications yet.
            </div>
          ) : (
            <ul className="divide-y divide-brand-border">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn("px-4 py-3 hover:bg-[rgba(192,98,106,0.04)]")}
                >
                  <p className="text-sm text-brand-text">{n.message}</p>
                  <p className="mt-0.5 text-[11px] text-brand-textMuted font-mono">
                    {new Date(n.createdAt).toLocaleTimeString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
