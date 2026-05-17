/**
 * NusaSiaga Dashboard Hotspots
 *
 * Loads hotspot data for the wildfire map.
 * Priority order:
 *   1. outputs/dashboard_hotspots.json (notebook-generated from real FIRMS CSV)
 *   2. DEMO_FALLBACK (hardcoded sample data if no notebook output found)
 *
 * Schema is forward-compatible with enhanced FIRMS fields:
 * brightness, frp, confidence, satellite, environmental_label, smoke_impact
 */

export type HotspotSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type SmokeImpact = "severe" | "high" | "moderate" | "low" | "minimal";

export interface DashboardHotspot {
  id: string;
  lat: number;
  lon: number;
  severity: HotspotSeverity;
  risk_score: number;
  // Enhanced FIRMS fields
  brightness?: number;
  frp?: number;
  confidence?: number;
  satellite?: string;
  acq_date?: string;
  // Location context
  province?: string;
  regency?: string;
  // Environmental reasoning fields
  environmental_label?: string;
  smoke_impact?: SmokeImpact;
}

export interface EnvironmentalImpact {
  estimated_area_burned_ha?: number;
  smoke_plume_radius_km?: number;
  aqi_risk_level?: string;
  estimated_co2_release_tons?: number;
  peatland_involvement?: boolean;
  smoke_hazard_estimate?: string;
  evacuation_recommendation?: string;
  carbon_release_note?: string;
}

export interface ProvinceSummary {
  province: string;
  hotspot_count: number;
  critical_count: number;
  avg_frp?: number;
  max_frp?: number;
  risk_level: string;
  regencies_affected?: string[];
}

export interface HotspotSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  avg_frp?: number;
  max_frp?: number;
  satellites_used?: string[];
  provinces_affected?: string[];
}

export interface DashboardHotspotsPayload {
  hotspots: DashboardHotspot[];
  summary: HotspotSummary;
  environmental_impact?: EnvironmentalImpact;
  province_summaries?: ProvinceSummary[];
  metadata?: {
    source: string;
    generated_at?: string;
    pipeline_version?: string;
    data_source?: string;
  };
  source: "notebook" | "demo" | "firms-live";
}

// ---------------------------------------------------------------------------
// Demo fallback — used when notebook output is absent
// Covers the 3 main Indonesian fire provinces for visual completeness
// ---------------------------------------------------------------------------
const DEMO_FALLBACK: DashboardHotspotsPayload = {
  source: "demo",
  summary: {
    total: 9,
    critical: 2,
    high: 3,
    medium: 3,
    low: 1,
    provinces_affected: ["Riau", "Kalimantan Barat", "Sumatera Selatan"],
  },
  environmental_impact: {
    aqi_risk_level: "UNHEALTHY",
    smoke_hazard_estimate:
      "Demo mode: smoke impact estimates unavailable. Run notebook pipeline with real FIRMS data for accurate assessment.",
    evacuation_recommendation:
      "Demo mode: connect NASA FIRMS CSV data and re-run notebook for live evacuation guidance.",
  },
  hotspots: [
    // Riau cluster
    {
      id: "DEMO-001",
      lat: 0.5071,
      lon: 101.4478,
      severity: "CRITICAL",
      risk_score: 88,
      province: "Riau",
      regency: "Pekanbaru surroundings",
      environmental_label: "Demo: Critical peatland zone",
      smoke_impact: "severe",
    },
    {
      id: "DEMO-002",
      lat: 0.3921,
      lon: 101.2234,
      severity: "HIGH",
      risk_score: 72,
      province: "Riau",
      environmental_label: "Demo: Active burn zone",
      smoke_impact: "high",
    },
    {
      id: "DEMO-003",
      lat: 0.6234,
      lon: 101.6789,
      severity: "MEDIUM",
      risk_score: 54,
      province: "Riau",
      environmental_label: "Demo: Monitoring zone",
      smoke_impact: "moderate",
    },
    // Kalimantan Barat cluster
    {
      id: "DEMO-004",
      lat: -0.2073,
      lon: 111.4934,
      severity: "CRITICAL",
      risk_score: 91,
      province: "Kalimantan Barat",
      regency: "Ketapang",
      environmental_label: "Demo: Critical peatland fire",
      smoke_impact: "severe",
    },
    {
      id: "DEMO-005",
      lat: -0.4823,
      lon: 111.7234,
      severity: "HIGH",
      risk_score: 76,
      province: "Kalimantan Barat",
      environmental_label: "Demo: Expanding fire front",
      smoke_impact: "high",
    },
    {
      id: "DEMO-006",
      lat: -0.1234,
      lon: 111.2345,
      severity: "MEDIUM",
      risk_score: 51,
      province: "Kalimantan Barat",
      environmental_label: "Demo: Agricultural burn",
      smoke_impact: "low",
    },
    // Sumatera Selatan cluster
    {
      id: "DEMO-007",
      lat: -2.9761,
      lon: 104.7754,
      severity: "HIGH",
      risk_score: 68,
      province: "Sumatera Selatan",
      regency: "OKI",
      environmental_label: "Demo: Peatland burn",
      smoke_impact: "high",
    },
    {
      id: "DEMO-008",
      lat: -3.1234,
      lon: 104.9876,
      severity: "MEDIUM",
      risk_score: 53,
      province: "Sumatera Selatan",
      environmental_label: "Demo: Moderate fire activity",
      smoke_impact: "moderate",
    },
    {
      id: "DEMO-009",
      lat: -2.7891,
      lon: 104.5432,
      severity: "LOW",
      risk_score: 32,
      province: "Sumatera Selatan",
      environmental_label: "Demo: Low-activity detection",
      smoke_impact: "minimal",
    },
  ],
};

