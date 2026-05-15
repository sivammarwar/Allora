"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Status = "loading" | "paid" | "failed" | "pending";

interface StatusResponse {
  paid: boolean;
  state: string;
}

export default function HeroPaymentResultPage() {
  const params = useSearchParams();
  const router = useRouter();
  const txn = params.get("txn");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!txn) {
      setStatus("pending");
      return;
    }

    let attempts = 0;
    const maxAttempts = 15;

    const poll = async () => {
      try {
        const data = await api.get<StatusResponse>(
          `/api/hero/onboarding-payment/status/${txn}`
        );
        if (data.paid || data.state === "COMPLETED") {
          setStatus("paid");
          // Hard navigation to bypass any stale React Query cache so the
          // dashboard refetches /api/hero/me and unlocks immediately.
          setTimeout(() => {
            window.location.href = "/hero/dashboard";
          }, 2000);
        } else if (data.state === "FAILED") {
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
      <div className="page-enter max-w-md mx-auto pt-16 px-4">
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
      <div className="page-enter max-w-md mx-auto pt-16 px-4">
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <CheckCircle2 size={48} className="mx-auto text-green-500" />
            <div>
              <p className="text-xl font-bold text-brand-text">Payment Successful!</p>
              <p className="text-sm text-brand-textMuted mt-1">
                Your hero account is now active. Redirecting to your dashboard…
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => { window.location.href = "/hero/dashboard"; }}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="page-enter max-w-md mx-auto pt-16 px-4">
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <XCircle size={48} className="mx-auto text-red-500" />
            <div>
              <p className="text-xl font-bold text-brand-text">Payment Failed</p>
              <p className="text-sm text-brand-textMuted mt-1">
                Your payment did not go through. Please try again to activate your hero account.
              </p>
            </div>
            <Button className="w-full" onClick={() => router.push("/hero/dashboard")}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-enter max-w-md mx-auto pt-16 px-4">
      <Card>
        <CardContent className="py-16 text-center space-y-4">
          <Loader2 size={36} className="mx-auto text-amber-500" />
          <div>
            <p className="text-xl font-bold text-brand-text">Confirming Payment…</p>
            <p className="text-sm text-brand-textMuted mt-1">
              If you completed the payment, tap <strong>Check Status</strong> below.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => router.push("/hero/dashboard")}>
              Go to Dashboard
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setStatus("loading");
                window.location.reload();
              }}
            >
              Check Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
