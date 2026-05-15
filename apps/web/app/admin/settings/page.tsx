"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GlobalSettings {
  userVisibilityRadiusKm: number;
  heroOnboardingFee: number;
}

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<GlobalSettings>({
    queryKey: ["admin", "settings"],
    queryFn: () => api.get("/api/admin/settings"),
  });

  const [radius, setRadius] = useState<number>(5);
  const [heroFee, setHeroFee] = useState<number>(999);

  useEffect(() => {
    if (data?.userVisibilityRadiusKm) setRadius(data.userVisibilityRadiusKm);
    if (typeof data?.heroOnboardingFee === "number") setHeroFee(data.heroOnboardingFee);
  }, [data]);

  const save = useMutation({
    mutationFn: (input: Partial<GlobalSettings>) => api.put("/api/admin/settings", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success("Settings saved");
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Failed to save");
    },
  });

  return (
    <div className="page-enter space-y-6 max-w-2xl">
      <div>
        <h1 className="font-heading text-3xl text-brand-text">Settings</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Platform-wide configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User visibility radius</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-brand-textMuted">
            Determines how far a user's location can reach to see services. Applies
            globally to every customer.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="flex-1 accent-brand-primary"
              disabled={isLoading}
            />
            <span className="font-mono text-2xl font-medium w-16 text-right text-brand-text">
              {radius} km
            </span>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => save.mutate({ userVisibilityRadiusKm: radius })}
              loading={save.isPending}
              disabled={isLoading || radius === data?.userVisibilityRadiusKm}
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hero onboarding fee</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-brand-textMuted">
            One-time payment a hero must make after agent verification before
            accessing their dashboard. Charged via PhonePe.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-medium text-brand-text">₹</span>
            <input
              type="number"
              min={0}
              max={100000}
              step={1}
              value={heroFee}
              onChange={(e) => setHeroFee(Number(e.target.value))}
              className="flex-1 px-4 py-2 border rounded-md font-mono text-lg text-brand-text"
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => save.mutate({ heroOnboardingFee: heroFee })}
              loading={save.isPending}
              disabled={isLoading || heroFee === data?.heroOnboardingFee || heroFee < 0}
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
