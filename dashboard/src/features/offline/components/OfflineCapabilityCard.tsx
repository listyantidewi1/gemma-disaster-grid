import type { LucideIcon } from "lucide-react";

type OfflineCapabilityCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  status: string;
};

export function OfflineCapabilityCard({
  icon: Icon,
  title,
  description,
  status,
}: OfflineCapabilityCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">
          <Icon size={22} />
        </div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          {status}
        </span>
      </div>
      <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}
