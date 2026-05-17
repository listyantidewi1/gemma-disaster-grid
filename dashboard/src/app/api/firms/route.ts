import { NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScoredHotspot = {
  id: string;
  lat: number;
  lon: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  risk_score: number;
  brightness: number;
  frp: number;
  confidence: number;
  satellite: string;
  acq_date: string;
  province: string;
  regency: string;
  environmental_label: string;
  smoke_impact: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MAP_KEY = process.env.NASA_FIRMS_MAP_KEY ?? "";

// World bounding box: west, south, east, north. FIRMS accepts the global
// area; the response is capped server-side to whatever fits the API's
// per-request size budget and we additionally cap client-side after CSV
// parsing (see parseFirmsCsv -> .slice(0, MAX_GLOBAL_HOTSPOTS)).
const GLOBAL_BBOX = "-180,-90,180,90";

// Cap the rendered set so the browser doesn't try to mount a thousand
// Leaflet markers. 500 is comfortable; bump if FRP variance is high.
const MAX_GLOBAL_HOTSPOTS = 500;

const FIRMS_URL = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/VIIRS_SNPP_NRT/${GLOBAL_BBOX}/1`;

// Cache response for 30 minutes to avoid hammering NASA API
let cache: { data: unknown; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000;

// ─── Province lookup ──────────────────────────────────────────────────────────

const PROVINCE_BOUNDS: [number, number, number, number, string, string][] = [
  // ── Sumatera ──────────────────────────────────────────────────────────────
  [-5.5, -2.5, 104.5, 106.5, "Sumatera Selatan", "OKI / Musi Banyuasin"],
  [-4.0, -1.5, 101.5, 104.5, "Sumatera Selatan", "Musi Rawas / Lahat"],
  [-3.5, -1.0, 100.5, 102.5, "Jambi", "Muaro Jambi / Tanjab"],
  [-2.5, 0.0, 101.5, 103.5, "Riau", "Pelalawan / Indragiri Hulu"],
  [-1.5, 0.5, 103.5, 105.5, "Riau", "Indragiri Hilir / Siak"],
  [0.5, 2.5, 100.5, 103.0, "Riau", "Kampar / Rokan"],
  [-4.5, -2.5, 103.0, 105.0, "Sumatera Selatan", "Ogan Komering Ilir"],
  [-6.5, -4.5, 104.5, 106.5, "Lampung", "Lampung Tengah / Selatan"],
  [-3.5, -1.5, 99.0, 101.5, "Sumatera Barat", "Pasaman / Sijunjung"],
  [-1.5, 1.0, 98.0, 100.5, "Sumatera Utara", "Asahan / Labuhanbatu"],
  [1.0, 4.0, 97.5, 100.0, "Sumatera Utara", "Karo / Dairi"],
  [4.0, 6.0, 95.0, 98.5, "Aceh", "Aceh Tengah / Barat"],
  [2.0, 4.5, 98.0, 100.5, "Sumatera Utara", "Tapanuli / Toba"],
  [-2.0, 0.5, 103.5, 105.0, "Kepulauan Riau", "Bintan / Lingga"],
  [-4.0, -2.0, 105.5, 107.5, "Bangka Belitung", "Bangka / Belitung"],
  // ── Jawa ──────────────────────────────────────────────────────────────────
  [-7.5, -5.5, 105.0, 108.5, "Jawa Barat", "Banten / Bogor / Sukabumi"],
  [-7.5, -6.5, 108.5, 111.5, "Jawa Tengah", "Pekalongan / Purwokerto"],
  [-8.5, -7.0, 111.0, 112.5, "Jawa Timur", "Madiun / Kediri"],
  [-8.5, -7.5, 112.5, 114.5, "Jawa Timur", "Malang / Banyuwangi"],
  [-7.0, -6.0, 106.5, 108.5, "DKI Jakarta / Jawa Barat", "Jakarta / Bekasi / Karawang"],
  [-8.5, -8.0, 114.5, 116.0, "Bali", "Bali"],
  // ── Kalimantan ────────────────────────────────────────────────────────────
  [-0.7, 0.5, 111.0, 113.0, "Kalimantan Barat", "Sintang / Melawi"],
  [-2.0, -0.7, 109.5, 111.5, "Kalimantan Barat", "Ketapang"],
  [-2.0, -0.5, 111.5, 113.5, "Kalimantan Barat", "Kapuas Hulu"],
  [0.5, 2.5, 109.0, 112.0, "Kalimantan Barat", "Sambas / Bengkayang"],
  [-2.5, -0.5, 113.5, 116.0, "Kalimantan Tengah", "Kapuas / Pulang Pisau"],
  [-3.5, -2.5, 112.0, 115.0, "Kalimantan Tengah", "Seruyan / Kotawaringin"],
  [-2.0, -0.5, 110.0, 112.0, "Kalimantan Tengah", "Barito Selatan / Utara"],
  [-4.5, -2.5, 114.5, 116.5, "Kalimantan Selatan", "Banjar / Hulu Sungai"],
  [-4.0, -2.8, 114.0, 115.5, "Kalimantan Selatan", "Tanah Laut / Kotabaru"],
  [-2.0, 0.5, 115.5, 118.0, "Kalimantan Timur", "Kutai Kartanegara / Bontang"],
  [0.5, 2.5, 115.0, 118.0, "Kalimantan Timur", "Berau / Malinau"],
  [-2.0, 0.5, 113.5, 115.5, "Kalimantan Timur", "Mahakam / Paser"],
  [-3.5, -1.5, 115.5, 117.5, "Kalimantan Selatan", "Tanah Bumbu / Kotabaru"],
  [0.5, 3.5, 114.5, 117.5, "Kalimantan Utara", "Nunukan / Tana Tidung"],
  // ── Sulawesi ──────────────────────────────────────────────────────────────
  [-3.0, 0.5, 119.5, 122.5, "Sulawesi Selatan", "Luwu / Bone / Wajo"],
  [-5.5, -3.0, 119.5, 122.0, "Sulawesi Selatan", "Bulukumba / Jeneponto"],
  [-3.5, -1.5, 122.0, 124.0, "Sulawesi Tengah", "Poso / Tojo Una-Una"],
  [-1.5, 1.0, 120.5, 123.5, "Sulawesi Tengah", "Donggala / Parigi Moutong"],
  [0.5, 2.5, 121.5, 124.5, "Sulawesi Utara", "Minahasa / Bolaang Mongondow"],
  [-4.0, -2.0, 121.5, 123.5, "Sulawesi Tenggara", "Kolaka / Konawe"],
  [-4.5, -3.5, 122.5, 124.0, "Sulawesi Tenggara", "Buton / Muna"],
  [-1.0, 0.5, 122.5, 124.5, "Gorontalo", "Gorontalo / Pohuwato"],
  [-3.0, -1.5, 119.0, 120.5, "Sulawesi Barat", "Mamuju / Majene"],
  // ── Nusa Tenggara ─────────────────────────────────────────────────────────
  [-9.0, -8.0, 115.5, 117.0, "Nusa Tenggara Barat", "Lombok"],
  [-9.5, -8.0, 116.5, 119.5, "Nusa Tenggara Barat", "Sumbawa / Dompu"],
  [-10.5, -8.5, 118.5, 121.0, "Nusa Tenggara Timur", "Flores / Manggarai"],
  [-10.5, -9.5, 120.5, 122.5, "Nusa Tenggara Timur", "Sumba"],
  [-10.5, -9.0, 123.5, 125.5, "Nusa Tenggara Timur", "Timor Barat / Kupang"],
  // ── Maluku ────────────────────────────────────────────────────────────────
  [-4.0, -1.5, 127.5, 130.5, "Maluku", "Maluku Tengah / SBB"],
  [-8.5, -5.5, 129.5, 131.5, "Maluku", "Maluku Tenggara / MTB"],
  [-3.5, -1.0, 124.5, 127.5, "Maluku Utara", "Halmahera / Ternate"],
  // ── Papua ─────────────────────────────────────────────────────────────────
  [-5.0, -1.0, 131.0, 135.0, "Papua Barat", "Manokwari / Sorong / Fak-Fak"],
  [-5.0, -1.0, 135.0, 139.0, "Papua Tengah", "Nabire / Puncak Jaya"],
  [-5.0, -1.0, 139.0, 141.0, "Papua Pegunungan", "Jayawijaya / Pegunungan Bintang"],
  [-9.0, -5.0, 131.0, 138.0, "Papua Selatan", "Merauke / Mappi / Asmat"],
  [-1.0, 2.0, 131.0, 136.0, "Papua Barat Daya", "Raja Ampat / Sorong Selatan"],
];

const PEATLAND_ZONES: [number, number, number, number][] = [
  // Kalimantan peatland belt
  [-3.0, 0.5, 108.0, 116.0],
  // Sumatera peatland corridor
  [-4.5, -1.5, 103.0, 107.0],
  // Riau peatland
  [-1.5, 1.5, 100.0, 104.5],
  // Papua peatland (southern lowlands)
  [-8.0, -4.0, 137.0, 141.0],
];

// Coarse continental bounding boxes for fallback when a hotspot lies outside
// the Indonesian provinces lookup above. Format: [latMin, latMax, lonMin, lonMax, region, sub]
const CONTINENT_BOUNDS: [number, number, number, number, string, string][] = [
  [15, 72, -170, -50, "North America", "Continental US / Canada / Mexico"],
  [-55, 15, -82, -34, "South America", "Brazil / Andes / Patagonia"],
  [35, 72, -10, 40, "Europe", "Western / Central Europe"],
  [35, 72, 40, 60, "Europe", "Eastern Europe / Western Russia"],
  [-35, 37, -20, 52, "Africa", "Continental Africa"],
  [-50, 0, 110, 180, "Oceania", "Australia / New Zealand / Pacific"],
  [0, 72, 40, 95, "Asia (West/South)", "South Asia / Middle East"],
  [0, 72, 95, 141, "Asia (East)", "China / Japan / SE Asia mainland"],
  [0, 72, 141, 180, "Asia (Far East)", "Far East Russia / North Pacific"],
];

function lookupRegion(lat: number, lon: number): [string, string] {
  // Indonesia detail first (these bounds overlap with Asia continental box but
  // are more specific, so they win).
  for (const [latMin, latMax, lonMin, lonMax, province, regency] of PROVINCE_BOUNDS) {
    if (lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax) {
      return [province, regency];
    }
  }
  for (const [latMin, latMax, lonMin, lonMax, region, sub] of CONTINENT_BOUNDS) {
    if (lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax) {
      return [region, sub];
    }
  }
  return ["International", "Unclassified region"];
}

function isPeatland(lat: number, lon: number): boolean {
  return PEATLAND_ZONES.some(
    ([latMin, latMax, lonMin, lonMax]) =>
      lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax
  );
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function normalizeConfidence(raw: string): number {
  const lower = raw.trim().toLowerCase();
  if (lower === "high") return 90;
  if (lower === "nominal" || lower === "n") return 65;
  if (lower === "low" || lower === "l") return 40;
  const n = parseInt(raw, 10);
  return isNaN(n) ? 60 : Math.max(0, Math.min(100, n));
}

function scoreFrp(frp: number): number {
  if (frp <= 0) return 10;
  return Math.min(100, (Math.log10(Math.max(frp, 1)) / Math.log10(200)) * 100);
}

function scoreBrightness(b: number): number {
  return Math.max(0, Math.min(100, ((b - 300) / (400 - 300)) * 100));
}

function computeRiskScore(frp: number, brightness: number, confidence: number): number {
  const frpS = scoreFrp(frp);
  const brightS = scoreBrightness(brightness);
  const confS = confidence;
  return Math.round(frpS * 0.45 + brightS * 0.30 + confS * 0.25);
}

function classifySeverity(score: number): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function buildEnvLabel(score: number, peat: boolean, frp: number): string {
  if (peat && score >= 80) return "Peatland fire — extreme carbon release risk";
  if (peat && score >= 60) return "Active peatland fire — monitoring required";
  if (peat) return "Low FRP — possible smoldering peat";
  if (score >= 80) return "High-intensity fire — settlement proximity risk";
  if (frp < 25) return "Low FRP — possible smoldering vegetation";
  return "Active burn zone — standard monitoring";
}

function smokeImpact(score: number, peat: boolean): string {
  if (score >= 80 || (peat && score >= 60)) return "severe";
  if (score >= 65) return "high";
  if (score >= 50) return "moderate";
  if (score >= 35) return "low";
  return "minimal";
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseFirmsCsv(csv: string): ScoredHotspot[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const results: ScoredHotspot[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = lines[i].split(",");
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx]?.trim() ?? "";
      });

      const lat = parseFloat(row.latitude);
      const lon = parseFloat(row.longitude);
      if (isNaN(lat) || isNaN(lon)) continue;

      // Sanity-check global bounds (some FIRMS rows have malformed coords).
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

      const brightnessRaw = row.brightness ?? row.bright_ti4 ?? "300";
      const brightness = parseFloat(brightnessRaw) || 300;
      const frp = parseFloat(row.frp) || 0;
      const confidence = normalizeConfidence(row.confidence ?? "60");
      const satellite = row.satellite ?? row.instrument ?? "VIIRS";
      const acqDate = row.acq_date ?? "unknown";

      const [province, regency] = lookupRegion(lat, lon);
      const peat = isPeatland(lat, lon);
      const riskScore = computeRiskScore(frp, brightness, confidence);
      const severity = classifySeverity(riskScore);

      results.push({
        id: `FIRMS-${i.toString().padStart(4, "0")}`,
        lat: Math.round(lat * 10000) / 10000,
        lon: Math.round(lon * 10000) / 10000,
        severity,
        risk_score: riskScore,
        brightness: Math.round(brightness * 10) / 10,
        frp: Math.round(frp * 10) / 10,
        confidence,
        satellite,
        acq_date: acqDate,
        province,
        regency,
        environmental_label: buildEnvLabel(riskScore, peat, frp),
        smoke_impact: smokeImpact(riskScore, peat),
      });
    } catch {
      // skip malformed rows silently
    }
  }

  // Sort by risk_score descending, cap at MAX_GLOBAL_HOTSPOTS so the
  // browser doesn't try to render thousands of markers worldwide.
  return results
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, MAX_GLOBAL_HOTSPOTS);
}

// ─── Summary builder ──────────────────────────────────────────────────────────

function buildSummary(hotspots: ScoredHotspot[]) {
  const counts = { total: hotspots.length, critical: 0, high: 0, medium: 0, low: 0 };
  const frps = hotspots.map((h) => h.frp).filter((f) => f > 0);
  const provinces = [...new Set(hotspots.map((h) => h.province))];

  for (const h of hotspots) {
    if (h.severity === "CRITICAL") counts.critical++;
    else if (h.severity === "HIGH") counts.high++;
    else if (h.severity === "MEDIUM") counts.medium++;
    else counts.low++;
  }

  return {
    ...counts,
    avg_frp: frps.length ? Math.round((frps.reduce((a, b) => a + b, 0) / frps.length) * 10) / 10 : 0,
    max_frp: frps.length ? Math.max(...frps) : 0,
    satellites_used: [...new Set(hotspots.map((h) => h.satellite))],
    provinces_affected: provinces.slice(0, 8),
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  // Check cache
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  if (!MAP_KEY) {
    return NextResponse.json(
      { error: "NASA_FIRMS_MAP_KEY not configured in environment." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(FIRMS_URL, {
      headers: { "User-Agent": "NusaSiaga/2.0 disaster-intelligence" },
      next: { revalidate: 1800 }, // Next.js cache 30 min
    });

    if (!response.ok) {
      throw new Error(`FIRMS API responded with ${response.status}`);
    }

    const csvText = await response.text();

    // NASA returns "Invalid MAP_KEY" as plain text on auth failure
    if (csvText.includes("Invalid") || csvText.includes("Error")) {
      throw new Error(`FIRMS API error: ${csvText.slice(0, 100)}`);
    }

    const hotspots = parseFirmsCsv(csvText);
    const summary = buildSummary(hotspots);

    const payload = {
      source: "firms-live" as const,
      fetched_at: new Date().toISOString(),
      summary,
      hotspots,
    };

    // Update cache
    cache = { data: payload, fetchedAt: Date.now() };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("[NusaSiaga] FIRMS fetch failed:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch NASA FIRMS data.",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
