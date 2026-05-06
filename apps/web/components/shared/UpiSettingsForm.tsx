"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QrCode } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  initialVpa: string | null;
  initialName: string | null;
}

const VPA_REGEX = /^[\w.\-]{2,256}@[A-Za-z]{2,64}$/;

/**
 * Tiny form embedded in the delivery dashboard. Lets the partner store an
 * optional UPI VPA + display name so customers see a UPI QR for COD orders.
 */
export function UpiSettingsForm({ initialVpa, initialName }: Props) {
  const qc = useQueryClient();
  const [vpa, setVpa] = useState(initialVpa ?? "");
  const [name, setName] = useState(initialName ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVpa(initialVpa ?? "");
    setName(initialName ?? "");
  }, [initialVpa, initialName]);

  const save = useMutation({
    mutationFn: () =>
      api.put("/api/delivery/profile/upi", {
        upiVpa: vpa.trim() || null,
        upiName: name.trim() || null,
      }),
    onSuccess: () => {
      toast.success("UPI details saved");
      qc.invalidateQueries({ queryKey: ["delivery", "me"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Couldn't save"),
  });

  const clear = useMutation({
    mutationFn: () =>
      api.put("/api/delivery/profile/upi", { upiVpa: null, upiName: null }),
    onSuccess: () => {
      toast.success("UPI details cleared");
      setVpa("");
      setName("");
      qc.invalidateQueries({ queryKey: ["delivery", "me"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Couldn't clear"),
  });

  function submit() {
    setError(null);
    const trimmed = vpa.trim();
    if (trimmed && !VPA_REGEX.test(trimmed)) {
      setError("Enter a valid UPI ID (e.g. name@oksbi)");
      return;
    }
    if (trimmed && name.trim().length < 2) {
      setError("Add the name shown in your UPI app");
      return;
    }
    save.mutate();
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <QrCode className="text-brand-primary" size={18} />
          <p className="font-medium text-brand-text">UPI for COD orders</p>
        </div>
        <p className="text-xs text-brand-textMuted leading-relaxed">
          Optional. If set, customers placing Cash-on-Delivery orders will see
          a UPI QR (with your name and the exact amount) so they can pay you on
          the doorstep instead of handing over cash.
        </p>
        <Input
          label="UPI ID"
          placeholder="yourname@oksbi"
          value={vpa}
          onChange={(e) => setVpa(e.target.value)}
        />
        <Input
          label="Display name"
          placeholder="Name shown in your UPI app"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <p className="text-sm text-brand-error">{error}</p>}
        <div className="flex items-center gap-2">
          <Button onClick={submit} loading={save.isPending}>
            Save
          </Button>
          {(initialVpa || initialName) && (
            <Button
              variant="ghost"
              onClick={() => clear.mutate()}
              loading={clear.isPending}
            >
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
