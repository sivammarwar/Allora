"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Package, Banknote, Search, TrendingUp, ShoppingBag, Wallet, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";

interface SecretOrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  isRejected: boolean;
  inventoryItem: { item: { name: string; brandName: string | null } };
}

interface SecretOrder {
  id: string;
  status: string;
  totalAmount: number;
  paymentMode: "COD" | "ONLINE";
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  createdAt: string;
  items: SecretOrderItem[];
}

const ORDER_STATUS_LABEL: Record<string, string> = { PLACED: "Placed", RECEIVED: "Received", PACKED: "Packed", OUT_FOR_DELIVERY: "Out for Delivery", DELIVERED: "Delivered", CANCELLED: "Cancelled" };

function effectiveTotal(items: SecretOrderItem[]) {
  return items.filter((i) => !i.isRejected).reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0);
}

function PaymentBadge({ mode, status }: { mode: string; status: string }) {
  if (mode === "COD") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <Banknote size={9} /> COD
    </span>
  );
  if (status === "PAID") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
      <CreditCard size={9} /> Paid · UPI
    </span>
  );
  if (status === "FAILED") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
      <CreditCard size={9} /> Failed
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
      <CreditCard size={9} /> Pending
    </span>
  );
}

function OrderRow({ order }: { order: SecretOrder }) {
  const [open, setOpen] = useState(false);
  const effective = effectiveTotal(order.items);
  const original = Number(order.totalAmount);
  const isDelivered = order.status === "DELIVERED";
  const isCancelled = order.status === "CANCELLED";

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isCancelled ? "opacity-60" : ""}`} style={{ borderColor: "#f0f0f0" }}>
      <div className="px-4 py-3.5 flex items-center gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isDelivered ? "bg-green-50" : isCancelled ? "bg-gray-100" : "bg-blue-50"
        }`}>
          <ShoppingBag size={18} className={isDelivered ? "text-green-500" : isCancelled ? "text-gray-400" : "text-blue-500"} />
        </div>

        {/* Middle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-gray-800">#{order.id.slice(-7).toUpperCase()}</span>
            <PaymentBadge mode={order.paymentMode} status={order.paymentStatus} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              isDelivered ? "bg-green-50 text-green-700" :
              isCancelled ? "bg-gray-100 text-gray-500" :
              "bg-blue-50 text-blue-600"
            }`}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</span>
            <span className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</span>
          </div>
        </div>

        {/* Right */}
        <div className="text-right flex-shrink-0">
          <p className={`font-bold text-base leading-tight ${isCancelled ? "text-gray-400" : "text-gray-900"}`}>₹{effective}</p>
          {effective !== original && <p className="text-[10px] text-gray-400 line-through">₹{original}</p>}
        </div>

        {/* Expand */}
        <button onClick={() => setOpen(!open)} className="ml-1 text-gray-400 flex-shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-50 space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className={`flex items-center justify-between text-xs gap-2 ${item.isRejected ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-1.5 min-w-0">
                <Package size={11} className="text-gray-300 flex-shrink-0" />
                <span className={`text-gray-700 truncate ${item.isRejected ? "line-through" : ""}`}>{item.inventoryItem.item.name}</span>
                {item.inventoryItem.item.brandName && <span className="text-gray-400 flex-shrink-0">· {item.inventoryItem.item.brandName}</span>}
                {item.isRejected && <span className="text-[9px] font-bold bg-red-500 text-white px-1 py-0.5 rounded flex-shrink-0">Rejected</span>}
              </div>
              <span className="text-gray-500 flex-shrink-0">{item.quantity} × ₹{Number(item.unitPrice)}</span>
            </div>
          ))}
          <div className="pt-1 flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 mt-1">
            <span>{new Date(order.createdAt).toLocaleString("en-IN")}</span>
            <span className="font-semibold text-gray-700">Total ₹{effective}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SecretShopPaymentHistoryPage() {
  const [search, setSearch] = useState("");
  const { data: orders = [], isLoading } = useQuery<SecretOrder[]>({
    queryKey: ["secret-shop", "payment-history"],
    queryFn: () => api.get("/api/secret-shop/orders?all=true"),
  });

  const filtered = search.trim()
    ? orders.filter((o) => {
        const q = search.toLowerCase();
        return (
          o.id.toLowerCase().includes(q) ||
          o.status.toLowerCase().includes(q) ||
          o.paymentMode.toLowerCase().includes(q) ||
          o.paymentStatus.toLowerCase().includes(q) ||
          o.items.some((i) => i.inventoryItem.item.name.toLowerCase().includes(q) || (i.inventoryItem.item.brandName ?? "").toLowerCase().includes(q))
        );
      })
    : orders;

  const totalPaid = orders.filter((o) => o.paymentMode === "ONLINE" && o.paymentStatus === "PAID").reduce((s, o) => s + effectiveTotal(o.items), 0);
  const totalCOD = orders.filter((o) => o.paymentMode === "COD" && o.paymentStatus === "PAID").reduce((s, o) => s + effectiveTotal(o.items), 0);
  const totalSpent = totalPaid + totalCOD;

  return (
    <div className="space-y-0">
      {/* Hero banner */}
      <div className="mx-4 mt-4 mb-4 rounded-2xl p-5 text-white overflow-hidden relative" style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }} />
        <p className="text-xs font-medium text-white/70 mb-0.5">Total Spent</p>
        <p className="text-3xl font-bold tracking-tight">₹{totalSpent.toLocaleString("en-IN")}</p>
        <p className="text-xs text-white/60 mt-1">{orders.length} order{orders.length !== 1 ? "s" : ""} placed</p>
        <TrendingUp size={40} className="absolute right-5 bottom-4 text-white/20" />
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <CreditCard size={16} className="text-green-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-medium">Online Paid</p>
            <p className="text-base font-bold text-gray-900">₹{totalPaid.toLocaleString("en-IN")}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Wallet size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-medium">COD Paid</p>
            <p className="text-base font-bold text-gray-900">₹{totalCOD.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by item, status, order ID…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-brand-primary shadow-sm"
          />
        </div>
      </div>

      {/* Orders section header */}
      {orders.length > 0 && (
        <div className="px-4 mb-2 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">All Orders</p>
          <span className="text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 px-8">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <CreditCard size={28} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-500 text-base">No payments yet</p>
          <p className="text-gray-400 text-sm mt-1">Your order payment history will appear here once you start ordering.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 px-4">
          <p className="text-gray-400 text-sm">No records match &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div className="px-4 space-y-3 pb-4">
          {filtered.map((order) => <OrderRow key={order.id} order={order} />)}
        </div>
      )}
    </div>
  );
}
