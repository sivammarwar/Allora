"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface Props {
  value?: { lat: number; lng: number } | null;
  onChange: (value: { lat: number; lng: number }) => void;
  onAddressChange?: (address: string) => void;
  className?: string;
}

/**
 * Compact Mapbox map. Click anywhere to drop a pin. "Use my location" button
 * uses browser geolocation. Returns { lat, lng } via onChange.
 */
export function LocationPicker({ value, onChange, onAddressChange, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const onAddressChangeRef = useRef(onAddressChange);
  const [locating, setLocating] = useState(false);

  // Keep refs up-to-date so map click handler always uses latest callbacks
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onAddressChangeRef.current = onAddressChange; }, [onAddressChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!mapboxgl.accessToken) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: value ? [value.lng, value.lat] : [78.9629, 20.5937],
      zoom: value ? 14 : 4.2,
    });
    mapRef.current = map;

    map.on("click", async (e) => {
      const lat = e.lngLat.lat;
      const lng = e.lngLat.lng;
      onChangeRef.current({ lat, lng });
      // Reverse geocode to auto-fill address
      if (onAddressChangeRef.current && mapboxgl.accessToken) {
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&limit=1`
          );
          const data = await res.json();
          if (data.features?.[0]) {
            onAddressChangeRef.current(data.features[0].place_name);
          }
        } catch {
          // Silently fail
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const el = document.createElement("div");
      el.style.width = "20px";
      el.style.height = "20px";
      el.style.borderRadius = "9999px";
      el.style.background = "#C0626A";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 1px 4px rgba(46,26,26,0.4)";
      markerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([value.lng, value.lat])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([value.lng, value.lat]);
    }
  }, [value]);

  async function useGeolocation(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onChange({ lat, lng });
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 15 });
        
        // Reverse geocode to get address
        if (onAddressChange && mapboxgl.accessToken) {
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&limit=1`
            );
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              onAddressChange(data.features[0].place_name);
            }
          } catch {
            // Silently fail - address won't be auto-filled
          }
        }
        
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  if (!mapboxgl.accessToken) {
    return (
      <div className={className}>
        <p className="text-sm text-brand-textMuted">
          Mapbox token missing. Set <span className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</span>.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-72 rounded-sm overflow-hidden border border-brand-border ${className ?? ""}`}>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-2 right-2 z-10">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useGeolocation}
          loading={locating}
          className="bg-brand-surface/95 backdrop-blur"
        >
          <Crosshair size={14} />
          Use my location
        </Button>
      </div>
      {value && (
        <div className="absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded-sm bg-brand-surface/95 backdrop-blur border border-brand-border text-[11px] font-mono text-brand-textMuted">
          {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </div>
      )}
    </div>
  );
}
