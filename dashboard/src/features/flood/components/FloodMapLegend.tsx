const severityItems = [
  { label: "Sev 5 — Catastrophic", colorClass: "bg-[#7f1d1d]" },
  { label: "Sev 4 — Severe", colorClass: "bg-[#dc2626]" },
  { label: "Sev 3 — Significant", colorClass: "bg-[#ea580c]" },
  { label: "Sev 2 — Localized", colorClass: "bg-[#d97706]" },
  { label: "Sev 1 — Minor", colorClass: "bg-[#ca8a04]" },
];

export function FloodMapLegend() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-slate-300 backdrop-blur">
      <h3 className="mb-3 font-semibold text-white">Field Report Severity</h3>
      <div className="space-y-2">
        {severityItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full shadow-[0_0_12px_currentColor] ${item.colorClass}`}
            />
            <span className="text-xs">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
