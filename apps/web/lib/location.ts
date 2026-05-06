"use client";

const KEY = "allora-loc";

export interface UserLocation {
  lat: number;
  lng: number;
  capturedAt: number;
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
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}
