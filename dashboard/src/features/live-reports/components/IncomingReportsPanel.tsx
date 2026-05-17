"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  useLiveReports,
  RESOLVE_VOTE_THRESHOLD,
  type LiveReport,
} from "@/lib/use-live-reports";
import type { DisasterType } from "@/lib/types";

const COLLAPSED_PAGE_SIZE = 5;

type IncomingReportsPanelProps = {
  /**
   * Optionally filter to reports whose disaster_type matches the active
   * scenario. If omitted, shows every incoming report regardless of type.
   */
  filterDisasterTypes?: DisasterType[];
  /** Display title above the panel. */
  title?: string;
};

/**
 * Live feed of EdgeTriageReports uploaded from the field-responder phone(s).
 * Polls /api/reports every 10 seconds. Renders nothing useful (just a quiet
 * "waiting for reports" line) when the feed is empty — the panel is meant to
 * complement the pre-curated synthesis, not replace it.
 */
export function IncomingReportsPanel({
  filterDisasterTypes,
  title = "Live field reports",
}: IncomingReportsPanelProps) {
  const { reports, loading, error, lastFetchedAt, voteToResolve } =
    useLiveReports();
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const base = filterDisasterTypes
      ? reports.filter((r) => filterDisasterTypes.includes(r.disaster_type))
      : reports;
    // Sort: active first (newest first), then resolved (most recently
    // resolved first). The newest active report is what an operator
    // wants to see at a glance.
    return [...base].sort((a, b) => {
      const aActive = (a._status ?? "active") === "active";
      const bActive = (b._status ?? "active") === "active";
      if (aActive !== bActive) return aActive ? -1 : 1;
      return b._received_at.localeCompare(a._received_at);
    });
  }, [reports, filterDisasterTypes]);

  const activeCount = filtered.filter(
    (r) => (r._status ?? "active") === "active",
  ).length;

  const displayed = expanded
    ? filtered
    : filtered.slice(0, COLLAPSED_PAGE_SIZE);
  const hiddenCount = filtered.length - displayed.length;

  return (
    <section className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5">
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
          </span>
          <Radio className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-emerald-100">{title}</h3>
          {filtered.length > 0 && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-200">
              {activeCount === filtered.length
                ? filtered.length
                : `${activeCount} active · ${filtered.length} total`}
            </span>
          )}
        </div>
        <div className="text-xs text-emerald-300/60">
          {error ? (
            <span className="text-amber-300">connection issue</span>
          ) : loading && !lastFetchedAt ? (
            "connecting..."
          ) : (
            <span>polling /api/reports</span>
          )}
        </div>
      </header>

      {filtered.length === 0 ? (
        <p className="text-sm text-emerald-200/70">
          {error
            ? "Reading /api/reports failed. Verify Redis is provisioned and TRIAGE_INGEST_TOKEN is set."
            : "No live reports yet. Reports uploaded from the Android edge app will appear here within ~10 seconds."}
        </p>
      ) : (
        <>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {displayed.map((report) => (
                <motion.div
                  key={report.report_id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25 }}
                >
                  <LiveReportCard
                    report={report}
                    onVote={() => voteToResolve(report.report_id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {(hiddenCount > 0 || expanded) && filtered.length > COLLAPSED_PAGE_SIZE && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-950/60"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Collapse to {COLLAPSED_PAGE_SIZE} most recent
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show all {filtered.length} reports ({hiddenCount} hidden)
                </>
              )}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function LiveReportCard({
  report,
  onVote,
}: {
  report: LiveReport;
  onVote: () => Promise<{
    ok: boolean;
    vote_count: number;
    already_voted: boolean;
    flipped_to_ended: boolean;
  }>;
}) {
  const [isVoting, setIsVoting] = useState(false);
  const isEnded = (report._status ?? "active") === "ended";
  const voteCount = report._resolve_votes?.length ?? 0;
  const resolvedBy = report._resolved_by ?? null;
  const severityColor = severityToColor(report.severity);
  const ago = relativeTime(report._received_at);
  const people = report.people_visible;
  const peopleSummary = [
    people.adults > 0 ? `${people.adults} adult${people.adults === 1 ? "" : "s"}` : null,
    people.children > 0
      ? `${people.children} child${people.children === 1 ? "" : "ren"}`
      : null,
    people.elderly_apparent > 0 ? `${people.elderly_apparent} elderly` : null,
    people.injured_apparent > 0 ? `${people.injured_apparent} injured` : null,
    people.trapped_apparent > 0 ? `${people.trapped_apparent} trapped` : null,
  ]
    .filter((s): s is string => s !== null)
    .join(" · ");

  return (
    <article
      className={
        "rounded-lg border p-4 transition " +
        (isEnded
          ? "border-slate-700/40 bg-slate-900/30 opacity-60"
          : "border-emerald-700/40 bg-slate-900/60")
      }
    >
      <header className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {isEnded ? (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-slate-600 text-white">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white ${severityColor}`}
            >
              {report.severity}
            </span>
          )}
          <span
            className={
              "text-sm font-semibold capitalize " +
              (isEnded ? "text-slate-400 line-through" : "text-slate-100")
            }
          >
            {report.disaster_type.replace(/_/g, " ")}
          </span>
          {isEnded ? (
            <span className="rounded bg-slate-600/30 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-300">
              RESOLVED
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              confidence {Math.round(report.disaster_type_confidence * 100)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          <span>{ago}</span>
        </div>
      </header>

      <p className="text-sm text-slate-200 leading-snug mb-2">
        {report.severity_rationale}
      </p>

      {report.hazards_visible.length > 0 && (
        <div className="flex items-start gap-1.5 mb-2">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
          <div className="flex flex-wrap gap-1.5">
            {report.hazards_visible.map((hazard, i) => (
              <span
                key={i}
                className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-200"
              >
                {hazard}
              </span>
            ))}
          </div>
        </div>
      )}

      {peopleSummary && (
        <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-2">
          <Users className="h-3 w-3" />
          <span>{peopleSummary}</span>
        </div>
      )}

      <div className="rounded bg-slate-800/60 px-3 py-2 mt-2">
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-0.5">
          Immediate action
        </div>
        <div className="text-sm text-slate-100">{report.immediate_action}</div>
      </div>

      <footer className="flex items-center justify-between gap-2 mt-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <MapPin className="h-3 w-3" />
          <span>
            {report.location?.label ??
              (report.location?.lat != null && report.location?.lon != null
                ? `${report.location.lat.toFixed(4)}, ${report.location.lon.toFixed(4)}`
                : "location not provided")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 font-medium ${
              isEnded
                ? "bg-slate-600/20 text-slate-400"
                : report.routing_recommendation === "deep_lane"
                  ? "bg-orange-500/20 text-orange-200"
                  : "bg-emerald-500/20 text-emerald-200"
            }`}
          >
            {report.routing_recommendation === "deep_lane"
              ? "DEEP LANE"
              : "FAST LANE"}
          </span>
          {isEnded ? (
            <span className="text-[10px] text-slate-500">
              Resolved
              {resolvedBy ? ` (${resolvedBy})` : ""}
              {report._resolved_at
                ? ` ${relativeTime(report._resolved_at)}`
                : ""}
            </span>
          ) : (
            <button
              type="button"
              disabled={isVoting}
              onClick={async () => {
                setIsVoting(true);
                const res = await onVote();
                // Whether the vote succeeded or not, we let the hook's
                // optimistic update + the next polling cycle settle the
                // card; just clear the local in-flight flag.
                setIsVoting(false);
                if (res.already_voted) {
                  // The hook didn't show a re-update because it's
                  // already-voted; we don't need to do anything else.
                }
              }}
              className="inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50"
              title={
                voteCount > 0
                  ? `${voteCount} of ${RESOLVE_VOTE_THRESHOLD} votes cast`
                  : "Vote to mark this report resolved"
              }
            >
              <Check className="h-3 w-3" />
              {isVoting
                ? "Voting…"
                : `Vote to resolve (${voteCount}/${RESOLVE_VOTE_THRESHOLD})`}
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

function severityToColor(severity: number): string {
  switch (severity) {
    case 1:
      return "bg-emerald-600";
    case 2:
      return "bg-lime-600";
    case 3:
      return "bg-amber-600";
    case 4:
      return "bg-orange-600";
    case 5:
      return "bg-red-700";
    default:
      return "bg-slate-600";
  }
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(iso).toLocaleString();
}
