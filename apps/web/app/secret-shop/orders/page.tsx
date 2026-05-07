"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShoppingBag, Package, Clock, Pencil, Trash2, Plus, Minus, X, ChevronDown, ChevronUp } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface InventoryItem { id: string; price: number; item: { id: string; name: string; brandName: string | null; imageUrl: string | null }; }
interface SecretOrderItem { id: string; quantity: number; unitPrice: number; isPacked: boolean; isRejected: boolean; inventoryItem: InventoryItem; }
interface SecretOrder { id: string; status: string; totalAmount: number; notes: string | null; paymentMode: "COD" | "ONLINE"; paymentStatus: "PENDING" | "PAID" | "FAILED"; createdAt: string; items: SecretOrderItem[]; }

const STATUS_LABELS: Record<string, string> = { PLACED: "Placed", RECEIVED: "Received", PACKED: "Packed", OUT_FOR_DELIVERY: "Out for Delivery", DELIVERED: "Delivered", CANCELLED: "Cancelled" };
const STATUS_COLORS: Record<string, string> = { PLACED: "bg-blue-500/10 text-blue-600", RECEIVED: "bg-purple-500/10 text-purple-600", PACKED: "bg-amber-500/10 text-amber-600", OUT_FOR_DELIVERY: "bg-orange-500/10 text-orange-600", DELIVERED: "bg-green-500/10 text-green-600", CANCELLED: "bg-red-500/10 text-red-600" };
const STEPS = ["PLACED", "RECEIVED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];

function PayBadge({ mode, status }: { mode: string; status: string }) {
  if (mode === "COD") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">COD</span>;
  if (status === "PAID") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-700">Paid · UPI</span>;
  if (status === "FAILED") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600">Payment Failed</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">Payment Pending</span>;
}

// ── Edit order modal ───────────────────────────────────────────────────────────
function EditOrderModal({ order, onClose }: { order: SecretOrder; onClose: () => void }) {
  const qc = useQueryClient();
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const oi of order.items) init[oi.inventoryItem.id] = oi.quantity;
    return init;
  });
  const [notes, setNotes] = useState(order.notes ?? "");

  const { data: available = [] } = useQuery<InventoryItem[]>({
    queryKey: ["secret-shop", "items", ""],
    queryFn: () => api.get("/api/secret-shop/items"),
  });

  // Merge current order items + available items (de-duped)
  const allItems = (() => {
    const seen = new Set<string>();
    const result: InventoryItem[] = [];
    for (const oi of order.items) { seen.add(oi.inventoryItem.id); result.push(oi.inventoryItem); }
    for (const inv of available) { if (!seen.has(inv.id)) result.push(inv); }
    return result;
  })();

  const editMut = useMutation({
    mutationFn: () => api.put(`/api/secret-shop/orders/${order.id}`, {
      items: Object.entries(quantities).filter(([, q]) => q > 0).map(([inventoryItemId, quantity]) => ({ inventoryItemId, quantity })),
      notes: notes || null,
    }),
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["secret-shop", "orders"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to update"),
  });

  const total = allItems.reduce((s, inv) => s + (quantities[inv.id] ?? 0) * Number(inv.price), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="bg-white w-full max-h-[90vh] rounded-t-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Edit Order #{order.id.slice(-6).toUpperCase()}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {allItems.map((inv) => {
            const qty = quantities[inv.id] ?? 0;
            return (
              <div key={inv.id} className="flex items-center gap-3">
                {inv.item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={inv.item.imageUrl} alt={inv.item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><Package size={16} className="text-gray-300" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{inv.item.name}</p>
                  <p className="text-xs text-gray-400">₹{Number(inv.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuantities((p) => ({ ...p, [inv.id]: Math.max(0, (p[inv.id] ?? 0) - 1) }))} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600">
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-gray-800">{qty}</span>
                  <button onClick={() => setQuantities((p) => ({ ...p, [inv.id]: (p[inv.id] ?? 0) + 1 }))} className="w-7 h-7 rounded-full border border-brand-primary bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            );
          })}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-primary resize-none" />
          </div>
        </div>
        <div className="px-4 py-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">New total</span>
            <span className="font-bold text-brand-primary text-lg">₹{total}</span>
          </div>
          <Button className="w-full" onClick={() => editMut.mutate()} loading={editMut.isPending}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

// ── Order card ─────────────────────────────────────────────────────────────────
function OrderCard({ order, canEdit }: { order: SecretOrder; canEdit: boolean }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const cancelMut = useMutation({
    mutationFn: () => api.post(`/api/secret-shop/orders/${order.id}/cancel`, {}),
    onSuccess: () => { toast.success("Order cancelled"); qc.invalidateQueries({ queryKey: ["secret-shop", "orders"] }); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const effectiveTotal = order.items.filter((oi) => !oi.isRejected).reduce((s, oi) => s + oi.quantity * Number(oi.unitPrice), 0);
  const statusIdx = STEPS.indexOf(order.status);

  return (
    <>
      {showEdit && <EditOrderModal order={order} onClose={() => setShowEdit(false)} />}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-gray-400">#{order.id.slice(-8).toUpperCase()}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[order.status] ?? ""}`}>{STATUS_LABELS[order.status] ?? order.status}</span>
                <PayBadge mode={order.paymentMode} status={order.paymentStatus} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{new Date(order.createdAt).toLocaleString("en-IN")}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-brand-primary">₹{effectiveTotal}</p>
              {effectiveTotal !== Number(order.totalAmount) && <p className="text-[10px] text-gray-400 line-through">₹{Number(order.totalAmount)}</p>}
            </div>
          </div>

          {/* Progress bar */}
          {order.status !== "CANCELLED" && (
            <div className="mt-3 flex items-center gap-1">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1 flex items-center gap-0.5">
                  <div className={`h-1 flex-1 rounded-full ${i <= statusIdx ? "bg-brand-primary" : "bg-gray-100"}`} />
                  {i < STEPS.length - 1 && <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i < statusIdx ? "bg-brand-primary" : "bg-gray-100"}`} />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items preview */}
        <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
          <span>{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expanded && (
          <div className="px-4 pb-3 pt-2 space-y-2">
            {order.items.map((oi) => (
              <div key={oi.id} className={`flex items-center gap-2 text-xs ${oi.isRejected ? "opacity-50" : ""}`}>
                {oi.inventoryItem.item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={oi.inventoryItem.item.imageUrl} alt={oi.inventoryItem.item.name} className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                ) : <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0"><Package size={11} className="text-gray-300" /></div>}
                <span className={`flex-1 text-gray-700 ${oi.isRejected ? "line-through" : ""}`}>{oi.inventoryItem.item.name}</span>
                {oi.isRejected && <span className="text-[9px] font-bold bg-red-500 text-white px-1 py-0.5 rounded">Rejected</span>}
                <span className="text-gray-400 flex-shrink-0">{oi.quantity} × ₹{Number(oi.unitPrice)}</span>
              </div>
            ))}
            {order.notes && <p className="text-xs text-gray-400 italic pt-1">Note: {order.notes}</p>}
          </div>
        )}

        {canEdit && (
          <div className="flex gap-2 px-4 pb-4 pt-1">
            <button onClick={() => setShowEdit(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-brand-primary/30 text-brand-primary text-xs font-semibold hover:bg-brand-primary/5">
              <Pencil size={12} /> Edit Order
            </button>
            <button onClick={() => { if (confirm("Cancel this order?")) cancelMut.mutate(); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50" >
              <Trash2 size={12} /> Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function SecretShopOrdersPage() {
  const [tab, setTab] = useState<"current" | "past">("current");

  const { data: currentOrders = [], isLoading: loadingCurrent } = useQuery<SecretOrder[]>({
    queryKey: ["secret-shop", "orders", "active"],
    queryFn: () => api.get("/api/secret-shop/orders?past=false"),
    refetchInterval: 20000,
  });

  const { data: pastOrders = [], isLoading: loadingPast } = useQuery<SecretOrder[]>({
    queryKey: ["secret-shop", "orders", "past"],
    queryFn: () => api.get("/api/secret-shop/orders?past=true"),
    enabled: tab === "past",
  });

  const orders = tab === "current" ? currentOrders : pastOrders;
  const isLoading = tab === "current" ? loadingCurrent : loadingPast;

  return (
    <div className="px-4 py-4 space-y-4">
      <h1 className="font-bold text-xl text-gray-900">My Orders</h1>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {(["current", "past"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
            {t === "current" ? (
              <span className="flex items-center justify-center gap-1.5"><ShoppingBag size={14} />Current</span>
            ) : (
              <span className="flex items-center justify-center gap-1.5"><Clock size={14} />Past</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm">{tab === "current" ? "No active orders." : "No past orders yet."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} canEdit={tab === "current" && order.status === "PLACED"} />
          ))}
        </div>
      )}
    </div>
  );
}
