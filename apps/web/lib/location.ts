"use client";

const KEY = "bharat-loc";

export interface UserLocation {
  lat: number;
  lng: number;
  capturedAt: number;
  name?: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=neighborhood,locality,place,district&language=en`
    );
    const data = await res.json();
    if (data.features?.length > 0) return data.features[0].place_name as string;
  } catch {}
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

export function getStoredLocation(): UserLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserLocation;
    if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredLocation(loc: UserLocation) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(loc));
}

export function clearStoredLocation() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function detectLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const v: UserLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          capturedAt: Date.now(),
        };
        setStoredLocation(v);
        resolve(v);
      },
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
  });
}
