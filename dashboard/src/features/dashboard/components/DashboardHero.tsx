import { Flame, Leaf, Radio, Wind } from "lucide-react";
import { Metric } from "@/components/shared/Metric";

export function DashboardHero() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm text-red-300">
        <Radio size={16} /> Live Disaster Intelligence
      </div>
      <h2 className="max-w-3xl text-5xl font-black leading-tight">
        Detect wildfire risk, pollution impact, and carbon emission from the
        field.
      </h2>
      <p className="mt-5 max-w-2xl text-lg text-slate-300">
        NusaSiaga helps communities, volunteers, and local responders understand
        environmental threats even in low-connectivity areas using local AI.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Metric icon={<Flame />} label="Fire Risk" value="Extreme" />
        <Metric icon={<Wind />} label="Air Quality" value="188 AQI" />
        <Metric icon={<Leaf />} label="CO₂ Estimate" value="12.4 kt" />
      </div>
    </div>
  );
}
