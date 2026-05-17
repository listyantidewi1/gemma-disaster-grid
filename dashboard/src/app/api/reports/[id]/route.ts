/**
 * /api/reports/[id] — per-report endpoint for status changes.
 *
 *   PATCH /api/reports/<report_id>
 *   header: X-Triage-Token: <secret>
 *   body:   { "status": "ended" }
 *
 * Currently the only supported mutation is setting status to "ended"
 * (a responder marking the incident resolved). The endpoint walks the
 * Redis list at REPORTS_KEY, finds the entry whose report_id matches,
 * mutates `_status` + `_resolved_at`, and writes it back in place via
 * LSET. O(N) scan, but N is bounded to MAX_REPORTS in the parent route.
 *
 * Auth uses the same shared-secret header as POST /api/reports — a random
 * visitor on the dashboard shouldn't be able to mark every incident
 * resolved.
 */

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const REPORTS_KEY = "grg:reports";
const MAX_REPORTS = 500;

export const dynamic = "force-dynamic";

// Same lazy-init pattern as the parent route.
let cached: Redis | null | undefined = undefined;
function getRedis(): Redis | null {
  if (cached !== undefined) return cached;
  try {
    cached = Redis.fromEnv();
    return cached;
  } catch {
    // fall through
  }
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  cached = url && token ? new Redis({ url, token }) : null;
  return cached;
}

type PatchBody = {
  status?: "active" | "ended";
};

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "missing report id" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (body.status !== "active" && body.status !== "ended") {
    return NextResponse.json(
      { error: "status must be 'active' or 'ended'" },
      { status: 422 },
    );
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "storage not configured" },
      { status: 503 },
    );
  }

  let items: unknown[];
  try {
    items = await redis.lrange(REPORTS_KEY, 0, MAX_REPORTS - 1);
  } catch (e) {
    console.error("Redis lrange failed", e);
    return NextResponse.json({ error: "storage read failed" }, { status: 503 });
  }

  let foundIndex = -1;
  let foundEntry: Record<string, unknown> | null = null;
  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    let entry: Record<string, unknown> | null = null;
    if (typeof raw === "string") {
      try {
        entry = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        continue;
      }
    } else if (typeof raw === "object" && raw !== null) {
      entry = raw as Record<string, unknown>;
    }
    if (entry && entry.report_id === id) {
      foundIndex = i;
      foundEntry = entry;
      break;
    }
  }

  if (foundIndex < 0 || foundEntry === null) {
    return NextResponse.json({ error: "report not found" }, { status: 404 });
  }

  const updated = {
    ...foundEntry,
    _status: body.status,
    _resolved_at: body.status === "ended" ? new Date().toISOString() : null,
    // Resolved via the shared-secret PATCH path = the reporter (phone)
    // or an operator. Distinguishes from crowd votes via /vote.
    _resolved_by: body.status === "ended" ? "reporter" : null,
  };

  try {
    await redis.lset(REPORTS_KEY, foundIndex, JSON.stringify(updated));
  } catch (e) {
    console.error("Redis lset failed", e);
    return NextResponse.json({ error: "storage write failed" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    report_id: id,
    status: body.status,
    resolved_at: updated._resolved_at,
  });
}
