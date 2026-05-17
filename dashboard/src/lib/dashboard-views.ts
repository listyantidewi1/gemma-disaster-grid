/**
 * Unified dashboard view catalog.
 *
 * Each entry is one selectable "incident" or data source the user can
 * switch between via the top-level DashboardViewPicker. This replaces
 * the old two-tab (Wildfire / Flood) navigation with a single
 * disaster-type-aware picker.
 *
 * View types:
 *   - "wildfire-firms": NASA FIRMS live satellite hotspot data
 *   - "scenario": A Gemma 4 synthesis demo over a curated set of
 *     EdgeTriageReports (Jakarta flood / Cianjur quake / compound)
 *
 * Adding a future disaster scenario (e.g. wildfire user-reports, tsunami,
 * landslide) means adding a new entry here and the data file under lib/.
 */

import type { ScenarioId } from "./scenarios";

export type DashboardViewId =
  | "wildfire-firms"
  | "scenario-a"
  | "scenario-b"
  | "scenario-c";

export type ViewKind = "wildfire-firms" | "scenario";

export interface DashboardView {
  id: DashboardViewId;
  kind: ViewKind;
  scenarioId?: ScenarioId; // present when kind === "scenario"
  emoji: string;           // shown in the picker pill
  shortLabel: string;      // shown in the picker pill: "Wildfire Monitoring"
  longLabel: string;       // shown in the dropdown row: "Wildfire · Live NASA FIRMS satellite hotspots"
  description: string;     // sub-text in the dropdown row
  status: "live" | "ready" | "pending";
  statusLabel: string;     // "Live", "Synthesis ready", "Synthesis pending"
}

export const DASHBOARD_VIEWS: Record<DashboardViewId, DashboardView> = {
  "wildfire-firms": {
    id: "wildfire-firms",
    kind: "wildfire-firms",
    emoji: "🔥",
    shortLabel: "Wildfire",
    longLabel: "Wildfire",
    description:
      "Live NASA FIRMS VIIRS satellite hotspot data, refreshed every 30 minutes. FRP-weighted risk scoring + regional classification.",
    status: "live",
    statusLabel: "Live",
  },
  "scenario-a": {
    id: "scenario-a",
    kind: "scenario",
    scenarioId: "A",
    emoji: "🌊",
    shortLabel: "Flood",
    longLabel: "Flood",
    description:
      "Rapid-onset flood · 12 EdgeTriageReports across a 90-minute window. Full Gemma 4 synthesis: 5 priority zones, 3 ranked actions, validity flags.",
    status: "ready",
    statusLabel: "Synthesis ready",
  },
  "scenario-b": {
    id: "scenario-b",
    kind: "scenario",
    scenarioId: "B",
    emoji: "🏚️",
    shortLabel: "Earthquake",
    longLabel: "Earthquake",
    description:
      "Simulated shallow earthquake · 15 reports across 2 hours. Three severity-5 incidents, school evacuation, hospital patient carry, gas leak, low-confidence ambiguity case.",
    status: "pending",
    statusLabel: "Synthesis pending",
  },
  "scenario-c": {
    id: "scenario-c",
    kind: "scenario",
    scenarioId: "C",
    emoji: "⚡",
    shortLabel: "Industrial Fire",
    longLabel: "Industrial Fire",
    description:
      "Floodwater + transformer fires in an industrial zone · 8 reports in a 60-minute window. Reports deliberately disagree on primary disaster type — synthesis produces a compound classification.",
    status: "pending",
    statusLabel: "Synthesis pending",
  },
};

export const VIEW_ORDER: DashboardViewId[] = [
  "wildfire-firms",
  "scenario-a",
  "scenario-b",
  "scenario-c",
];

/**
 * Future disaster types we want to support but have no scenarios for yet.
 * Surfaced in the dropdown footer so judges see the platform's scope.
 */
export const PLANNED_DISASTER_TYPES = [
  { emoji: "🌋", label: "Volcanic" },
  { emoji: "🌊", label: "Tsunami" },
  { emoji: "⛰️", label: "Landslide" },
  { emoji: "🌪️", label: "Storm" },
  { emoji: "🏗️", label: "Building Collapse" },
];
