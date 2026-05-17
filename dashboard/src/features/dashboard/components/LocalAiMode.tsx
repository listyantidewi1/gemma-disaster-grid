import { ShieldCheck } from "lucide-react";

export function LocalAiMode() {
  return (
    <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
      <div className="flex items-center gap-3 text-emerald-300">
        <ShieldCheck />
        <h3 className="text-xl font-bold">Gemma Local AI Mode</h3>
      </div>
      <p className="mt-3 text-slate-300">
        Designed for offline-first disaster response: local reasoning, grounded
        safety guidance, and low-connectivity field usage.
      </p>
    </div>
  );
}
