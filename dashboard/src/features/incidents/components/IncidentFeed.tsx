"use client";

import { useMemo } from "react";
import { IncidentFeedCard, type Incident, type IncidentSeverity } from "./IncidentFeedCard";
import type { DashboardHotspot } from "@/lib/dashboard-hotspots";
import { useUserLocation } from "@/lib/use-user-location";

type Props = {
  /** Full FIRMS hotspot payload. We pick the nearest-and-worst for the feed. */
  hotspots?: DashboardHotspot[];
};

const MAX_INCIDENTS = 5;

/** Great-circle distance (km) between two lat/lon pairs via haversine. */
function distanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const severityScore: Record<DashboardHotspot["severity"], number> = {
  CRITICAL: 100,
  HIGH: 60,
  MEDIUM: 30,
  LOW: 10,
};

function buildTitle(h: DashboardHotspot): string {
  if (h.environmental_label && h.environmental_label.trim().length > 0) {
    return h.environmental_label;
  }
  // Fall back to a generic phrasing based on severity.
  switch (h.severity) {
    case "CRITICAL": return "Critical-severity fire detection";
    case "HIGH": return "High-severity fire detection";
    case "MEDIUM": return "Medium-severity fire detection";
    case "LOW": return "Low-intensity hotspot";
  }
}

function buildResponseStatus(h: DashboardHotspot): string {
  const parts: string[] = [];
  if (typeof h.frp === "number") parts.push(`FRP ${Math.round(h.frp)} MW`);
  if (typeof h.confidence === "number") parts.push(`confidence ${h.confidence}%`);
  if (h.smoke_impact) parts.push(`${h.smoke_impact} smoke impact`);
  if (parts.length === 0) {
    return "Satellite-only detection; no ground-side response status available.";
  }
  return parts.join(" · ");
}

function formatRegion(h: DashboardHotspot, distKm: number): string {
  if (h.province && h.regency) return `${h.regency}, ${h.province}`;
  if (h.province) return h.province;
  return `${Math.round(distKm).toLocaleString()} km from you`;
}

function formatTimestamp(acqDate: string | undefined): string {
  if (!acqDate) return "recent FIRMS pass";
  // FIRMS dates look like 2026-05-15. We don't have intra-day time precision,
  // so render in plain language relative to "today".
  const today = new Date().toISOString().slice(0, 10);
  if (acqDate === today) return "today's satellite pass";
  return `pass of ${acqDate}`;
}

export function IncidentFeed({ hotspots = [] }: Props) {
  const { location } = useUserLocation();

  const incidents = useMemo<Incident[]>(() => {
    if (hotspots.length === 0 || !location) return [];
    // Score = severityScore + risk_score - distance_penalty (per 1000 km).
    // The mix favours severe-and-close first, then severe-and-far, then
    // close-and-mild, gracefully degrading to whatever exists worldwide.
    const scored = hotspots.map((h) => {
      const dist = distanceKm(location.lat, location.lon, h.lat, h.lon);
      const score =
        severityScore[h.severity] +
        h.risk_score -
        Math.min(dist / 100, 50); // up to -50 for very far hotspots
      return { h, dist, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_INCIDENTS).map(({ h, dist }) => ({
      title: buildTitle(h),
      region: formatRegion(h, dist),
      severity: h.severity as IncidentSeverity,
      timestamp: formatTimestamp(h.acq_date),
      responseStatus: buildResponseStatus(h),
    }));
  }, [hotspots, location]);

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Real-time Incident Feed
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Active fire detections from the latest NASA FIRMS pass, ranked by
            severity and proximity to your current location.
          </p>
        </div>
        <div className="rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {incidents.length} active{" "}
          {incidents.length === 1 ? "update" : "updates"}
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-slate-400">
          {hotspots.length === 0
            ? "No active hotspots in the most recent FIRMS pass. The dashboard is at standby."
            : "Resolving your location to rank nearby hotspots…"}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {incidents.map((incident, idx) => (
            <IncidentFeedCard
              key={`${incident.region}-${incident.title}-${idx}`}
              incident={incident}
            />
          ))}
        </div>
      )}
    </section>
  );
}
