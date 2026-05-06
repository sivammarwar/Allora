"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Loader2 } from "lucide-react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export type LngLat = [number, number];

interface Props {
  /** Polygon coordinates as GeoJSON Polygon format (array of rings) */
  polygon: GeoJSON.Polygon;
  /** Area name to display */
  areaName?: string;
  className?: string;
}

/**
 * Simple read-only map component to display an area polygon.
 */
export function AreaMapView({ polygon, areaName, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!polygon) return;

    // Calculate center from polygon bounds
    const coords = polygon.coordinates[0]; // outer ring
    const lats = coords.map((c) => c[1]);
    const lngs = coords.map((c) => c[0]);
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [centerLng, centerLat],
      zoom: 12,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Add the polygon source and layer
      map.addSource("area", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: { name: areaName },
          geometry: polygon,
        },
      });

      // Fill layer
      map.addLayer({
        id: "area-fill",
        type: "fill",
        source: "area",
        paint: {
          "fill-color": "#c0626a",
          "fill-opacity": 0.3,
        },
      });

      // Border layer
      map.addLayer({
        id: "area-border",
        type: "line",
        source: "area",
        paint: {
          "line-color": "#c0626a",
          "line-width": 2,
        },
      });

      // Fit bounds to polygon
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach((coord) => bounds.extend(coord as LngLat));
      map.fitBounds(bounds, { padding: 50 });
    });

    return () => {
      map.remove();
    };
  }, [polygon, areaName]);

  if (!polygon) {
    return (
      <div className={`flex items-center justify-center bg-brand-surface ${className}`}>
        <Loader2 className="animate-spin text-brand-primary" size={24} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full min-h-[300px] rounded-lg ${className}`}
    />
  );
}
