import type { HazardAnalysisOutput } from "@/ai/ollama/ollama-client";

export const GEMMA_HAZARD_ANALYSIS_MODEL = "gemma4:e2b";

export const mockHazardAnalysisResult: HazardAnalysisOutput = {
  severity: "HIGH",
  aqiEstimate: "175-195 AQI, unhealthy to very unhealthy range",
  evacuationRecommendation:
    "Prepare evacuation routes for vulnerable residents, distribute masks, and limit outdoor activity until smoke concentration drops.",
  environmentalImpact:
    "Likely peatland combustion with elevated particulate pollution, short-term respiratory risk, and localized carbon release.",
};

export function buildHazardAnalysisPrompt(report: string) {
  return `
You are NusaSiaga, a local environmental and disaster intelligence assistant.
Analyze the field disaster report and return only valid JSON.

Required JSON shape:
{
  "severity": "LOW | MEDIUM | HIGH | CRITICAL",
  "aqiEstimate": "short air quality estimate",
  "evacuationRecommendation": "short operational recommendation",
  "environmentalImpact": "short environmental impact assessment"
}

Field report:
${report}
`.trim();
}