// ---------------------------------------------------------------------------
// Loader — server-side only (Node.js fs)
// ---------------------------------------------------------------------------
export async function loadDashboardHotspots(): Promise<DashboardHotspotsPayload> {
  // Only attempt file read in Node.js environment
  if (typeof window !== "undefined") {
    return DEMO_FALLBACK;
  }

  try {
    const fs = await import("fs");
    const path = await import("path");

    const outputPath = path.join(
      process.cwd(),
      "outputs",
      "dashboard_hotspots.json"
    );

    if (!fs.existsSync(outputPath)) {
      console.warn(
        "[NusaSiaga] outputs/dashboard_hotspots.json not found — using demo fallback"
      );
      return DEMO_FALLBACK;
    }

    const raw = fs.readFileSync(outputPath, "utf-8");
    const parsed = JSON.parse(raw);

    // Validate minimum required fields
    if (
      !parsed.hotspots ||
      !Array.isArray(parsed.hotspots) ||
      parsed.hotspots.length === 0
    ) {
      console.warn(
        "[NusaSiaga] dashboard_hotspots.json has no hotspots — using demo fallback"
      );
      return DEMO_FALLBACK;
    }

    // Normalize hotspots to ensure required fields exist
    const hotspots: DashboardHotspot[] = parsed.hotspots
      .map(
        (h: Record<string, unknown>, idx: number): DashboardHotspot | null => {
          const lat = Number(h.lat ?? h.latitude);
          const lon = Number(h.lon ?? h.longitude);

          if (isNaN(lat) || isNaN(lon)) return null;

          const severity = normalizeSeverity(
            String(h.severity ?? "MEDIUM")
          );

          return {
            id: String(h.id ?? `HS-${String(idx + 1).padStart(3, "0")}`),
            lat,
            lon,
            severity,
            risk_score: Number(h.risk_score ?? h.score ?? 50),
            brightness: h.brightness != null ? Number(h.brightness) : undefined,
            frp: h.frp != null ? Number(h.frp) : undefined,
            confidence: h.confidence != null ? Number(h.confidence) : undefined,
            satellite: h.satellite ? String(h.satellite) : undefined,
            acq_date: h.acq_date ? String(h.acq_date) : undefined,
            province: h.province ? String(h.province) : undefined,
            regency: h.regency ? String(h.regency) : undefined,
            environmental_label: h.environmental_label
              ? String(h.environmental_label)
              : undefined,
            smoke_impact: h.smoke_impact
              ? (h.smoke_impact as SmokeImpact)
              : undefined,
          };
        }
      )
      .filter((h: DashboardHotspot | null): h is DashboardHotspot => h !== null);

    if (hotspots.length === 0) {
      console.warn(
        "[NusaSiaga] All hotspot rows failed normalization — using demo fallback"
      );
      return DEMO_FALLBACK;
    }

    const summary: HotspotSummary = parsed.summary ?? computeSummary(hotspots);

    return {
      source: "notebook",
      hotspots,
      summary,
      environmental_impact: parsed.environmental_impact,
      province_summaries: parsed.province_summaries,
      metadata: {
        ...parsed.metadata,
        source: parsed.metadata?.source ?? "NASA FIRMS via NusaSiaga Pipeline",
      },
    };
  } catch (err) {
    console.error("[NusaSiaga] Error loading dashboard hotspots:", err);
    return DEMO_FALLBACK;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeSeverity(value: string): HotspotSeverity {
  const upper = value.toUpperCase();
  if (upper === "CRITICAL") return "CRITICAL";
  if (upper === "HIGH") return "HIGH";
  if (upper === "MEDIUM") return "MEDIUM";
  return "LOW";
}

function computeSummary(hotspots: DashboardHotspot[]): HotspotSummary {
  const counts = { total: hotspots.length, critical: 0, high: 0, medium: 0, low: 0 };
  const frps = hotspots.map((h) => h.frp ?? 0).filter((f) => f > 0);
  const provinces = new Set(
    hotspots.map((h) => h.province).filter(Boolean) as string[]
  );

  for (const h of hotspots) {
    if (h.severity === "CRITICAL") counts.critical++;
    else if (h.severity === "HIGH") counts.high++;
    else if (h.severity === "MEDIUM") counts.medium++;
    else counts.low++;
  }

  return {
    ...counts,
    avg_frp:
      frps.length > 0
        ? Math.round((frps.reduce((a, b) => a + b, 0) / frps.length) * 10) / 10
        : undefined,
    max_frp: frps.length > 0 ? Math.max(...frps) : undefined,
    provinces_affected: provinces.size > 0 ? Array.from(provinces) : undefined,
  };
}

/**
 * Get severity color for map rendering.
 * Matches the Tailwind/CSS color scheme used in MapLegend.
 */
export function getSeverityColor(severity: HotspotSeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "#ef4444"; // red-500
    case "HIGH":
      return "#f97316"; // orange-500
    case "MEDIUM":
      return "#eab308"; // yellow-500
    case "LOW":
      return "#22c55e"; // green-500
    default:
      return "#6b7280"; // gray-500
  }
}

/**
 * Get severity radius for map circle rendering.
 * Larger FRP = larger radius (if available), else use severity defaults.
 */
export function getSeverityRadius(
  severity: HotspotSeverity,
  frp?: number
): number {
  const base = { CRITICAL: 20, HIGH: 16, MEDIUM: 12, LOW: 8 };
  const baseRadius = base[severity] ?? 10;

  if (frp != null && frp > 0) {
    // Scale radius slightly with FRP — capped at 2x base
    const frpBonus = Math.min(frp / 50, 1.0) * (baseRadius * 0.5);
    return Math.round(baseRadius + frpBonus);
  }

  return baseRadius;
}


