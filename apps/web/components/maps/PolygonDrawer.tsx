"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Undo2, RotateCcw, CheckCircle2, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export type LngLat = [number, number]; // [lng, lat] (Mapbox order)

export interface ExistingPolygon {
  id: string;
  name?: string;
  coordinates: LngLat[]; // outer ring, may be closed (last == first) or not
}

interface Props {
  /** Returned to caller when user closes the polygon. */
  onChange?: (points: LngLat[], geojson: GeoJSON.Polygon | null) => void;
  /** Existing polygons to render as reference overlays. */
  existing?: ExistingPolygon[];
  /** Pre-populate the editor with these points (for edit mode). */
  initialPoints?: LngLat[];
  /** Maximum number of vertices. */
  maxPoints?: number;
  /** Initial map view. */
  initialCenter?: LngLat;
  initialZoom?: number;
  className?: string;
  /** Called when user has not yet finished a closed polygon. Allows parent to disable Save. */
  onValidityChange?: (isClosed: boolean, pointCount: number) => void;
}

/**
 * Reusable Mapbox polygon drawer.
 *  - Click to drop numbered points (max 20 by default)
 *  - Live polygon preview rendered after 3+ points
 *  - Undo / Reset / Close path
 *  - Auto-closes on Nth point
 *  - Existing polygons displayed as semi-transparent reference overlays
 */
