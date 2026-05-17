"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EdgeTriageReport } from "@/lib/types";

export type ReportStatus = "active" | "ended";
export type ResolvedBy = "reporter" | "crowd";

export const RESOLVE_VOTE_THRESHOLD = 5;

export type LiveReport = EdgeTriageReport & {
  _received_at: string;
  _status?: ReportStatus;
  _resolved_at?: string | null;
  _resolved_by?: ResolvedBy | null;
  /** Opaque voter IDs that have voted to resolve. The dashboard
   *  surfaces .length but never the IDs themselves. */
  _resolve_votes?: string[];
};

type VoteResult = {
  ok: boolean;
  vote_count: number;
  already_voted: boolean;
  flipped_to_ended: boolean;
};

type LiveReportsState = {
  reports: LiveReport[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: string | null;
  /**
   * Cast one vote toward resolving this report. The threshold for
   * flipping `_status` to "ended" is RESOLVE_VOTE_THRESHOLD votes from
   * distinct browser IDs. Optimistic — the local list increments
   * `_resolve_votes` immediately and flips to "ended" if the new count
   * crosses the threshold; reverts on server failure.
   */
  voteToResolve: (reportId: string) => Promise<VoteResult>;
};

/**
 * Polls /api/reports every `intervalMs` and returns the rolling list of
 * incoming edge-triage reports. New reports are merged at the head of the
 * existing list. Identical report_ids are deduplicated, keeping the
 * server-stamped _received_at.
 */
export function useLiveReports(intervalMs = 10_000): LiveReportsState {
  const [reports, setReports] = useState<LiveReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;

    async function fetchOnce() {
      try {
        const res = await fetch("/api/reports?limit=100", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = (await res.json()) as {
          reports: LiveReport[];
          fetched_at: string;
        };
        if (cancelled.current) return;

        // Deduplicate by report_id, keep newest _received_at first.
        const seen = new Set<string>();
        const merged: LiveReport[] = [];
        for (const r of json.reports ?? []) {
          if (!seen.has(r.report_id)) {
            seen.add(r.report_id);
            merged.push(r);
          }
        }
        setReports(merged);
        setLastFetchedAt(json.fetched_at);
        setError(null);
      } catch (e) {
        if (cancelled.current) return;
        setError(e instanceof Error ? e.message : "unknown error");
      } finally {
        if (!cancelled.current) setLoading(false);
      }
    }

    fetchOnce();
    const timer = setInterval(fetchOnce, intervalMs);
    return () => {
      cancelled.current = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  const voteToResolve = useCallback(
    async (reportId: string): Promise<VoteResult> => {
      const voterId = getOrCreateVoterId();
      const before = reports;

      // Optimistic update: increment local vote count and, if we cross
      // the threshold, flip _status to "ended" / _resolved_by "crowd".
      setReports((prev) =>
        prev.map((r) => {
          if (r.report_id !== reportId) return r;
          const existing = new Set(r._resolve_votes ?? []);
          if (existing.has(voterId)) return r; // idempotent locally
          existing.add(voterId);
          const newVotes = Array.from(existing);
          const reachedThreshold = newVotes.length >= RESOLVE_VOTE_THRESHOLD;
          return {
            ...r,
            _resolve_votes: newVotes,
            _status: reachedThreshold ? "ended" : r._status,
            _resolved_at:
              reachedThreshold && !r._resolved_at
                ? new Date().toISOString()
                : r._resolved_at,
            _resolved_by:
              reachedThreshold && !r._resolved_by ? "crowd" : r._resolved_by,
          };
        }),
      );

      try {
        const res = await fetch(
          `/api/reports/${encodeURIComponent(reportId)}/vote`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voter_id: voterId }),
          },
        );
        if (!res.ok) {
          setReports(before);
          return {
            ok: false,
            vote_count: 0,
            already_voted: false,
            flipped_to_ended: false,
          };
        }
        const data = (await res.json()) as {
          vote_count?: number;
          already_voted?: boolean;
          status?: string;
          resolved_by?: string | null;
        };
        return {
          ok: true,
          vote_count: data.vote_count ?? 0,
          already_voted: data.already_voted ?? false,
          flipped_to_ended: data.status === "ended",
        };
      } catch {
        setReports(before);
        return {
          ok: false,
          vote_count: 0,
          already_voted: false,
          flipped_to_ended: false,
        };
      }
    },
    [reports],
  );

  return { reports, loading, error, lastFetchedAt, voteToResolve };
}

/**
 * Generate-or-retrieve an opaque per-browser voter ID, stored in
 * localStorage so a refresh doesn't reset the vote count. Each browser
 * counts as one vote; a determined attacker can fabricate fresh IDs by
 * clearing storage, which is fine for the hackathon trust model
 * (worst-case spam is reversible by a reporter PATCH).
 */
function getOrCreateVoterId(): string {
  if (typeof window === "undefined") return "ssr-no-voter";
  const KEY = "grg.voter_id";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `grg-${crypto.randomUUID()}`
        : `grg-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
