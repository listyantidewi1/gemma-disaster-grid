import type { ReactNode } from "react";

type MetricProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

export function Metric({ icon, label, value }: MetricProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="mb-3 text-red-300">{icon}</div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