export function PolygonDrawer({
  onChange,
  existing = [],
  initialPoints = [],
  maxPoints = 20,
  initialCenter = [78.9629, 20.5937], // India centroid
  initialZoom = 4.2,
  className,
  onValidityChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [points, setPoints] = useState<LngLat[]>(initialPoints);
  const [closed, setClosed] = useState<boolean>(initialPoints.length >= 3);

  // Derive the GeoJSON polygon (only valid when ≥3 points)
  const polygonGeoJSON = useMemo<GeoJSON.Polygon | null>(() => {
    if (points.length < 3) return null;
    const ring = closed ? [...points, points[0]] : [...points, points[0]];
    return { type: "Polygon", coordinates: [ring] };
  }, [points, closed]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!mapboxgl.accessToken) {
      // No token — show notice in UI; don't crash
      return;
    }
    const map = new mapboxgl.Map({
      container: containerRef.current,
      // Political-style map: roads, admin boundaries, place labels.
      style: "mapbox://styles/mapbox/streets-v12",
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: true,
    });
    mapRef.current = map;

    // Zoom + compass controls (top-right)
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    // User location + recenter button (top-right, below nav)
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true, timeout: 8000 },
      trackUserLocation: true,
      showUserHeading: true,
      showAccuracyCircle: true,
    });
    map.addControl(geolocate, "top-right");

    map.on("load", () => {
      // Auto-request current location once on load so the user sees a pulsing
      // dot immediately. If permission is denied, it silently no-ops.
      try {
        geolocate.trigger();
      } catch {
        /* browsers may defer until a user gesture — the control button still works */
      }
      // Reference layer for existing polygons (read-only overlays)
      const existingFC: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: existing
          .filter((e) => e.coordinates.length >= 3)
          .map((e) => {
            const coords =
              e.coordinates[e.coordinates.length - 1][0] ===
                e.coordinates[0][0] &&
              e.coordinates[e.coordinates.length - 1][1] ===
                e.coordinates[0][1]
                ? e.coordinates
                : [...e.coordinates, e.coordinates[0]];
            return {
              type: "Feature",
              properties: { id: e.id, name: e.name ?? "" },
              geometry: { type: "Polygon", coordinates: [coords] },
            };
          }),
      };

      map.addSource("existing-polygons", { type: "geojson", data: existingFC });
      map.addLayer({
        id: "existing-fill",
        type: "fill",
        source: "existing-polygons",
        paint: {
          "fill-color": "#C0626A",
          "fill-opacity": 0.15,
        },
      });
      map.addLayer({
        id: "existing-line",
        type: "line",
        source: "existing-polygons",
        paint: {
          "line-color": "#8B4A4A",
          "line-width": 1.5,
          "line-dasharray": [2, 2],
        },
      });

      // Drawing layer (current polygon being edited)
      map.addSource("draw-polygon", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "draw-polygon-fill",
        type: "fill",
        source: "draw-polygon",
        paint: { "fill-color": "#C0626A", "fill-opacity": 0.25 },
      });
      map.addLayer({
        id: "draw-polygon-line",
        type: "line",
        source: "draw-polygon",
        paint: { "line-color": "#C0626A", "line-width": 2 },
      });

      // Click to add point
      map.on("click", (e) => {
        setPoints((prev) => {
          if (closedRef.current) return prev; // do not add after close
          if (prev.length >= maxPoints) return prev;
          const next: LngLat[] = [...prev, [e.lngLat.lng, e.lngLat.lat]];
          if (next.length === maxPoints) {
            // auto-close
            queueMicrotask(() => setClosed(true));
          }
          return next;
        });
      });

      // Fit bounds to existing polygons if any
      if (existingFC.features.length) {
        const bounds = new mapboxgl.LngLatBounds();
        existingFC.features.forEach((f) => {
          if (f.geometry.type === "Polygon") {
            f.geometry.coordinates[0].forEach((c) =>
              bounds.extend(c as [number, number])
            );
          }
        });
        if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track closed in a ref so the click handler sees current value
  const closedRef = useRef(closed);
  useEffect(() => {
    closedRef.current = closed;
  }, [closed]);

  // Sync markers + polygon source whenever points/closed change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.isStyleLoaded()) {
      map.once("load", () => syncDrawing());
      return;
    }
    syncDrawing();

    function syncDrawing() {
      // markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = points.map((p, i) => {
        const el = document.createElement("div");
        el.className =
          "flex items-center justify-center text-[11px] font-mono font-bold text-white bg-[#C0626A] border-2 border-white rounded-full";
        el.style.width = "24px";
        el.style.height = "24px";
        el.style.boxShadow = "0 1px 3px rgba(46,26,26,0.3)";
        el.textContent = String(i + 1);
        return new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat(p)
          .addTo(map!);
      });

      // polygon line / fill
      const src = map!.getSource("draw-polygon") as mapboxgl.GeoJSONSource | undefined;
      if (!src) return;

      if (points.length === 0) {
        src.setData({ type: "FeatureCollection", features: [] });
        return;
      }
      if (points.length < 3) {
        src.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: points },
            },
          ],
        });
        return;
      }
      // ≥ 3 points: render polygon (preview ring closes back to first point)
      const ring = [...points, points[0]];
      src.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { closed },
            geometry: { type: "Polygon", coordinates: [ring] },
          },
        ],
      });
    }
  }, [points, closed]);

  // Notify parent
  useEffect(() => {
    onValidityChange?.(closed && points.length >= 3, points.length);
    onChange?.(points, polygonGeoJSON);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, closed]);

  const undo = () => {
    setClosed(false);
    setPoints((p) => p.slice(0, -1));
  };
  const reset = () => {
    setClosed(false);
    setPoints([]);
  };
  const close = () => {
    if (points.length >= 3) setClosed(true);
  };

  const noToken = !mapboxgl.accessToken;

  // ─── Geocoder search ─────────────────────────────────────────────────────
  type GeoResult = {
    id: string;
    place_name: string;
    center: [number, number]; // [lng, lat]
    bbox?: [number, number, number, number];
  };
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const searchSeq = useRef(0);

  useEffect(() => {
    if (!mapboxgl.accessToken) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const mySeq = ++searchSeq.current;
    const t = setTimeout(async () => {
      try {
        const url =
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
          `?access_token=${mapboxgl.accessToken}` +
          `&country=IN&limit=6&autocomplete=true&language=en`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("geocoding failed");
        const data = await res.json();
        if (mySeq !== searchSeq.current) return; // stale
        setResults((data.features ?? []) as GeoResult[]);
        setResultsOpen(true);
      } catch {
        if (mySeq !== searchSeq.current) return;
        setResults([]);
      } finally {
        if (mySeq === searchSeq.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const selectResult = (r: GeoResult) => {
    const map = mapRef.current;
    if (!map) return;
    if (r.bbox) {
      map.fitBounds(
        [
          [r.bbox[0], r.bbox[1]],
          [r.bbox[2], r.bbox[3]],
        ],
        { padding: 60, maxZoom: 15, duration: 800 }
      );
    } else {
      map.flyTo({ center: r.center, zoom: 14, duration: 800 });
    }
    setResultsOpen(false);
    setQuery(r.place_name);
  };

  return (
    <div className={cn("relative w-full h-full bg-brand-bg", className)}>
      {noToken ? (
        <div className="h-full flex items-center justify-center px-6 text-center">
          <div>
            <p className="font-heading text-lg text-brand-text mb-1">
              Mapbox token missing
            </p>
            <p className="text-sm text-brand-textMuted max-w-md">
              Set <span className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</span> in your
              <span className="font-mono"> .env</span> file and reload.
            </p>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="absolute inset-0" />
      )}

      {/* Floating toolbar */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-10 flex flex-wrap items-center gap-2 bg-brand-surface/95 backdrop-blur border border-brand-border rounded-md shadow-soft p-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-brand-primary px-2">
          {points.length}/{maxPoints} points
          {closed && <span className="ml-2 text-brand-success">· closed</span>}
        </span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={points.length === 0}
        >
          <Undo2 size={14} />
          Undo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          disabled={points.length === 0}
        >
          <RotateCcw size={14} />
          Reset
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={close}
          disabled={points.length < 3 || closed}
        >
          <CheckCircle2 size={14} />
          Close path
        </Button>
      </div>

      {/* Geocoder search */}
      {!noToken && (
        <div className="absolute top-[68px] left-3 z-10 w-[min(420px,calc(100%-24px))]">
          <div className="relative">
            <div className="flex items-center gap-2 bg-brand-surface/95 backdrop-blur border border-brand-border rounded-md shadow-soft px-3 py-2">
              <Search size={14} className="text-brand-textMuted shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setResultsOpen(true)}
                placeholder="Search area, city, locality…"
                className="flex-1 bg-transparent outline-none text-sm text-brand-text placeholder:text-brand-textMuted"
              />
              {searching && (
                <Loader2
                  size={14}
                  className="text-brand-textMuted animate-spin shrink-0"
                />
              )}
              {!searching && query.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    setResultsOpen(false);
                  }}
                  className="text-[11px] font-mono text-brand-textMuted hover:text-brand-text shrink-0"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </div>

            {resultsOpen && results.length > 0 && (
              <ul className="absolute left-0 right-0 mt-1 max-h-72 overflow-auto bg-brand-surface border border-brand-border rounded-md shadow-soft divide-y divide-brand-border">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => selectResult(r)}
                      className="w-full text-left px-3 py-2 hover:bg-brand-bg focus:bg-brand-bg focus:outline-none"
                    >
                      <p className="text-sm text-brand-text line-clamp-2">
                        {r.place_name}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {resultsOpen &&
              !searching &&
              query.trim().length >= 2 &&
              results.length === 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-brand-surface border border-brand-border rounded-md shadow-soft px-3 py-2 text-sm text-brand-textMuted">
                  No matches. Try a broader query.
                </div>
              )}
          </div>
        </div>
      )}

      {/* Helper text */}
      {points.length === 0 && !noToken && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-brand-surface/95 backdrop-blur border border-brand-border rounded-md shadow-soft px-4 py-2 text-sm text-brand-text">
          Click on the map to drop the first point.
        </div>
      )}
    </div>
  );
}
