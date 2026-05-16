"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { getSocket } from "@/lib/socket";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface Props {
  orderId: string;
  heroLocation: { lat: number; lng: number };
  dropOffLocation: { lat: number; lng: number };
  className?: string;
}

/**
 * Renders a Mapbox map with three markers — pickup (hero), drop-off (user)
 * and the moving delivery boy. The delivery marker subscribes to the
 * `/tracking` socket's `delivery:location_update` event for this order.
 */
export function LiveTrackingMap({
  orderId,
  heroLocation,
  dropOffLocation,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const heroMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const dropMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const deliveryMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [hasDelivery, setHasDelivery] = useState(false);

  // Initialize map + static markers once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!mapboxgl.accessToken) return;

    // Center between hero and drop-off
    const cLng = (heroLocation.lng + dropOffLocation.lng) / 2;
    const cLat = (heroLocation.lat + dropOffLocation.lat) / 2;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [cLng, cLat],
      zoom: 13,
    });
    mapRef.current = map;

    map.on("load", () => {
      // Fit both points
      const bounds = new mapboxgl.LngLatBounds()
        .extend([heroLocation.lng, heroLocation.lat])
        .extend([dropOffLocation.lng, dropOffLocation.lat]);
      map.fitBounds(bounds, { padding: 60, duration: 0 });
    });

    const heroEl = makeMarker("#8B4A4A", "S");
    heroMarkerRef.current = new mapboxgl.Marker({ element: heroEl })
      .setLngLat([heroLocation.lng, heroLocation.lat])
      .setPopup(new mapboxgl.Popup({ offset: 18 }).setText("Pickup"))
      .addTo(map);

    const dropEl = makeMarker("#2E1A1A", "U");
    dropMarkerRef.current = new mapboxgl.Marker({ element: dropEl })
      .setLngLat([dropOffLocation.lng, dropOffLocation.lat])
      .setPopup(new mapboxgl.Popup({ offset: 18 }).setText("Drop-off"))
      .addTo(map);

    return () => {
      heroMarkerRef.current?.remove();
      dropMarkerRef.current?.remove();
      deliveryMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      heroMarkerRef.current = null;
      dropMarkerRef.current = null;
      deliveryMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to live delivery updates
  useEffect(() => {
    const s = getSocket("/tracking");
    s.emit("track:join", orderId);

    const handler = (payload: { orderId: string; lat: number; lng: number }) => {
      if (payload.orderId !== orderId) return;
      const map = mapRef.current;
      if (!map) return;
      if (!deliveryMarkerRef.current) {
        const el = makeMarker("#C0626A", "D", true);
        deliveryMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([payload.lng, payload.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 18 }).setText("Delivery partner")
          )
          .addTo(map);
        setHasDelivery(true);
      } else {
        deliveryMarkerRef.current.setLngLat([payload.lng, payload.lat]);
      }
    };
    s.on("delivery:location_update", handler);
    return () => {
      s.off("delivery:location_update", handler);
      s.emit("track:leave", orderId);
    };
  }, [orderId]);

  if (!mapboxgl.accessToken) {
    return (
      <div
        className={`rounded-sm border border-brand-border bg-brand-surface p-4 text-sm text-brand-textMuted ${className ?? ""}`}
      >
        Set <code className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> to
        enable live tracking.
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        ref={containerRef}
        className="w-full h-[260px] rounded-sm overflow-hidden border border-brand-border"
      />
      {!hasDelivery && (
        <div className="absolute top-2 left-2 px-2 py-1 rounded-sm bg-brand-bg/90 border border-brand-border text-[10px] uppercase tracking-widest font-mono text-brand-textMuted">
          Waiting for partner location…
        </div>
      )}
    </div>
  );
}

function makeMarker(color: string, label: string, pulse = false) {
  const el = document.createElement("div");
  el.style.width = "26px";
  el.style.height = "26px";
  el.style.borderRadius = "9999px";
  el.style.background = color;
  el.style.color = "white";
  el.style.fontSize = "11px";
  el.style.fontWeight = "700";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.border = "3px solid white";
  el.style.boxShadow = "0 1px 6px rgba(46,26,26,0.4)";
  el.textContent = label;
  if (pulse) {
    el.style.animation = "bharat-pulse 1.6s ease-in-out infinite";
  }
  return el;
}
