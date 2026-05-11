"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { Search, X, MapPin, Loader2, Check, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserLocation } from "@/lib/location";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface Suggestion {
  id: string;
  place_name: string;
  center: [number, number];
}

interface Props {
  initialLoc?: UserLocation | null;
  onConfirm: (loc: UserLocation) => void;
  onClose: () => void;
}

export function LocationPickerModal({ initialLoc, onConfirm, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const defaultCenter: [number, number] = initialLoc
    ? [initialLoc.lng, initialLoc.lat]
    : [77.209, 28.6139];

  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [address, setAddress] = useState<string>("");
  const [addrLoading, setAddrLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const geocodeCenter = useCallback(async (lng: number, lat: number) => {
    setAddrLoading(true);
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=neighborhood,locality,place,district&language=en`
      );
      const data = await res.json();
      setAddress(data.features?.[0]?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setAddrLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: defaultCenter,
      zoom: 13,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => geocodeCenter(defaultCenter[0], defaultCenter[1]));

    let debounce: ReturnType<typeof setTimeout>;
    map.on("move", () => {
      const c = map.getCenter();
      setCenter([c.lng, c.lat]);
    });
    map.on("moveend", () => {
      const c = map.getCenter();
      clearTimeout(debounce);
      debounce = setTimeout(() => geocodeCenter(c.lng, c.lat), 400);
    });

    return () => {
      clearTimeout(debounce);
      map.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setSearchLoading(true);
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&types=neighborhood,locality,place,district,address&language=en&limit=6`
      );
      const data = await res.json();
      setSuggestions(data.features ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchSuggestions(search), 320);
    return () => clearTimeout(t);
  }, [search, fetchSuggestions]);

  const flyTo = (s: Suggestion) => {
    mapRef.current?.flyTo({ center: s.center, zoom: 14, duration: 800 });
    setSearch(s.place_name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const c: [number, number] = [pos.coords.longitude, pos.coords.latitude];
      mapRef.current?.flyTo({ center: c, zoom: 14, duration: 800 });
    });
  };

  const handleConfirm = () => {
    onConfirm({
      lat: center[1],
      lng: center[0],
      capturedAt: Date.now(),
      name: address || `${center[1].toFixed(4)}, ${center[0].toFixed(4)}`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="relative flex flex-col bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ height: "min(90vh, 680px)" }}
      >
        {/* ── Header / Search bar ──────────────────────────────── */}
        <div className="relative z-10 bg-white border-b border-gray-200 px-4 py-3 space-y-0">
          <div className="flex items-center gap-2">
            {/* Search input */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search area, city, landmark…"
                className="w-full pl-10 pr-10 py-2.5 text-sm font-medium bg-gray-100 rounded-xl border-0 outline-none focus:ring-2 focus:ring-brand-primary/30 placeholder:text-gray-400 transition-shadow"
              />
              {searchLoading ? (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
              ) : search ? (
                <button
                  onClick={() => { setSearch(""); setSuggestions([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            {/* GPS locate */}
            <button
              onClick={locateMe}
              title="Use my current location"
              className="w-10 h-10 shrink-0 rounded-xl bg-gray-100 hover:bg-brand-primary/10 flex items-center justify-center text-gray-500 hover:text-brand-primary transition-colors"
            >
              <LocateFixed size={16} />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-10 h-10 shrink-0 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-20">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => flyTo(s)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
                    <MapPin size={13} className="text-brand-primary" />
                  </div>
                  <span className="truncate text-gray-700">{s.place_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Map area ─────────────────────────────────────────── */}
        <div className="relative flex-1 overflow-hidden" onClick={() => setShowSuggestions(false)}>
          <div ref={containerRef} className="absolute inset-0" />

          {/* Fixed crosshair pin in the exact center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center" style={{ marginTop: "-24px" }}>
              {/* Pin body */}
              <div className="w-10 h-10 rounded-full bg-brand-primary border-4 border-white shadow-[0_4px_14px_rgba(0,0,0,0.4)] flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-white" />
              </div>
              {/* Pin stem */}
              <div className="w-1 h-5 bg-brand-primary rounded-b-full shadow-sm" />
              {/* Shadow dot */}
              <div className="w-3 h-1 rounded-full bg-black/20 mt-0.5" />
            </div>
          </div>

          {/* Map attribution stays in place */}
        </div>

        {/* ── Bottom confirm bar ──────────────────────────────── */}
        <div className="bg-white border-t border-gray-200 px-4 py-4">
          <div className="flex items-start gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin size={14} className="text-brand-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Selected location</p>
              <p className="text-sm font-medium text-gray-800 leading-snug">
                {addrLoading
                  ? <span className="text-gray-400 animate-pulse">Locating…</span>
                  : address || "Move the map to pin a location"}
              </p>
            </div>
          </div>
          <Button
            className="w-full font-semibold"
            onClick={handleConfirm}
            disabled={addrLoading || !address}
          >
            <Check size={15} />
            Confirm this location
          </Button>
        </div>
      </div>
    </div>
  );
}
