"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowRight, Wallet, Coins, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";

interface Stats {
  today: {
    records: number;
    amountToHero: number;
    amountToDeliveryBoy: number;
    platformFee: number;
  };
  unsettled: {
    records: number;
    amountToHero: number;
    amountToDeliveryBoy: number;
  };
}

export default function PayDashboardPage() {
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ["pay", "stats"],
    queryFn: () => api.get("/api/pay/stats"),
  });

  return (
    <div className="page-enter space-y-8 max-w-5xl">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Treasury overview</h1>
        <p className="text-sm text-brand-textMuted mt-1">
          Daily payment records, settle pending dues, and audit hero / delivery
          earnings.
        </p>
      </div>

      {isLoading || !data ? (
        <Loader2 className="animate-spin text-brand-primary" />
      ) : (
        <>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-brand-primary mb-2">
              Today
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatTile
                icon={<Receipt size={16} />}
                label="Records"
                value={data.today.records.toString()}
                note="Orders settled today"
              />
              <StatTile
                icon={<Coins size={16} />}
                label="Hero earnings"
                value={formatINR(data.today.amountToHero)}
                note="Owed to heroes"
              />
              <StatTile
                icon={<Wallet size={16} />}
                label="Platform fee"
                value={formatINR(data.today.platformFee)}
                note="10% of order value"
              />
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-brand-primary mb-2">
              Pending settlement
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatTile
                icon={<Receipt size={16} />}
                label="Unsettled records"
                value={data.unsettled.records.toString()}
                note="Awaiting payout"
              />
              <StatTile
                icon={<Coins size={16} />}
                label="Owed to heroes"
                value={formatINR(data.unsettled.amountToHero)}
                note="Pending hero payouts"
              />
              <StatTile
                icon={<Coins size={16} />}
                label="Owed to delivery"
                value={formatINR(data.unsettled.amountToDeliveryBoy)}
                note="Pending delivery payouts"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/pay/records">
              <Card className="hover:shadow-soft-lg transition-shadow">
                <CardContent className="flex items-center gap-3 py-5">
                  <Receipt className="text-brand-primary" size={20} />
                  <div className="flex-1">
                    <p className="font-medium text-brand-text">
                      Daily records
                    </p>
                    <p className="text-xs text-brand-textMuted">
                      Filter by date, hero, payment method · settle in bulk
                    </p>
                  </div>
                  <ArrowRight className="text-brand-textMuted" size={16} />
                </CardContent>
              </Card>
            </Link>
            <Link href="/pay/earnings">
              <Card className="hover:shadow-soft-lg transition-shadow">
                <CardContent className="flex items-center gap-3 py-5">
                  <Coins className="text-brand-primary" size={20} />
                  <div className="flex-1">
                    <p className="font-medium text-brand-text">
                      Earnings views
                    </p>
                    <p className="text-xs text-brand-textMuted">
                      Per-day per-hero / per-delivery payout history
                    </p>
                  </div>
                  <ArrowRight className="text-brand-textMuted" size={16} />
                </CardContent>
              </Card>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-brand-primary">
          {icon}
          <span className="text-[10px] uppercase tracking-widest font-mono">
            {label}
          </span>
        </div>
        <p className="font-heading text-3xl text-brand-text">{value}</p>
        <p className="text-xs text-brand-textMuted">{note}</p>
      </CardContent>
    </Card>
  );
}
