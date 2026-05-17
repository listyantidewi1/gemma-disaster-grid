export type HazardAnalysisOutput = {
  severity: string;
  aqiEstimate: string;
  evacuationRecommendation: string;
  environmentalImpact: string;
};

type OllamaGenerateResponse = {
  response?: string;
};

type AnalyzeWithOllamaParams = {
  model: string;
  prompt: string;
  endpoint?: string;
  timeoutMs?: number;
};

const DEFAULT_OLLAMA_ENDPOINT = "http://localhost:11434/api/generate";
const DEFAULT_TIMEOUT_MS = 12_000;

export async function analyzeWithOllama({
  model,
  prompt,
  endpoint = DEFAULT_OLLAMA_ENDPOINT,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: AnalyzeWithOllamaParams): Promise<HazardAnalysisOutput> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: "json",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}`);
    }

    const data = (await response.json()) as OllamaGenerateResponse;
    return parseHazardAnalysisOutput(data.response);
  } finally {
    clearTimeout(timeout);
  }
}

function parseHazardAnalysisOutput(response: string | undefined) {
  if (!response) {
    throw new Error("Ollama response was empty");
  }

  const parsed = JSON.parse(response) as Partial<HazardAnalysisOutput>;

  if (
    !parsed.severity ||
    !parsed.aqiEstimate ||
    !parsed.evacuationRecommendation ||
    !parsed.environmentalImpact
  ) {
    throw new Error("Ollama response did not match hazard analysis schema");
  }

  return {
    severity: parsed.severity,
    aqiEstimate: parsed.aqiEstimate,
    evacuationRecommendation: parsed.evacuationRecommendation,
    environmentalImpact: parsed.environmentalImpact,
  };
}
