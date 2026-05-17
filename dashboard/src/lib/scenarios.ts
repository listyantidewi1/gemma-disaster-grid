/**
 * Flood / disaster scenario catalog.
 *
 * Three hand-crafted scenarios live as JSON files alongside this one,
 * each containing an array of EdgeTriageReport objects. Only Scenario A
 * has been through the synthesis model so far (Gemma 4 E4B on Colab,
 * 2026-05-13). B and C will get their synthesis JSON on Day 4 of the
 * hackathon when Kaggle quota resets and we run them on Gemma 4 31B.
 *
 * The dashboard uses `SCENARIOS` to populate the scenario picker and
 * to look up the active scenario's reports + synthesis. When B and C
 * synthesis arrives, drop the JSON next to this file and update the
 * `synthesis` field below.
 */

import type {
  CommandCenterSynthesis,
  EdgeTriageReport,
} from "./types";
import { scenarioASynthesis } from "./synthesis-scenario-a";

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
    synthesisGeneratedBy: "Gemma 4 E4B on Colab · 2026-05-13",
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
    synthesis: null,
    synthesisStatus: "pending",
    synthesisGeneratedBy: "Awaiting Day 4 Kaggle 31B run",
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
    synthesis: null,
    synthesisStatus: "pending",
    synthesisGeneratedBy: "Awaiting Day 4 Kaggle 31B run",
    mapCenter: [-6.176, 106.866],
    mapZoom: 14,
  },
};

export const SCENARIO_ORDER: ScenarioId[] = ["A", "B", "C"];
