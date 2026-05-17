"use client";

import { useState, type ReactNode } from "react";
import { Flame, ShieldCheck } from "lucide-react";

type Props = {
  /** Pre-rendered WildfireView (carries server-fetched FIRMS data as props). */
  wildfire: ReactNode;
  /** Pre-rendered triage-operations content (FloodView with scenario A). */
  triageOperations: ReactNode;
};

type Mode = "triage" | "wildfire";

/**
 * Top-level dashboard frame. Two modes:
 *
 *   1. "triage" (default) — Scenario A's flood synthesis panel + the unified
 *      operational map showing every scenario's pre-baked reports merged
 *      with live phone uploads, filterable by disaster-type chips.
 *
 *   2. "wildfire" — global NASA FIRMS satellite hotspot view.
 *
 * The user used to be able to switch between four scenario views via a
 * dropdown. We removed that: the unified map already combines reports
 * across all three triage scenarios, so the dropdown was redundant. The
 * remaining axis worth surfacing is satellite vs. on-device intelligence —
 * those are different data sources and the user does want to choose.
 */
export function UnifiedDashboard({ wildfire, triageOperations }: Props) {
  const [mode, setMode] = useState<Mode>("triage");

  return (
    <>
      <nav
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        aria-label="Dashboard mode"
      >
        <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-slate-400">
          {mode === "triage" ? (
            <>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Edge triage operations</span>
            </>
          ) : (
            <>
              <Flame className="h-4 w-4 text-orange-400" />
              <span>Satellite wildfire monitoring</span>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <ModeButton
            active={mode === "triage"}
            onClick={() => setMode("triage")}
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Triage operations"
            accent="emerald"
          />
          <ModeButton
            active={mode === "wildfire"}
            onClick={() => setMode("wildfire")}
            icon={<Flame className="h-4 w-4" />}
            label="Wildfire monitoring"
            accent="orange"
          />
        </div>
      </nav>

      {/*
        Both modes are kept mounted (one hidden) so switching is instant
        and component-internal state — recorded voice clips, map zoom, the
        live-reports polling cycle — survives a toggle.
      */}
      <div hidden={mode !== "triage"}>{triageOperations}</div>
      <div hidden={mode !== "wildfire"}>{wildfire}</div>
    </>
  );
}

type Accent = "emerald" | "orange";

function ModeButton({
  active,
  onClick,
  icon,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  accent: Accent;
}) {
  const activeClasses =
    accent === "emerald"
      ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-100 shadow-emerald-500/20"
      : "border-orange-400/60 bg-orange-400/15 text-orange-100 shadow-orange-500/20";
  const idleClasses =
    "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition shadow-sm " +
        (active ? activeClasses : idleClasses)
      }
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
