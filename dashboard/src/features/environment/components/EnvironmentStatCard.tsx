import type { LucideIcon } from "lucide-react";

type EnvironmentStatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "red" | "orange" | "amber" | "emerald" | "sky" | "slate";
};

const toneClasses: Record<EnvironmentStatCardProps["tone"], string> = {
  red: "border-red-400/20 bg-red-500/10 text-red-200",
  orange: "border-orange-400/20 bg-orange-500/10 text-orange-200",
  amber: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  sky: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  slate: "border-slate-300/20 bg-white/5 text-slate-200",
};

export function EnvironmentStatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: EnvironmentStatCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${toneClasses[tone]}`}>
          <Icon size={22} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{detail}</p>
    </div>
  );
}
