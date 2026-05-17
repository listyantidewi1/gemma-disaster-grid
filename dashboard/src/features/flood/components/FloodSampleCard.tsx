"use client";

import { AlertTriangle, Radio } from "lucide-react";
import { useFloodScenario } from "./FloodScenarioContext";
import { useLiveReports } from "@/lib/use-live-reports";
import type { EdgeTriageReport } from "@/lib/types";

/**
 * Featured triage report card. Two-tier source preference:
 *
 *   1. The highest-severity LIVE phone-uploaded EdgeTriageReport, if any
 *      are in the queue. That's what the platform is actually doing right
 *      now from the field — preferred whenever it exists.
 *   2. The most demonstrative report from the pre-baked active scenario
 *      (severity 4+ with a trapped person if available; else just the
 *      highest-severity one). That's our fallback when no live phone has
 *      uploaded yet — still real Gemma 4 output, just from the scenario set.
 *
 * The card title and source-of-truth label change so the viewer can tell
 * whether they're looking at live edge intelligence or a pre-baked one.
 */
export function FloodSampleCard() {
  const { scenario } = useFloodScenario();
  const { reports: liveReports } = useLiveReports();

  // Tier 1: highest-severity live report (then highest disaster_type_confidence
  // as a tiebreaker).
  const topLive: EdgeTriageReport | null =
    liveReports.length === 0
      ? null
      : [...liveReports].sort((a, b) => {
          if (b.severity !== a.severity) return b.severity - a.severity;
          return b.disaster_type_confidence - a.disaster_type_confidence;
        })[0];

  // Tier 2: scenario fallback.
  const topScenario: EdgeTriageReport =
    scenario.reports.find(
      (r) => r.severity >= 4 && r.people_visible.trapped_apparent > 0,
    ) ?? [...scenario.reports].sort((a, b) => b.severity - a.severity)[0];

  const featured = topLive ?? topScenario;
  const isLive = topLive != null;

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-red-950/70 to-slate-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        {isLive ? (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
          </span>
        ) : (
          <Radio className="h-4 w-4 text-slate-400" />
        )}
        <h3 className="text-xl font-bold">
          {isLive ? "Live field triage" : "Featured field triage"}
        </h3>
      </div>
      <div className="rounded-2xl border border-red-400/20 bg-black/30 p-5">
        <div className="mb-4 flex items-center gap-3 text-red-300">
          <AlertTriangle />
          <span className="font-semibold">
            Sev {featured.severity}
            {featured.location?.label ? ` · ${featured.location.label}` : ""}
          </span>
        </div>
        <p className="text-slate-300">
          &ldquo;{featured.severity_rationale}&rdquo;
        </p>
        <div className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-100">
          <span className="font-semibold">Immediate action:</span>{" "}
          {featured.immediate_action}
        </div>
        <div className="mt-3 text-[11px] text-slate-500">
          {isLive
            ? "Just uploaded from a field responder's phone — Gemma 4 E2B on-device via Google AI Edge LiteRT."
            : "Produced on-device by Gemma 4 E2B via Google AI Edge LiteRT, from the active scenario."}
        </div>
      </div>
    </div>
  );
}
