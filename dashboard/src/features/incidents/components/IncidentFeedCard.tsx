import { AlertTriangle, CheckCircle2, Clock, Radio } from "lucide-react";

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Incident = {
  title: string;
  region: string;
  severity: IncidentSeverity;
  timestamp: string;
  responseStatus: string;
};

type IncidentFeedCardProps = {
  incident: Incident;
};

const severityClasses: Record<IncidentSeverity, string> = {
  LOW: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  MEDIUM: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  HIGH: "border-orange-400/20 bg-orange-500/10 text-orange-200",
  CRITICAL: "border-red-400/20 bg-red-500/10 text-red-200",
};

export function IncidentFeedCard({ incident }: IncidentFeedCardProps) {
  const Icon = incident.severity === "LOW" ? CheckCircle2 : AlertTriangle;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div
            className={`mt-1 rounded-2xl border p-3 ${severityClasses[incident.severity]}`}
          >
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white">{incident.title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2">
                <Radio size={14} />
                {incident.region}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock size={14} />
                {incident.timestamp}
              </span>
            </div>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${severityClasses[incident.severity]}`}
        >
          {incident.severity}
        </span>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
        {incident.responseStatus}
      </div>
    </div>
  );
}
