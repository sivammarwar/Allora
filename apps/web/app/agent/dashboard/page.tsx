"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MapPinned, ShieldCheck, ShieldAlert, Truck, User,
  Phone, MapPin, Package, ChevronDown, ChevronUp,
  Pencil, Trash2, X, Save,
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

interface Category { id: string; name: string; type: string; }
interface Subcategory { id: string; name: string; categoryId: string; }

interface VerifiedHero {
  id: string;
  shopName: string | null;
  serviceName: string | null;
  phone: string;
  address: string;
  categoryIds: string[];
  subcategoryIds: string[];
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

function EditHeroModal({
  hero, categories, allSubs, onClose,
}: { hero: VerifiedHero; categories: Category[]; allSubs: Subcategory[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [catIds, setCatIds] = useState<string[]>(hero.categoryIds ?? []);
  const [subIds, setSubIds] = useState<string[]>(hero.subcategoryIds ?? []);
  const [serviceName, setServiceName] = useState(hero.serviceName ?? "");
  const [phone, setPhone] = useState(hero.phone);

  const serviceCategories = categories.filter((c) => c.type === "SERVICE");
  const subOptions = allSubs.filter((s) => catIds.includes(s.categoryId));

  const save = useMutation({
    mutationFn: () =>
      api.put(`/api/agent/verified-heroes/${hero.id}`, {
        categoryIds: catIds,
        subcategoryIds: subIds,
        serviceName: serviceName.trim() || null,
        phone: phone.trim(),
      }),
    onSuccess: () => {
      toast.success("Hero updated");
      qc.invalidateQueries({ queryKey: ["agent", "verified-heroes"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const toggleCat = (id: string) => {
    const next = catIds.includes(id) ? catIds.filter((x) => x !== id) : [...catIds, id];
    setCatIds(next);
    setSubIds((prev) => prev.filter((s) => allSubs.find((sb) => sb.id === s && next.includes(sb.categoryId))));
  };
  const toggleSub = (id: string) =>
    setSubIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Edit Hero</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <X size={15} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <Input label="Service name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />

          {/* Category selection */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Service Categories</p>
            <div className="flex flex-wrap gap-2">
              {serviceCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleCat(c.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    catIds.includes(c.id)
                      ? "bg-brand-primary text-white border-brand-primary"
                      : "bg-white text-gray-500 border-gray-200 hover:border-brand-primary/50"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory selection */}
          {subOptions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Subcategories</p>
              <div className="flex flex-wrap gap-2">
                {subOptions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleSub(s.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      subIds.includes(s.id)
                        ? "bg-brand-primary/10 text-brand-primary border-brand-primary/40"
                        : "bg-white text-gray-400 border-gray-200 hover:border-brand-primary/30"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button className="w-full" onClick={() => save.mutate()} loading={save.isPending}>
            <Save size={14} /> Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AgentDashboardPage() {
  const qc = useQueryClient();
  const [showHeroes, setShowHeroes] = useState(true);
  const [showDelivery, setShowDelivery] = useState(true);
  const [editingHero, setEditingHero] = useState<VerifiedHero | null>(null);

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

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["public", "categories"],
    queryFn: () => api.get("/api/user/categories"),
  });

  const { data: allSubs = [] } = useQuery<Subcategory[]>({
    queryKey: ["public", "subcategories", "all"],
    queryFn: () => api.get("/api/user/subcategories"),
  });

  const deleteHero = useMutation({
    mutationFn: (id: string) => api.delete(`/api/agent/verified-heroes/${id}`),
    onSuccess: () => {
      toast.success("Hero removed");
      qc.invalidateQueries({ queryKey: ["agent", "verified-heroes"] });
      qc.invalidateQueries({ queryKey: ["agent", "stats"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const { data: deliveryBoys = [] } = useQuery<VerifiedDeliveryBoy[]>({
    queryKey: ["agent", "verified-delivery-boys"],
    queryFn: () => api.get("/api/agent/verified-delivery-boys"),
    enabled: areas.length > 0,
  });

  if (!isLoading && areas.length === 0) {
    return (
      <div className="page-enter max-w-xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <MapPinned className="mx-auto text-brand-primary" size={28} />
            <h1 className="font-heading text-2xl text-brand-text">
              No areas assigned yet
            </h1>
            <p className="text-brand-textMuted text-sm">
              Your admin will assign service areas to you. Once assigned, your dashboard will activate.
            </p>
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
              {heroes.map((hero) => {
                const heroCats = categories.filter((c) => hero.categoryIds?.includes(c.id) && c.type === "SERVICE");
                const heroSubs = allSubs.filter((s) => hero.subcategoryIds?.includes(s.id));
                return (
                  <Card key={hero.id}>
                    <CardContent className="py-4 space-y-3">
                      {/* Header row */}
                      <div className="flex items-start gap-3">
                        <Avatar imageUrl={hero.profileImageUrl} name={hero.user.name ?? hero.user.email} />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-brand-text truncate">
                              {hero.shopName ?? hero.serviceName ?? hero.user.name ?? "—"}
                            </p>
                            {hero.requiresDelivery && (
                              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary">
                                <Truck size={10} /> Delivery
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-brand-textMuted truncate">{hero.user.email}</p>
                          <div className="flex items-center gap-1 text-xs text-brand-textMuted">
                            <Phone size={11} /> {hero.phone}
                          </div>
                          <div className="flex items-start gap-1 text-xs text-brand-textMuted">
                            <MapPin size={11} className="flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{hero.address}</span>
                          </div>
                          <p className="text-xs text-brand-textMuted">
                            Verified {new Date(hero.createdAt).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                      </div>

                      {/* Category + Subcategory chips */}
                      {heroCats.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-gray-100">
                          {heroCats.map((cat) => {
                            const subs = heroSubs.filter((s) => s.categoryId === cat.id);
                            return (
                              <div key={cat.id}>
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-brand-primary text-white text-[10px] font-semibold mb-1">
                                  {cat.name}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {subs.length > 0 ? subs.map((s) => (
                                    <span key={s.id} className="px-2 py-0.5 rounded-full border border-brand-primary/30 bg-brand-primary/5 text-brand-primary text-[10px] font-medium">
                                      {s.name}
                                    </span>
                                  )) : (
                                    <span className="text-[10px] text-gray-400">No subcategories</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={() => setEditingHero(hero)}
                        >
                          <Pencil size={12} /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (confirm(`Remove ${hero.shopName ?? hero.serviceName ?? hero.user.name}?`))
                              deleteHero.mutate(hero.id);
                          }}
                          loading={deleteHero.isPending}
                        >
                          <Trash2 size={12} /> Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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

      {editingHero && (
        <EditHeroModal
          hero={editingHero}
          categories={categories}
          allSubs={allSubs}
          onClose={() => setEditingHero(null)}
        />
      )}
    </div>
  );
}
