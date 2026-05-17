type AnalyzerInputProps = {
  value: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onAnalyze: () => void;
};

export function AnalyzerInput({
  value,
  isLoading,
  onChange,
  onAnalyze,
}: AnalyzerInputProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <label
        htmlFor="hazard-report"
        className="text-sm font-semibold text-slate-200"
      >
        Field disaster report
      </label>
      <textarea
        id="hazard-report"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Describe smoke density, visibility, location, symptoms, wind direction, or evacuation constraints..."
        className="mt-3 min-h-40 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm text-slate-100 outline-none transition focus:border-red-300/60 focus:ring-2 focus:ring-red-500/20"
      />
      <button
        type="button"
        onClick={onAnalyze}
        disabled={isLoading}
        className="mt-4 inline-flex h-11 items-center justify-center rounded-full border border-red-300/30 bg-red-500/20 px-5 text-sm font-semibold text-red-100 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Analyzing..." : "Analyze Report"}
      </button>
    </div>
  );
}
