"use client";

import { useEffect, useRef, useState } from "react";

export type LocationSource = "gps" | "ip" | "default";

export type UserLocation = {
  lat: number;
  lon: number;
  source: LocationSource;
  /** Optional human-readable place from the IP geolocation step. */
  label: string | null;
};

/** Final fallback. Central Jakarta — same point Scenario A is anchored at. */
const DEFAULT_LOCATION: UserLocation = {
  lat: -6.243,
  lon: 106.858,
  source: "default",
  label: "Default — Jakarta",
};

/**
 * Three-tier location resolution:
 *
 *   1. navigator.geolocation (requires user grant). Most accurate.
 *   2. https://ipapi.co/json/ — free, no API key, returns lat + lon +
 *      city + country_name. Coarse (~10 km) but no permission prompt.
 *   3. DEFAULT_LOCATION (Jakarta).
 *
 * The hook resolves once on mount and then never again. It does NOT
 * watch position; for a wildfire dashboard a coarse static fix is
 * fine and prevents the AQI/wind calls from thrashing every time the
 * user walks a few metres.
 */
export function useUserLocation(): {
  location: UserLocation | null;
  loading: boolean;
} {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const resolved = useRef(false);

  useEffect(() => {
    if (resolved.current) return;
    resolved.current = true;

    let cancelled = false;
    const finish = (loc: UserLocation) => {
      if (cancelled) return;
      setLocation(loc);
      setLoading(false);
    };

    const tryGps = () =>
      new Promise<UserLocation | null>((resolve) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              source: "gps",
              label: null,
            }),
          () => resolve(null),
          { timeout: 4000, enableHighAccuracy: false, maximumAge: 5 * 60_000 },
        );
      });

    const tryIp = async (): Promise<UserLocation | null> => {
      try {
        const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          latitude?: number;
          longitude?: number;
          city?: string;
          country_name?: string;
        };
        if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
          return null;
        }
        const labelParts = [data.city, data.country_name].filter(Boolean);
        return {
          lat: data.latitude,
          lon: data.longitude,
          source: "ip",
          label: labelParts.length > 0 ? labelParts.join(", ") : null,
        };
      } catch {
        return null;
      }
    };

    (async () => {
      const gps = await tryGps();
      if (gps) {
        finish(gps);
        return;
      }
      const ip = await tryIp();
      if (ip) {
        finish(ip);
        return;
      }
      finish(DEFAULT_LOCATION);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { location, loading };
}
