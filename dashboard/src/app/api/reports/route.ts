/**
 * /api/reports — the bridge between the Android edge tier and the
 * NusaSiaga dashboard.
 *
 *   POST  /api/reports          ingest one EdgeTriageReport (phone -> here)
 *   GET   /api/reports          read recent reports (here -> dashboard)
 *   GET   /api/reports?since=…  only reports received after a given ISO time
 *
 * Storage: Upstash Redis (provisioned via Vercel Marketplace, env vars
 * auto-injected). Reports are stored as a list keyed by REPORTS_KEY; newest
 * at index 0, trimmed to MAX_REPORTS.
 *
 * Auth: POST requires an `x-triage-token` header matching the server-side
 * TRIAGE_INGEST_TOKEN env var. GET is public — the dashboard browser would
 * leak any header anyway, and triage reports are not sensitive data.
 */

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import type { EdgeTriageReport } from "@/lib/types";

const REPORTS_KEY = "grg:reports";
const MAX_REPORTS = 500;

export type ReportStatus = "active" | "ended";

export type StoredReport = EdgeTriageReport & {
  _received_at: string;
  /** "active" by default; flipped to "ended" via PATCH /api/reports/[id]. */
  _status?: ReportStatus;
  /** ISO timestamp set when _status flipped to "ended". */
  _resolved_at?: string | null;
};

/**
 * Server-side reverse geocoding via BigDataCloud's free no-key endpoint.
 * Used to recover a human-readable label when the phone uploaded a report
 * with lat/lon but a null label (typical when the phone-side `Geocoder`
 * failed for lack of connectivity at triage time).
 *
 * Returns `null` if the lookup fails or no useful fields come back.
 */
async function reverseGeocodeLabel(
  lat: number,
  lon: number,
): Promise<string | null> {
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    };
    const parts = [
      data.city || data.locality,
      data.principalSubdivision,
      data.countryName,
    ].filter((s) => typeof s === "string" && s.length > 0);
    return parts.length > 0 ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

// Lazy-init so local dev without Redis env vars doesn't crash.
//
// The Vercel Marketplace Upstash integration injects env vars named
// KV_REST_API_URL / KV_REST_API_TOKEN (backwards-compatible with the old
// @vercel/kv SDK). The @upstash/redis SDK's Redis.fromEnv() reads
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. We try fromEnv first
// for users who manually set the canonical names, then fall back to the
// KV_* names the Vercel integration provides.
let cached: Redis | null | undefined = undefined;
function getRedis(): Redis | null {
  if (cached !== undefined) return cached;
  // Try the @upstash/redis canonical env names first.
  try {
    cached = Redis.fromEnv();
    return cached;
  } catch {
    // fall through to KV_* names below
  }
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  cached = url && token ? new Redis({ url, token }) : null;
  return cached;
}

function isValidReport(obj: unknown): obj is EdgeTriageReport {
  if (typeof obj !== "object" || obj === null) return false;
  const r = obj as Record<string, unknown>;
  if (typeof r.report_id !== "string" || !r.report_id) return false;
  if (typeof r.disaster_type !== "string") return false;
  if (typeof r.severity !== "number" || r.severity < 1 || r.severity > 5) {
    return false;
  }
  if (typeof r.severity_rationale !== "string") return false;
  if (typeof r.immediate_action !== "string") return false;
  if (typeof r.routing_recommendation !== "string") return false;
  if (!Array.isArray(r.hazards_visible)) return false;
  if (typeof r.people_visible !== "object" || r.people_visible === null) {
    return false;
  }
  return true;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expectedToken = process.env.TRIAGE_INGEST_TOKEN ?? "";
  if (!expectedToken) {
    return NextResponse.json(
      { error: "server misconfigured: TRIAGE_INGEST_TOKEN not set" },
      { status: 500 },
    );
  }

  const providedToken = req.headers.get("x-triage-token");
  if (providedToken !== expectedToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!isValidReport(body)) {
    return NextResponse.json(
      { error: "schema mismatch — does not match EdgeTriageReport" },
      { status: 422 },
    );
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "storage not configured (Redis env vars missing)" },
      { status: 503 },
    );
  }

  const report = body;
  const received_at = new Date().toISOString();

  // If the phone uploaded a lat/lon without a label (e.g. it was offline at
  // triage time and the platform Geocoder couldn't reach Google's service),
  // try to fill the label server-side. Best-effort — falls through to no
  // label on any failure rather than rejecting the upload.
  let label = report.location?.label ?? null;
  const lat = report.location?.lat;
  const lon = report.location?.lon;
  if (
    (label === null || label === "") &&
    typeof lat === "number" &&
    typeof lon === "number"
  ) {
    label = await reverseGeocodeLabel(lat, lon);
  }

  const stored: StoredReport = {
    ...report,
    location: {
      ...report.location,
      label: label ?? report.location?.label ?? null,
    },
    _received_at: received_at,
    _status: "active",
    _resolved_at: null,
  };

  // QR-mesh duplicate guard. If the same report_id is already in Redis,
  // skip the LPUSH so the bounded list (MAX_REPORTS) doesn't burn slots
  // on duplicates. The originator and N peer relays can all POST the
  // same report_id over time; we treat them as idempotent.
  try {
    const existing = await redis.lrange(REPORTS_KEY, 0, MAX_REPORTS - 1);
    for (const raw of existing) {
      let entry: { report_id?: unknown } | null = null;
      if (typeof raw === "string") {
        try {
          entry = JSON.parse(raw);
        } catch {
          continue;
        }
      } else if (typeof raw === "object" && raw !== null) {
        entry = raw as { report_id?: unknown };
      }
      if (entry?.report_id === report.report_id) {
        return NextResponse.json({
          ok: true,
          report_id: report.report_id,
          duplicate: true,
          received_at, // not actually stored; returned for client UX symmetry
        });
      }
    }
  } catch (e) {
    // Dedup check failure shouldn't block the write — fall through to LPUSH.
    console.warn("Redis dedup scan failed; proceeding with insert", e);
  }

  try {
    await redis.lpush(REPORTS_KEY, JSON.stringify(stored));
    await redis.ltrim(REPORTS_KEY, 0, MAX_REPORTS - 1);
  } catch (e) {
    console.error("Redis write failed", e);
    return NextResponse.json({ error: "storage write failed" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    report_id: report.report_id,
    received_at,
    resolved_label: label,
    duplicate: false,
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limitParam = parseInt(url.searchParams.get("limit") ?? "100", 10);
  const limit = Math.min(
    Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 100,
    MAX_REPORTS,
  );
  const since = url.searchParams.get("since");

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({
      reports: [],
      count: 0,
      fetched_at: new Date().toISOString(),
      note: "storage not configured",
    });
  }

  let items: StoredReport[] = [];
  try {
    const raw = await redis.lrange(REPORTS_KEY, 0, limit - 1);
    items = raw
      .map((s): StoredReport | null => {
        if (typeof s === "string") {
          try {
            return JSON.parse(s) as StoredReport;
          } catch {
            return null;
          }
        }
        // Upstash REST occasionally returns parsed objects already.
        return s as StoredReport;
      })
      .filter((r): r is StoredReport => r !== null);
  } catch (e) {
    console.error("Redis read failed", e);
    return NextResponse.json(
      { error: "storage read failed", reports: [], count: 0 },
      { status: 503 },
    );
  }

  if (since) {
    items = items.filter((r) => r._received_at > since);
  }

  return NextResponse.json({
    reports: items,
    count: items.length,
    fetched_at: new Date().toISOString(),
  });
}
