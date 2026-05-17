import { CheckCircle2 } from "lucide-react";

const readinessItems = [
  "Dashboard ready",
  "Map ready",
  "AI analyzer connected",
  "Ollama fallback ready",
  "Local AI setup documented",
  "README ready",
];

export function DemoReadinessPanel() {
  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Demo Readiness
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Hackathon review checklist for the NusaSiaga MVP.
          </p>
        </div>
        <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm text-sky-200">
          6 of 6 complete
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {readinessItems.map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm font-semibold text-slate-200"
          >
            <CheckCircle2 className="shrink-0 text-emerald-300" size={20} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
