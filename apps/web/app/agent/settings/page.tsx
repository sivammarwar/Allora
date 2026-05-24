"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Phone, MessageCircle, Settings } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface AgentSettings {
  supportPhone: string | null;
  supportWhatsapp: string | null;
}

export default function AgentSettingsPage() {
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const { data, isLoading } = useQuery<AgentSettings>({
    queryKey: ["agent", "settings"],
    queryFn: () => api.get("/api/agent/settings"),
  });

  useEffect(() => {
    if (data) {
      setPhone(data.supportPhone ?? "");
      setWhatsapp(data.supportWhatsapp ?? "");
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api.patch("/api/agent/settings", {
        supportPhone: phone.trim() || null,
        supportWhatsapp: whatsapp.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent", "settings"] });
      toast.success("Settings saved");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Save failed"),
  });

  return (
    <div className="page-enter space-y-6 max-w-xl">
      <div>
        <h1 className="font-heading text-3xl text-brand-text flex items-center gap-2">
          <Settings size={24} className="text-brand-primary" />
          Area Support Settings
        </h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Configure the support contact shown to users in your area on their home screen.
        </p>
      </div>

      <Card>
        <CardContent className="py-6 space-y-5">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-brand-text">
              <Phone size={14} className="text-brand-primary" />
              Support Phone Number
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9XXXXXXXXX"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-brand-textMuted">
              Shown to users in your area as a tap-to-call number.
            </p>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-brand-text">
              <MessageCircle size={14} className="text-brand-primary" />
              WhatsApp Link
            </label>
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="https://wa.me/919XXXXXXXXX"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-brand-textMuted">
              Use format: <code className="font-mono text-brand-primary">https://wa.me/91XXXXXXXXXX</code> — no dashes or spaces in the number.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={() => save.mutate()} loading={save.isPending}>
              Save settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-brand-textMuted leading-relaxed">
            <strong className="text-brand-text">How it works:</strong> When a user&apos;s location falls within your assigned area, they will see a support banner on their home screen with your phone number and a WhatsApp button. Leave both fields empty to hide the banner for your area.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
