"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Truck,
  MapPin,
  Map as MapIcon,
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/shared/ImageUpload";
import {
  PolygonDrawer,
  type LngLat,
} from "@/components/maps/PolygonDrawer";

interface Category {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
}
interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

interface RequestDetail {
  id: string;
  requestType: "HERO" | "DELIVERY_BOY";
  status: "PENDING" | "IN_PROGRESS" | "VERIFIED" | "REJECTED";
  areaId: string | null;
  details: any;
  requester: { id: string; email: string; name: string | null };
  createdAt: string;
}

interface ShopForDelivery {
  id: string;
  shopName: string | null;
  serviceName: string;
  locationLat: number;
  locationLng: number;
  user: { name: string | null; email: string };
}

function HeroRequestedCategories({
  categoryIds,
  subcategoryIds,
}: {
  categoryIds: string[];
  subcategoryIds: string[];
}) {
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories", categoryIds],
    queryFn: async () => {
      if (categoryIds.length === 0) return [];
      const all = await api.get<Category[]>("/api/user/categories");
      return all.filter((c) => categoryIds.includes(c.id));
    },
    enabled: categoryIds.length > 0,
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["subcategories", subcategoryIds],
    queryFn: async () => {
      if (subcategoryIds.length === 0) return [];
      const all = await api.get<any[]>("/api/user/subcategories");
      return all
        .filter((s) => subcategoryIds.includes(s.id))
        .map((s) => ({
          id: s.id,
          name: s.name,
          categoryId: s.categoryId,
        }));
    },
    enabled: subcategoryIds.length > 0,
  });

  if (categories.length === 0 && subcategories.length === 0) {
    return <span className="text-brand-textMuted">—</span>;
  }

  return (
    <div className="space-y-1">
      {categories.map((c) => (
        <div key={c.id} className="flex items-center gap-2">
          <span className="text-brand-text">{c.name}</span>
          <span className="text-xs text-brand-textMuted">({c.type.toLowerCase()})</span>
        </div>
      ))}
      {subcategories.map((s) => (
        <div key={s.id} className="flex items-center gap-2 pl-3 text-xs text-brand-textMuted">
          <span>→ {s.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function AgentRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const qc = useQueryClient();
  const router = useRouter();

  const { data, isLoading } = useQuery<RequestDetail>({
    queryKey: ["agent", "request", id],
    queryFn: () => api.get(`/api/agent/requests/${id}`),
  });

  const setStatus = useMutation({
    mutationFn: (status: "IN_PROGRESS" | "REJECTED") =>
      api.put(`/api/agent/requests/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent", "request", id] });
      qc.invalidateQueries({ queryKey: ["agent", "requests"] });
      toast.success("Status updated");
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Failed to update"),
  });

  // Hero verify modal state
  const [heroOpen, setHeroOpen] = useState(false);
  const [requiresDelivery, setRequiresDelivery] = useState(false);

  // Agent-confirmed store details (prefilled from hero submission)
  const [agentShopName, setAgentShopName] = useState("");
  const [agentCategoryIds, setAgentCategoryIds] = useState<string[]>([]);
  const [agentSubIds, setAgentSubIds] = useState<string[]>([]);
  const [agentPhotoUrl, setAgentPhotoUrl] = useState<string | null>(null);

  // Fetch all categories & subcategories for agent-side override
  const { data: cats = [] } = useQuery<Category[]>({
    queryKey: ["agent", "categories"],
    queryFn: () => api.get("/api/user/categories"),
    enabled: heroOpen,
  });
  const { data: allSubs = [] } = useQuery<Subcategory[]>({
    queryKey: ["agent", "subcategories"],
    queryFn: async () => {
      const rows = await api.get<any[]>("/api/user/subcategories");
      return rows.map((s) => ({
        id: s.id,
        name: s.name,
        categoryId: s.categoryId,
      }));
    },
    enabled: heroOpen,
  });
  const subOptions = useMemo(
    () => allSubs.filter((s) => {
      const category = cats.find(c => c.id === s.categoryId);
      return agentCategoryIds.includes(s.categoryId) && category?.type === 'SERVICE';
    }),
    [allSubs, agentCategoryIds, cats]
  );

  // Prefill agent fields with hero's submitted values when dialog opens
  useEffect(() => {
    if (!heroOpen || !data?.details) return;
    setAgentShopName(data.details.shopName ?? "");
    setAgentCategoryIds(data.details.categoryIds ?? []);
    setAgentSubIds(data.details.subcategoryIds ?? []);
    setAgentPhotoUrl(data.details.profileImageUrl ?? null);
  }, [heroOpen, data]);

  const hasServiceCategories = agentCategoryIds.some(id => cats.find(c => c.id === id)?.type === 'SERVICE');
  const verifyHero = useMutation({
    mutationFn: () => {
      if (!agentShopName.trim()) throw new Error("Shop name is required");
      if (agentCategoryIds.length === 0) throw new Error("Select at least one category");
      if (hasServiceCategories && agentSubIds.length === 0)
        throw new Error("Select at least one subcategory for service categories");
      if (!agentPhotoUrl) throw new Error("Upload a shop / hero photo");
      return api.post("/api/agent/verify/hero", {
        requestId: id,
        requiresDelivery,
        categoryIds: agentCategoryIds,
        subcategoryIds: hasServiceCategories ? agentSubIds : [],
        shopName: agentShopName.trim(),
        profileImageUrl: agentPhotoUrl,
      });
    },
    onSuccess: () => {
      toast.success("Hero verified");
      setHeroOpen(false);
      qc.invalidateQueries({ queryKey: ["agent", "request", id] });
      qc.invalidateQueries({ queryKey: ["agent", "requests"] });
      qc.invalidateQueries({ queryKey: ["agent", "stats"] });
      router.push("/agent/requests");
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiError ? e.message : (e as Error).message ?? "Failed"
      ),
  });

  // Delivery verify modal state
  const [dboyOpen, setDboyOpen] = useState(false);
  const [shopIds, setShopIds] = useState<string[]>([]);

  // Location preview modal
  const [mapOpen, setMapOpen] = useState(false);
  const { data: shops = [] } = useQuery<ShopForDelivery[]>({
    queryKey: ["agent", "heroes-needing-delivery"],
    queryFn: () => api.get("/api/agent/heroes-needing-delivery"),
    enabled: dboyOpen,
  });

  const verifyDelivery = useMutation({
    mutationFn: () =>
      api.post("/api/agent/verify/delivery-boy", { requestId: id, shopIds }),
    onSuccess: () => {
      toast.success("Delivery boy verified");
      setDboyOpen(false);
      qc.invalidateQueries({ queryKey: ["agent", "request", id] });
      qc.invalidateQueries({ queryKey: ["agent", "requests"] });
      qc.invalidateQueries({ queryKey: ["agent", "stats"] });
      router.push("/agent/requests");
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  const requesterLocation = useMemo(() => {
    if (!data?.details?.locationLat) return null;
    return { lat: data.details.locationLat, lng: data.details.locationLng };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-brand-primary" />
      </div>
    );
  }
  if (!data) return <div>Not found.</div>;

  const isHero = data.requestType === "HERO";
  const canStart = data.status === "PENDING";
  const canVerify = data.status === "IN_PROGRESS";
  const isFinal = data.status === "VERIFIED" || data.status === "REJECTED";

  return (
    <div className="page-enter max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft size={14} />
        Back
      </Button>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading text-2xl text-brand-text">
              {data.details?.name ?? data.requester.name ?? "Request"}
            </h1>
            <span
              className={`text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-sm ${
                isHero
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "bg-brand-secondary/10 text-brand-secondary"
              }`}
            >
              {data.requestType.replace("_", " ")}
            </span>
            <span className="text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-sm bg-brand-bg border border-brand-border text-brand-textMuted">
              {data.status.replace("_", " ")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="Email" value={data.requester.email} />
            <Row label="Phone" value={data.details?.phone} />
            <Row label="Address" value={data.details?.address} colSpan={2} />
            {isHero && (
              <>
                <Row label="Service" value={data.details?.serviceName ?? "—"} />
                <Row label="Shop name" value={data.details?.shopName ?? "—"} />
                <Row
                  label="Categories"
                  value={
                    <HeroRequestedCategories
                      categoryIds={data.details?.categoryIds ?? []}
                      subcategoryIds={data.details?.subcategoryIds ?? []}
                    />
                  }
                  colSpan={2}
                />
              </>
            )}
            {requesterLocation && (
              <Row
                label="Coordinates"
                value={
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono">
                      {requesterLocation.lat.toFixed(5)},{" "}
                      {requesterLocation.lng.toFixed(5)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMapOpen(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border border-brand-border bg-brand-bg text-xs text-brand-primary hover:bg-brand-primary/10 transition-colors"
                    >
                      <MapIcon size={12} />
                      View on map
                    </button>
                  </span>
                }
                colSpan={2}
              />
            )}
            {data.details?.purpose && (
              <Row label="Notes" value={data.details.purpose} colSpan={2} />
            )}
          </div>

          {data.details?.profileImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.details.profileImageUrl}
              alt="Profile"
              className="h-32 w-32 object-cover rounded-sm border border-brand-border"
            />
          )}

          {!isFinal && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-brand-border">
              {canStart && (
                <Button
                  onClick={() => setStatus.mutate("IN_PROGRESS")}
                  loading={setStatus.isPending}
                >
                  <MapPin size={14} />
                  I'm on the way (mark in-progress)
                </Button>
              )}
              {canVerify && isHero && (
                <Button onClick={() => setHeroOpen(true)}>
                  <ShieldCheck size={14} />
                  Verify as Hero
                </Button>
              )}
              {canVerify && !isHero && (
                <Button onClick={() => setDboyOpen(true)}>
                  <Truck size={14} />
                  Verify as Delivery Boy
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm("Reject this request?")) setStatus.mutate("REJECTED");
                }}
              >
                Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hero verify dialog: agent-confirmed store details */}
      <Dialog
        open={heroOpen}
        onClose={() => setHeroOpen(false)}
        size="lg"
        title="Verify hero & confirm store details"
        description="Confirm the shop details and assign categories. The service area will be inherited from your assigned area. These cannot be changed by the hero later."
      >
        <div className="px-6 py-5 space-y-4 max-h-[70vh] flex flex-col">
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest font-mono text-brand-textMuted mb-2">
                  Confirm store details
                </p>
                <p className="text-xs text-brand-textMuted leading-relaxed">
                  Verify what the hero submitted and edit if reality differs.
                  These values are locked after verification.
                </p>
              </div>

              <Input
                label="Shop name *"
                value={agentShopName}
                onChange={(e) => setAgentShopName(e.target.value)}
                placeholder="e.g. Mahakal Salon"
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-text">
                  Categories * ({agentCategoryIds.length} selected)
                </label>
                <div className="rounded-sm border border-brand-border bg-brand-bg p-2 max-h-40 overflow-auto space-y-1">
                  {cats.length === 0 ? (
                    <p className="text-sm text-brand-textMuted px-2 py-3 text-center">
                      No categories available.
                    </p>
                  ) : (
                    cats.map((c) => {
                      const checked = agentCategoryIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-[rgba(192,98,106,0.06)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setAgentCategoryIds((prev) =>
                                prev.includes(c.id)
                                  ? prev.filter((x) => x !== c.id)
                                  : [...prev, c.id]
                              )
                            }
                            className="accent-brand-primary"
                          />
                          <span className="text-sm text-brand-text">
                            {c.name} ({c.type.toLowerCase()})
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {hasServiceCategories && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-brand-text">
                    Subcategories * ({agentSubIds.length} selected)
                  </label>
                  <div className="rounded-sm border border-brand-border bg-brand-bg p-2 max-h-40 overflow-auto space-y-1">
                    {subOptions.length === 0 ? (
                      <p className="text-sm text-brand-textMuted px-2 py-3 text-center">
                        No subcategories under selected service categories.
                      </p>
                    ) : (
                      subOptions.map((s) => {
                        const checked = agentSubIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-[rgba(192,98,106,0.06)] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setAgentSubIds((prev) =>
                                  prev.includes(s.id)
                                    ? prev.filter((x) => x !== s.id)
                                    : [...prev, s.id]
                                )
                              }
                              className="accent-brand-primary"
                            />
                            <span className="text-sm text-brand-text">
                              {s.name}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <ImageUpload
                label="Shop / hero photo *"
                folder="heroes"
                value={agentPhotoUrl}
                onChange={(url) => setAgentPhotoUrl(url)}
              />

              <label className="flex items-start gap-2 text-sm text-brand-text pt-2 border-t border-brand-border">
                <input
                  type="checkbox"
                  checked={requiresDelivery}
                  onChange={(e) => setRequiresDelivery(e.target.checked)}
                  className="accent-brand-primary mt-0.5"
                />
                <span>This service requires a delivery partner</span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-brand-border">
              <Button
                variant="ghost"
                onClick={() => setHeroOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => verifyHero.mutate()}
                loading={verifyHero.isPending}
                disabled={
                  !agentShopName.trim() ||
                  agentCategoryIds.length === 0 ||
                  (hasServiceCategories && agentSubIds.length === 0) ||
                  !agentPhotoUrl
                }
                className="flex-1"
              >
                Confirm verification
              </Button>
            </div>
          </div>
      </Dialog>

      {/* Delivery verify dialog (shop multi-select) */}
      <Dialog
        open={dboyOpen}
        onClose={() => setDboyOpen(false)}
        title="Assign shops"
        description="Select the verified shops in your area that this delivery boy will serve."
        size="lg"
      >
        <div className="px-6 py-5 space-y-4">
          {shops.length === 0 ? (
            <p className="text-sm text-brand-textMuted">
              You haven't verified any heroes that require delivery yet. Verify a hero
              with "requires delivery" enabled first.
            </p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-auto rounded-sm border border-brand-border bg-brand-bg p-2">
              {shops.map((s) => {
                const checked = shopIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 px-2 py-2 rounded-sm hover:bg-[rgba(192,98,106,0.06)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setShopIds((prev) =>
                          prev.includes(s.id)
                            ? prev.filter((x) => x !== s.id)
                            : [...prev, s.id]
                        )
                      }
                      className="accent-brand-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-brand-text truncate">
                        {s.shopName ?? s.serviceName}
                      </p>
                      <p className="text-xs text-brand-textMuted truncate">
                        {s.user.email}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDboyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => verifyDelivery.mutate()}
              loading={verifyDelivery.isPending}
              disabled={shopIds.length === 0}
            >
              Confirm assignment
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Location preview dialog */}
      <Dialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        title="Requester location"
        description={
          requesterLocation
            ? `${requesterLocation.lat.toFixed(5)}, ${requesterLocation.lng.toFixed(5)}`
            : undefined
        }
        size="lg"
      >
        <div className="px-6 py-5">
          {requesterLocation && (
            <LocationMarkerMap
              lat={requesterLocation.lat}
              lng={requesterLocation.lng}
            />
          )}
          <div className="flex justify-end gap-2 pt-4">
            <a
              href={
                requesterLocation
                  ? `https://www.google.com/maps/dir/?api=1&destination=${requesterLocation.lat},${requesterLocation.lng}`
                  : "#"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-brand-border bg-brand-bg text-sm text-brand-text hover:bg-brand-primary/10"
            >
              <MapPin size={14} />
              Open in Google Maps
            </a>
            <Button variant="ghost" onClick={() => setMapOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function makeDot(color: string, size = 22) {
  const el = document.createElement("div");
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "9999px";
  el.style.background = color;
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
  return el;
}

function LocationMarkerMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [agentLoc, setAgentLoc] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [geoError, setGeoError] = useState<string | null>(null);

  // Request agent's current location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setAgentLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError("Couldn't get your location"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Initialise map (once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!mapboxgl.accessToken) {
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
    }
    if (!mapboxgl.accessToken) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: 15,
    });
    mapRef.current = map;

    // Requester marker (red)
    new mapboxgl.Marker({ element: makeDot("#C0626A"), anchor: "center" })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 18 }).setText("Requester"))
      .addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  // Add agent marker + fit bounds + connecting line when agent location arrives
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !agentLoc) return;

    const addAgentOverlays = () => {
      // Agent marker (blue)
      new mapboxgl.Marker({ element: makeDot("#2563EB"), anchor: "center" })
        .setLngLat([agentLoc.lng, agentLoc.lat])
        .setPopup(new mapboxgl.Popup({ offset: 18 }).setText("You (agent)"))
        .addTo(map);

      // Dashed line connecting both
      if (!map.getSource("route-line")) {
        map.addSource("route-line", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [agentLoc.lng, agentLoc.lat],
                [lng, lat],
              ],
            },
          },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route-line",
          paint: {
            "line-color": "#C0626A",
            "line-width": 2,
            "line-dasharray": [2, 2],
          },
        });
      }

      // Fit both points in view
      const bounds = new mapboxgl.LngLatBounds()
        .extend([lng, lat])
        .extend([agentLoc.lng, agentLoc.lat]);
      map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 600 });
    };

    if (map.loaded()) addAgentOverlays();
    else map.once("load", addAgentOverlays);
  }, [agentLoc, lat, lng]);

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return (
      <p className="text-sm text-brand-textMuted">
        Mapbox token missing. Set{" "}
        <span className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</span>.
      </p>
    );
  }

  // Distance calc (Haversine) for quick info display
  const distanceKm = agentLoc
    ? haversineKm(agentLoc.lat, agentLoc.lng, lat, lng)
    : null;

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="w-full h-[400px] rounded-sm overflow-hidden border border-brand-border"
      />
      <div className="flex items-center justify-between text-xs text-brand-textMuted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#C0626A]" />
            Requester
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
            You
          </span>
        </div>
        {distanceKm !== null && (
          <span className="font-mono">~{distanceKm.toFixed(1)} km away</span>
        )}
        {geoError && <span className="text-red-500">{geoError}</span>}
      </div>
    </div>
  );
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function Row({
  label,
  value,
  mono,
  colSpan,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  colSpan?: number;
}) {
  return (
    <div className={colSpan === 2 ? "md:col-span-2" : ""}>
      <p className="text-xs uppercase tracking-widest font-mono text-brand-textMuted">
        {label}
      </p>
      <p className={`text-sm text-brand-text ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}
