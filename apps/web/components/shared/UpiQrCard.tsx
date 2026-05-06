"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/utils";

interface Props {
  /** UPI VPA (e.g. `name@oksbi`). */
  vpa: string;
  /** Display name shown in the UPI app. */
  payeeName: string;
  /** Amount to pre-fill in INR. */
  amount: number;
  /** Optional transaction note (becomes `tn=` in the deeplink). */
  note?: string;
}

/**
 * Renders a UPI QR (and a tap-to-pay deeplink) using the standard
 * `upi://pay?...` scheme. Works with PhonePe, GPay, Paytm, BHIM, etc.
 */
export function UpiQrCard({ vpa, payeeName, amount, note }: Props) {
  const link =
    `upi://pay?pa=${encodeURIComponent(vpa)}` +
    `&pn=${encodeURIComponent(payeeName)}` +
    `&am=${amount.toFixed(2)}` +
    `&cu=INR` +
    (note ? `&tn=${encodeURIComponent(note)}` : "");

  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(link, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: { dark: "#2E1A1A", light: "#FFF8F9" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [link]);

  async function copyVpa() {
    try {
      await navigator.clipboard.writeText(vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-brand-primary">
            Pay {payeeName} via UPI
          </p>
          <span className="font-heading text-xl text-brand-text">
            {formatINR(amount)}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="shrink-0 rounded-sm border border-brand-border p-2 bg-brand-bg">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt="UPI QR"
                width={180}
                height={180}
                className="block"
              />
            ) : (
              <div className="w-[180px] h-[180px] grid place-items-center text-xs text-brand-textMuted">
                Generating…
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-mono text-brand-textMuted">
                UPI ID
              </p>
              <button
                type="button"
                onClick={copyVpa}
                className="inline-flex items-center gap-1.5 font-mono text-brand-text hover:text-brand-primary transition-colors"
              >
                {vpa}
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <a
              href={link}
              className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 rounded-sm bg-brand-primary text-white text-sm font-medium hover:bg-brand-secondary transition-colors"
            >
              Open in UPI app
            </a>
            <p className="text-xs text-brand-textMuted leading-relaxed">
              Scan with any UPI app (GPay, PhonePe, Paytm, BHIM). After
              payment, hand the partner the change-confirmation screen.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
