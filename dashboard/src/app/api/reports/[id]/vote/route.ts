/**
 * POST /api/reports/<report_id>/vote
 *
 *   body: { "voter_id": "<opaque string>" }
 *
 * Crowd-resolution endpoint. Dashboard viewers, who have no shared
 * secret, can each cast one vote toward marking a report as ended.
 * When the unique-voter count reaches RESOLVE_THRESHOLD, the entry
 * flips _status to "ended" with _resolved_by = "crowd".
 *
 * The voter_id is generated client-side and persisted in localStorage,
 * so a single browser counts once across reloads but a determined
 * attacker can generate fresh IDs. That's acceptable for the demo
 * (worst case: spam-resolution, reversible by an authenticated
 * PATCH /api/reports/<id> from a reporter or operator). Production
 * would add server-side rate limiting + captcha + signed voter IDs.
 *
 * No X-Triage-Token required — the threshold IS the auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const REPORTS_KEY = "grg:reports";
const MAX_REPORTS = 500;
const RESOLVE_THRESHOLD = 5;

export const dynamic = "force-dynamic";

let cached: Redis | null | undefined = undefined;
function getRedis(): Redis | null {
  if (cached !== undefined) return cached;
  try {
    cached = Redis.fromEnv();
    return cached;
  } catch {
    // fall through
  }
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  cached = url && token ? new Redis({ url, token }) : null;
  return cached;
}

type VoteBody = { voter_id?: unknown };

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "missing report id" }, { status: 400 });
  }

  let body: VoteBody;
  try {
    body = (await req.json()) as VoteBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const voterId = body.voter_id;
  if (typeof voterId !== "string" || voterId.length === 0 || voterId.length > 128) {
    return NextResponse.json(
      { error: "voter_id must be a non-empty string <=128 chars" },
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

  // Existing votes, deduped. If we've already seen this voter_id we
  // don't re-flip status; we just return the current state so the
  // browser's optimistic update can re-converge.
  const rawVotes = Array.isArray(foundEntry._resolve_votes)
    ? (foundEntry._resolve_votes as unknown[])
    : [];
  const existing = new Set<string>(
    rawVotes.filter((v): v is string => typeof v === "string"),
  );
  const alreadyVoted = existing.has(voterId);
  if (!alreadyVoted) existing.add(voterId);
  const newVotes = Array.from(existing);

  // If the threshold is hit (or already exceeded), flip to ended.
  const previousStatus = (foundEntry._status as string | undefined) ?? "active";
  const reachedThreshold = newVotes.length >= RESOLVE_THRESHOLD;
  const updated: Record<string, unknown> = {
    ...foundEntry,
    _resolve_votes: newVotes,
  };
  if (reachedThreshold && previousStatus !== "ended") {
    updated._status = "ended";
    updated._resolved_at = new Date().toISOString();
    updated._resolved_by = "crowd";
  }

  try {
    await redis.lset(REPORTS_KEY, foundIndex, JSON.stringify(updated));
  } catch (e) {
    console.error("Redis lset failed", e);
    return NextResponse.json({ error: "storage write failed" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    report_id: id,
    vote_count: newVotes.length,
    threshold: RESOLVE_THRESHOLD,
    already_voted: alreadyVoted,
    status: updated._status ?? previousStatus,
    resolved_by: updated._resolved_by ?? null,
  });
}
