"use client";

import { useState } from "react";
import { AnalyzerInput } from "./AnalyzerInput";
import {
  AnalyzerResult,
  type HazardAnalysisResult,
} from "./AnalyzerResult";

const defaultReport =
  "Dense smoke reported near peatland. Visibility is below 200 meters and residents are experiencing breathing difficulty.";

const mockResult: HazardAnalysisResult = {
  severity: "HIGH",
  aqiEstimate: "175-195 AQI, unhealthy to very unhealthy range",
  evacuationRecommendation:
    "Prepare evacuation routes for vulnerable residents, distribute masks, and limit outdoor activity until smoke concentration drops.",
  environmentalImpact:
    "Likely peatland combustion with elevated particulate pollution, short-term respiratory risk, and localized carbon emission increase.",
  source: "mock-fallback",
};

const errorFallbackResult: HazardAnalysisResult = {
  severity: "UNKNOWN",
  aqiEstimate: "Unable to estimate AQI from the current request.",
  evacuationRecommendation:
    "Use standard field safety protocols: avoid smoke exposure, protect vulnerable residents, and escalate to local responders if conditions worsen.",
  environmentalImpact:
    "Environmental impact could not be analyzed safely. Treat the report as unverified and continue manual monitoring.",
  source: "mock-fallback",
};

export function HazardAnalysisPanel() {
  const [report, setReport] = useState(defaultReport);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<HazardAnalysisResult>(mockResult);

  async function analyzeReport() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ report }),
      });

      if (!response.ok) {
        throw new Error(`Analysis request failed with status ${response.status}`);
      }

      const data = (await response.json()) as Partial<HazardAnalysisResult>;

      if (!isHazardAnalysisResult(data)) {
        throw new Error("Analysis response did not match expected schema");
      }

      setResult(data);
    } catch {
      setResult(errorFallbackResult);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight">
          Interactive AI Hazard Analyzer
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Local Gemma 4 analysis via Ollama with safe fallback for field reports.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <AnalyzerInput
          value={report}
          isLoading={isLoading}
          onChange={setReport}
          onAnalyze={analyzeReport}
        />
        <AnalyzerResult result={result} isLoading={isLoading} />
      </div>
    </section>
  );
}

function isHazardAnalysisResult(
  value: Partial<HazardAnalysisResult>,
): value is HazardAnalysisResult {
  return (
    typeof value.severity === "string" &&
    typeof value.aqiEstimate === "string" &&
    typeof value.evacuationRecommendation === "string" &&
    typeof value.environmentalImpact === "string" &&
    (value.source === "gemma-local" || value.source === "mock-fallback")
  );
}
