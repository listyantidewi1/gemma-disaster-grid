import {
  buildHazardAnalysisPrompt,
  GEMMA_HAZARD_ANALYSIS_MODEL,
  mockHazardAnalysisResult,
} from "@/ai/gemma/prompts";
import { analyzeWithOllama } from "@/ai/ollama/ollama-client";

type AnalyzeRequestBody = {
  report?: unknown;
};

export async function POST(request: Request) {
  let body: AnalyzeRequestBody;

  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (typeof body.report !== "string" || body.report.trim().length === 0) {
    return Response.json(
      { error: "Field `report` must be a non-empty string." },
      { status: 400 },
    );
  }

  const prompt = buildHazardAnalysisPrompt(body.report.trim());

  try {
    const result = await analyzeWithOllama({
      model: GEMMA_HAZARD_ANALYSIS_MODEL,
      prompt,
    });

    return Response.json({
      ...result,
      source: "gemma-local",
    });
  } catch {
    return Response.json({
      ...mockHazardAnalysisResult,
      source: "mock-fallback",
    });
  }
}
