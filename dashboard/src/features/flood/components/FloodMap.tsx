"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useFloodScenario } from "./FloodScenarioContext";
import { FloodMapLegend } from "./FloodMapLegend";
import type { DisasterType } from "@/lib/types";

const FloodMapClient = dynamic(
  () => import("./FloodMapClient").then((mod) => mod.FloodMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] w-full items-center justify-center bg-slate-900 text-sm text-slate-400">
        Loading operational map...
      </div>
    ),
  },
);

type DisasterFilter = DisasterType | "all";

/**
 * Filter options for the operational map. "all" shows everything, and the
 * rest map to a single EdgeTriageReport.disaster_type value. Order = display
 * order in the chip bar.
 */
const FILTER_OPTIONS: Array<{ id: DisasterFilter; label: string; emoji: string }> = [
  { id: "all", label: "All", emoji: "🌐" },
  { id: "flood", label: "Flood", emoji: "🌊" },
  { id: "earthquake", label: "Earthquake", emoji: "🏚️" },
  { id: "fire", label: "Fire", emoji: "🔥" },
  { id: "storm", label: "Storm", emoji: "🌀" },
  { id: "tsunami", label: "Tsunami", emoji: "🌊" },
  { id: "landslide", label: "Landslide", emoji: "⛰️" },
  { id: "volcanic", label: "Volcanic", emoji: "🌋" },
  { id: "building_collapse", label: "Building collapse", emoji: "🏗️" },
  { id: "other", label: "Other", emoji: "❓" },
];

export function FloodMap() {
  const { scenario } = useFloodScenario();
  const reports = scenario.reports;
  const synthesis = scenario.synthesis;
  const [filter, setFilter] = useState<DisasterFilter>("all");

  const immediateZones =
    synthesis?.priority_zones.filter((z) => z.evacuation_priority === "immediate")
      .length ?? 0;

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Operational map</h2>
          <p className="mt-1 text-sm text-slate-400">
            All EdgeTriageReports plotted: pre-baked scenario reports plus
            anything streaming in live from responder phones, anywhere on the planet.
            Filter by disaster type to focus.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm text-sky-200">
            Synthesis below: {scenario.shortLabel} · {reports.length} reports
          </div>
          {immediateZones > 0 && (
            <div className="rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              {immediateZones} immediate-evac zone{immediateZones === 1 ? "" : "s"}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              aria-pressed={isActive}
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition " +
                (isActive
                  ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-100"
                  : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10")
              }
            >
              <span aria-hidden="true">{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          <FloodMapClient filter={filter} />
        </div>

        <div className="space-y-4">
          <FloodMapLegend />
          <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4 text-sm text-sky-100">
            Each solid marker is a pre-baked scenario report. Pulsing rings are
            live reports streaming in from responder phones — those appear here
            within ~10 seconds of upload. Use the filter chips above to narrow
            by disaster type; click <strong>Fit to all</strong> on the map to
            zoom out to the worldwide extent.
          </div>
        </div>
      </div>
    </section>
  );
}
