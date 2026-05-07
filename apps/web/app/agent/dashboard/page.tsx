"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MapPinned, ShieldCheck, ShieldAlert, Truck, User,
  Phone, MapPin, Package, ChevronDown, ChevronUp,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface AgentArea {
  id: string;
  name: string;
  code: string;
}

interface AgentStats {
  areas: number;
  pendingRequests: number;
  verifiedHeroes: number;
  verifiedDeliveryBoys: number;
}

interface VerifiedHero {
  id: string;
  shopName: string | null;
  serviceName: string | null;
  phone: string;
  address: string;
  requiresDelivery: boolean;
  profileImageUrl: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
}

interface VerifiedDeliveryBoy {
  id: string;
  phone: string;
  address: string;
  purpose: string | null;
  assignedShopIds: string[];
  profileImageUrl: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
}

function Avatar({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
      <User size={16} className="text-brand-primary" />
    </div>
  );
}

export default function AgentDashboardPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [showHeroes, setShowHeroes] = useState(true);
  const [showDelivery, setShowDelivery] = useState(true);

  const { data: areas = [], isLoading } = useQuery<AgentArea[]>({
    queryKey: ["agent", "areas"],
    queryFn: () => api.get("/api/agent/areas"),
  });

  const { data: stats } = useQuery<AgentStats>({
    queryKey: ["agent", "stats"],
    queryFn: () => api.get("/api/agent/stats"),
    enabled: areas.length > 0,
  });

  const { data: heroes = [] } = useQuery<VerifiedHero[]>({
    queryKey: ["agent", "verified-heroes"],
    queryFn: () => api.get("/api/agent/verified-heroes"),
    enabled: areas.length > 0,
  });

  const { data: deliveryBoys = [] } = useQuery<VerifiedDeliveryBoy[]>({
    queryKey: ["agent", "verified-delivery-boys"],
    queryFn: () => api.get("/api/agent/verified-delivery-boys"),
    enabled: areas.length > 0,
  });

  const addWorkspace = useMutation({
    mutationFn: () =>
      api.post("/api/agent/workspace", {
        areaName: name.trim(),
        areaCode: code.trim().toUpperCase(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent", "areas"] });
      qc.invalidateQueries({ queryKey: ["agent", "stats"] });
      toast.success("Area added to your workspace");
      setName("");
      setCode("");
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Failed to add area"),
  });

  if (!isLoading && areas.length === 0) {
    return (
      <div className="page-enter max-w-xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <MapPinned className="mx-auto text-brand-primary" size={28} />
            <h1 className="font-heading text-2xl text-brand-text">
              Set up your workspace
            </h1>
            <p className="text-brand-textMuted text-sm">
              Enter the name and 20-character code of an area assigned to you by the admin.
            </p>
          </CardContent>
          <CardContent className="space-y-4 border-t border-brand-border">
            <Input
              label="Area name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <Input
              label="20-character code"
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 20)
                )
              }
              className="font-mono tracking-wider"
              maxLength={20}
            />
            <div className="flex justify-end">
              <Button
                onClick={() => addWorkspace.mutate()}
                loading={addWorkspace.isPending}
                disabled={name.trim().length < 1 || code.length !== 20}
              >
                Add area
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tiles: Array<[string, number | string, string, any]> = [
    ["Pending requests", stats?.pendingRequests ?? "—", "Awaiting your verification", ShieldAlert],
    ["Verified heroes", stats?.verifiedHeroes ?? "—", "Service providers in your areas", ShieldCheck],
    ["Verified delivery", stats?.verifiedDeliveryBoys ?? "—", "Delivery partners in your areas", Truck],
  ];

  return (
    <div className="page-enter space-y-8">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl text-brand-text">Dashboard</h1>
        <p className="text-brand-textMuted text-sm mt-1">
          Operating across {areas.length} area{areas.length === 1 ? "" : "s"}.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map(([label, value, hint, Icon]) => (
          <Card key={label}>
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-brand-primary" />
                <p className="text-xs uppercase tracking-widest font-mono text-brand-primary">
                  {label}
                </p>
              </div>
              <p className="mt-2 font-heading text-4xl text-brand-text">{value}</p>
              <p className="mt-1 text-sm text-brand-textMuted">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Verified Heroes */}
      <div className="space-y-3">
        <button
          onClick={() => setShowHeroes((v) => !v)}
          className="w-full flex items-center justify-between px-1 group"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand-primary" />
            <h2 className="font-heading text-xl text-brand-text">
              Verified Heroes
            </h2>
            <span className="text-xs text-brand-textMuted font-mono bg-brand-surface px-2 py-0.5 rounded">
              {heroes.length}
            </span>
          </div>
          {showHeroes ? (
            <ChevronUp size={16} className="text-brand-textMuted" />
          ) : (
            <ChevronDown size={16} className="text-brand-textMuted" />
          )}
        </button>

        {showHeroes && (
          heroes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-brand-textMuted text-sm">
                No verified heroes yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {heroes.map((hero) => (
                <Card key={hero.id}>
                  <CardContent className="py-4 flex items-start gap-3">
                    <Avatar
                      imageUrl={hero.profileImageUrl}
                      name={hero.user.name ?? hero.user.email}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-brand-text truncate">
                          {hero.shopName ?? hero.serviceName ?? hero.user.name ?? "—"}
                        </p>
                        {hero.requiresDelivery && (
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary">
                            <Truck size={10} />
                            Delivery
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-brand-textMuted truncate">{hero.user.email}</p>
                      <div className="flex items-center gap-1 text-xs text-brand-textMuted">
                        <Phone size={11} />
                        {hero.phone}
                      </div>
                      <div className="flex items-start gap-1 text-xs text-brand-textMuted">
                        <MapPin size={11} className="flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{hero.address}</span>
                      </div>
                      <p className="text-xs text-brand-textMuted">
                        Verified {new Date(hero.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </div>

      {/* Verified Delivery Boys */}
      <div className="space-y-3">
        <button
          onClick={() => setShowDelivery((v) => !v)}
          className="w-full flex items-center justify-between px-1 group"
        >
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-brand-primary" />
            <h2 className="font-heading text-xl text-brand-text">
              Verified Delivery Partners
            </h2>
            <span className="text-xs text-brand-textMuted font-mono bg-brand-surface px-2 py-0.5 rounded">
              {deliveryBoys.length}
            </span>
          </div>
          {showDelivery ? (
            <ChevronUp size={16} className="text-brand-textMuted" />
          ) : (
            <ChevronDown size={16} className="text-brand-textMuted" />
          )}
        </button>

        {showDelivery && (
          deliveryBoys.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-brand-textMuted text-sm">
                No verified delivery partners yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {deliveryBoys.map((boy) => (
                <Card key={boy.id}>
                  <CardContent className="py-4 flex items-start gap-3">
                    <Avatar
                      imageUrl={boy.profileImageUrl}
                      name={boy.user.name ?? boy.user.email}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium text-brand-text truncate">
                        {boy.user.name ?? boy.user.email}
                      </p>
                      <p className="text-xs text-brand-textMuted truncate">{boy.user.email}</p>
                      <div className="flex items-center gap-1 text-xs text-brand-textMuted">
                        <Phone size={11} />
                        {boy.phone}
                      </div>
                      <div className="flex items-start gap-1 text-xs text-brand-textMuted">
                        <MapPin size={11} className="flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{boy.address}</span>
                      </div>
                      {boy.purpose && (
                        <p className="text-xs text-brand-textMuted italic line-clamp-1">
                          {boy.purpose}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-brand-textMuted">
                        <Package size={11} />
                        {boy.assignedShopIds.length} assigned shop{boy.assignedShopIds.length !== 1 ? "s" : ""}
                      </div>
                      <p className="text-xs text-brand-textMuted">
                        Verified {new Date(boy.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
