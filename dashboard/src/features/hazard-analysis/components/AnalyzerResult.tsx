export type HazardAnalysisResult = {
  severity: string;
  aqiEstimate: string;
  evacuationRecommendation: string;
  environmentalImpact: string;
  source: "gemma-local" | "mock-fallback";
};

type AnalyzerResultProps = {
  result: HazardAnalysisResult;
  isLoading: boolean;
};

export function AnalyzerResult({ result, isLoading }: AnalyzerResultProps) {
  return (
    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-white">AI Assessment</h3>
        <div className="flex flex-wrap items-center gap-2">
          {!isLoading && (
            <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-slate-200">
              {result.source}
            </span>
          )}
          <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-100">
            {isLoading ? "Processing" : result.severity}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/10" />
          <div className="h-20 animate-pulse rounded-2xl bg-white/10" />
        </div>
      ) : (
        <div className="grid gap-3 text-sm text-slate-200">
          <ResultItem label="AQI Estimate" value={result.aqiEstimate} />
          <ResultItem
            label="Evacuation Recommendation"
            value={result.evacuationRecommendation}
          />
          <ResultItem
            label="Environmental Impact"
            value={result.environmentalImpact}
          />
        </div>
      )}
    </div>
  );
}

function ResultItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-semibold uppercase text-red-200">{label}</p>
      <p className="mt-2 leading-6 text-slate-200">{value}</p>
    </div>
  );
}
