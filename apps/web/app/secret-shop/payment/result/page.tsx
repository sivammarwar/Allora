"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Status = "loading" | "paid" | "failed" | "pending";

interface StatusResponse {
  paymentStatus: "PAID" | "FAILED" | "PENDING";
  orderId: string;
}

export default function PaymentResultPage() {
  const params = useSearchParams();
  const router = useRouter();
  const txn = params.get("txn");
  const [status, setStatus] = useState<Status>("loading");
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!txn) {
      setStatus("failed");
      return;
    }

    let attempts = 0;
    const maxAttempts = 15;

    const poll = async () => {
      try {
        const data = await api.get<StatusResponse>(
          `/api/secret-shop/payment/status/${txn}`
        );
        setOrderId(data.orderId);
        if (data.paymentStatus === "PAID") {
          setStatus("paid");
          setTimeout(() => router.push("/secret-shop/orders"), 3000);
        } else if (data.paymentStatus === "FAILED") {
          setStatus("failed");
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 2000);
          } else {
            setStatus("pending");
          }
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setStatus("pending");
        }
      }
    };

    poll();
  }, [txn]);

  if (status === "loading") {
    return (
      <div className="page-enter max-w-md mx-auto">
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <Loader2 size={36} className="mx-auto text-brand-primary animate-spin" />
            <p className="font-medium text-brand-text">Verifying payment…</p>
            <p className="text-sm text-brand-textMuted">Please wait, do not close this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className="page-enter max-w-md mx-auto">
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <CheckCircle2 size={48} className="mx-auto text-green-500" />
            <div>
              <p className="text-xl font-bold text-brand-text">Payment Successful!</p>
              <p className="text-sm text-brand-textMuted mt-1">Your order has been placed. Redirecting to orders…</p>
            </div>
            <Button className="w-full" onClick={() => router.push("/secret-shop/orders")}>
              View My Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="page-enter max-w-md mx-auto">
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <XCircle size={48} className="mx-auto text-red-500" />
            <div>
              <p className="text-xl font-bold text-brand-text">Payment Failed</p>
              <p className="text-sm text-brand-textMuted mt-1">
                Your order was cancelled and your cart items have been restocked.
              </p>
            </div>
            <Button className="w-full" onClick={() => router.push("/secret-shop/dashboard")}>
              Back to Shop
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-enter max-w-md mx-auto">
      <Card>
        <CardContent className="py-16 text-center space-y-4">
          <Loader2 size={36} className="mx-auto text-amber-500" />
          <div>
            <p className="text-xl font-bold text-brand-text">Payment Pending</p>
            <p className="text-sm text-brand-textMuted mt-1">
              We haven't received confirmation yet. Your order is on hold.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => router.push("/secret-shop/orders")}>
              View Orders
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setStatus("loading");
                window.location.reload();
              }}
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
