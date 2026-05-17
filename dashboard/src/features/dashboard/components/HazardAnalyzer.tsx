"use client";

import { useMemo } from "react";
import { AlertTriangle, Satellite } from "lucide-react";
import { useUserLocation } from "@/lib/use-user-location";
import type { DashboardHotspot } from "@/lib/dashboard-hotspots";

type Props = {
  hotspots: DashboardHotspot[];
};

const severityScore: Record<DashboardHotspot["severity"], number> = {
  CRITICAL: 100,
  HIGH: 60,
  MEDIUM: 30,
  LOW: 10,
};

const severityToCopy: Record<
  DashboardHotspot["severity"],
  { label: string; recommended: string }
> = {
  CRITICAL: {
    label: "CRITICAL",
    recommended:
      "Immediate evacuation perimeter. Coordinate with local response team and prepare casualty staging.",
  },
  HIGH: {
    label: "HIGH",
    recommended:
      "Distribute N95 masks, avoid outdoor activity, pre-position evacuation routes, monitor wind shifts.",
  },
  MEDIUM: {
    label: "MEDIUM",
    recommended:
      "Maintain situational awareness. Sensitive groups should limit outdoor exposure. Confirm with ground reports if available.",
  },
  LOW: {
    label: "LOW",
    recommended:
      "Standard monitoring. Track FRP and confidence over the next pass to confirm sustained activity.",
  },
};

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

/**
 * Single-card snapshot of the worst active satellite-detected hazard near
 * the viewer. Scored the same way as the IncidentFeed
 * (severity_score + risk_score - distance/100) so the top of that feed and
 * this card stay in agreement.
 *
 * Replaces the previously-hardcoded "Critical Field Report" demo text.
 */
export function HazardAnalyzer({ hotspots }: Props) {
  const { location } = useUserLocation();

  const top = useMemo(() => {
    if (hotspots.length === 0 || !location) return null;
    const scored = hotspots.map((h) => {
      const dist = distanceKm(location.lat, location.lon, h.lat, h.lon);
      const score =
        severityScore[h.severity] + h.risk_score - Math.min(dist / 100, 50);
      return { h, dist, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }, [hotspots, location]);

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-red-950/70 to-slate-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Satellite className="h-4 w-4 text-red-300" />
        <h3 className="text-xl font-bold">Top hazard near you</h3>
      </div>
      {top ? (
        <div className="rounded-2xl border border-red-400/20 bg-black/30 p-5">
          <div className="mb-4 flex items-center gap-3 text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">
              {severityToCopy[top.h.severity].label} · {Math.round(top.dist).toLocaleString()} km from you
            </span>
          </div>
          <p className="text-slate-300">
            {top.h.environmental_label ??
              "Active satellite-detected fire pixel."}
            {top.h.province && (
              <>
                {" "}
                Region: <strong>{top.h.province}</strong>
                {top.h.regency ? ` / ${top.h.regency}` : ""}.
              </>
            )}
            {typeof top.h.frp === "number" && (
              <>
                {" "}
                FRP <strong>{Math.round(top.h.frp)}&nbsp;MW</strong>
                {top.h.smoke_impact ? ` · ${top.h.smoke_impact} smoke impact` : ""}.
              </>
            )}
          </p>
          <div className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-100">
            <span className="font-semibold">Recommended action:</span>{" "}
            {severityToCopy[top.h.severity].recommended}
          </div>
          <div className="mt-3 text-[11px] text-slate-500">
            Selected from the latest NASA FIRMS pass · ranked by severity and
            proximity to your geolocation.
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-slate-400">
          {hotspots.length === 0
            ? "No active satellite-detected hazards in the most recent FIRMS pass."
            : "Resolving your location to rank nearby hazards…"}
        </div>
      )}
    </div>
  );
}
