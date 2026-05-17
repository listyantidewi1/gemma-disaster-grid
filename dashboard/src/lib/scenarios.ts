/**
 * Disaster scenario catalog.
 *
 * Three curated scenarios live as JSON files alongside this one, each
 * containing an array of EdgeTriageReport objects. All three have been
 * through Gemma 4 31B synthesis on Kaggle 2× T4 — the resulting
 * CommandCenterSynthesis modules are imported below.
 *
 * The dashboard uses `SCENARIOS` to populate the scenario picker and
 * to look up the active scenario's reports + synthesis.
 */

import type {
  CommandCenterSynthesis,
  EdgeTriageReport,
} from "./types";
import { scenarioASynthesis } from "./synthesis-scenario-a";
import { scenarioBSynthesis } from "./synthesis-scenario-b";
import { scenarioCSynthesis } from "./synthesis-scenario-c";

import scenarioAJson from "./scenario_a_jakarta_flood.json";
import scenarioBJson from "./scenario_b_cianjur_quake.json";
import scenarioCJson from "./scenario_c_compound_flood_fire.json";

export type ScenarioId = "A" | "B" | "C";

export type SynthesisStatus = "generated" | "pending";

export interface ScenarioBundle {
  id: ScenarioId;
  shortLabel: string;          // "Jakarta flood" — what shows on the picker pill
  title: string;               // "Scenario A — Rapid-onset Jakarta flood"
  description: string;         // One-line context
  reports: EdgeTriageReport[];
  synthesis: CommandCenterSynthesis | null;
  synthesisStatus: SynthesisStatus;
  synthesisGeneratedBy: string;   // e.g. "Gemma 4 E4B on Colab, 2026-05-13"
  mapCenter: [number, number];    // [lat, lon] for the map view
  mapZoom: number;
}

export const SCENARIOS: Record<ScenarioId, ScenarioBundle> = {
  A: {
    id: "A",
    shortLabel: "Flood",
    title: "Rapid-onset flood",
    description:
      "12 field reports across a 90-minute window. Mid-difficulty: multiple priority zones, recurring electrical hazards, one elderly evacuation, one possible trapped rider.",
    reports: scenarioAJson.reports as EdgeTriageReport[],
    synthesis: scenarioASynthesis,
    synthesisStatus: "generated",
    synthesisGeneratedBy: "Gemma 4 31B on Kaggle 2× T4 · 2026-05-17",
    mapCenter: [-6.243, 106.858],
    mapZoom: 13,
  },
  B: {
    id: "B",
    shortLabel: "Earthquake",
    title: "Shallow earthquake",
    description:
      "15 reports across a 2-hour window. Hardest case: three sev-5 incidents including a building collapse with secondary structural failure, school evacuation, hospital patient carry, market gas leak, one deliberately low-confidence ambiguous report.",
    reports: scenarioBJson.reports as EdgeTriageReport[],
    synthesis: scenarioBSynthesis,
    synthesisStatus: "generated",
    synthesisGeneratedBy: "Gemma 4 31B on Kaggle 2× T4 · 2026-05-17",
    mapCenter: [-6.82, 107.13],
    mapZoom: 11,
  },
  C: {
    id: "C",
    shortLabel: "Compound flood + fire",
    title: "Compound flood + electrical fires",
    description:
      "8 reports across a 60-minute window. Different responders classify the primary disaster differently (fire vs flood vs building_collapse) — synthesis must produce a coherent compound classification.",
    reports: scenarioCJson.reports as EdgeTriageReport[],
    synthesis: scenarioCSynthesis,
    synthesisStatus: "generated",
    synthesisGeneratedBy: "Gemma 4 31B on Kaggle 2× T4 · 2026-05-17",
    mapCenter: [-6.176, 106.866],
    mapZoom: 14,
  },
};

export const SCENARIO_ORDER: ScenarioId[] = ["A", "B", "C"];
