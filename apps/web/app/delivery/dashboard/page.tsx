"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Clock } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { UpiSettingsForm } from "@/components/shared/UpiSettingsForm";
import { getSocket } from "@/lib/socket";

interface MeResponse {
  state: "needs_request" | "pending" | "verified";
  request?: { id: string; status: string; createdAt: string };
  profile?: any;
}

interface FormState {
  name: string;
  phone: string;
  address: string;
  location: { lat: number; lng: number } | null;
  profileImageUrl: string | null;
  purpose: string;
}

const initialForm: FormState = {
  name: "",
  phone: "",
  address: "",
  location: null,
  profileImageUrl: null,
  purpose: "",
};

export default function DeliveryDashboardPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<MeResponse>({
    queryKey: ["delivery", "me"],
    queryFn: () => api.get("/api/delivery/me"),
  });

  useEffect(() => {
    const s = getSocket("/notifications");
    const handler = () => qc.invalidateQueries({ queryKey: ["delivery", "me"] });
    s.on("verification:status_update", handler);
    return () => {
      s.off("verification:status_update", handler);
    };
  }, [qc]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-brand-primary" size={28} />
      </div>
    );
  }

  if (!data || data.state === "needs_request") {
    return (
      <DeliveryRegisterForm onSubmitted={() => qc.invalidateQueries({ queryKey: ["delivery", "me"] })} />
    );
  }

  if (data.state === "pending") {
    const inProgress = data.request?.status === "IN_PROGRESS";
    return (
      <div className="page-enter max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-primary/10 text-brand-primary">
              {inProgress ? <Loader2 className="animate-spin" size={26} /> : <Clock size={26} />}
            </div>
            <h1 className="font-heading text-2xl text-brand-text">
              {inProgress ? "Agent is on the way" : "Verification pending"}
            </h1>
            <p className="text-brand-textMuted">
              {inProgress
                ? "Hold tight — your agent will verify your details shortly."
                : "We've notified the agent for your area. You'll see updates here in real time."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-enter max-w-2xl mx-auto space-y-5">
      <Card>
        <CardContent className="py-8 text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-success/15 text-brand-success">
            <ShieldCheck size={24} />
          </div>
          <h1 className="font-heading text-2xl text-brand-text">You're verified</h1>
          <p className="text-brand-textMuted text-sm">
            Open the <span className="font-mono text-brand-primary">Orders</span>{" "}
            tab to see your active jobs.
          </p>
        </CardContent>
      </Card>
      <UpiSettingsForm
        initialVpa={data.profile?.upiVpa ?? null}
        initialName={data.profile?.upiName ?? null}
      />
    </div>
  );
}

function DeliveryRegisterForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [form, setForm] = useState<FormState>(initialForm);

  const submit = useMutation({
    mutationFn: () => {
      if (!form.location) throw new Error("Location is required");
      return api.post("/api/delivery/register-request", {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        locationLat: form.location.lat,
        locationLng: form.location.lng,
        profileImageUrl: form.profileImageUrl,
        purpose: form.purpose.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Submitted! An agent will verify you shortly.");
      onSubmitted();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : (e as Error).message ?? "Failed"),
  });

  const canSubmit =
    form.name.trim().length >= 1 &&
    form.phone.trim().length >= 7 &&
    form.address.trim().length >= 3 &&
    !!form.location;

  return (
    <div className="page-enter max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Join as delivery partner</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          We'll send your details to an agent for verification.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              inputMode="tel"
            />
          </div>
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Current location
            </label>
            <LocationPicker
              value={form.location}
              onChange={(loc) => setForm({ ...form, location: loc })}
            />
          </div>
          <ImageUpload
            label="Profile photo"
            folder="delivery"
            value={form.profileImageUrl}
            onChange={(url) => setForm({ ...form, profileImageUrl: url })}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-text">
              Why do you want to join? (optional)
            </label>
            <textarea
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              rows={3}
              className="w-full p-3 rounded-sm bg-brand-surface border border-brand-border text-sm text-brand-text focus:outline-none focus:border-brand-primary"
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              size="lg"
              onClick={() => submit.mutate()}
              loading={submit.isPending}
              disabled={!canSubmit}
            >
              Submit for verification
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
