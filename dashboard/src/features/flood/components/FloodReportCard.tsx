import { AlertTriangle, CheckCircle2, Clock, MapPin, Radio } from "lucide-react";
import type { EdgeTriageReport } from "@/lib/types";

type FloodReportCardProps = {
  report: EdgeTriageReport;
};

const severityClasses: Record<number, string> = {
  1: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  2: "border-amber-300/20 bg-amber-300/10 text-amber-100",
  3: "border-orange-400/20 bg-orange-500/10 text-orange-200",
  4: "border-red-400/20 bg-red-500/10 text-red-200",
  5: "border-red-500/40 bg-red-600/15 text-red-100",
};

const severityLabel: Record<number, string> = {
  1: "Minor",
  2: "Localized",
  3: "Significant",
  4: "Severe",
  5: "Catastrophic",
};

const evacClasses: Record<string, string> = {
  immediate: "border-red-400/40 bg-red-500/20 text-red-100",
  urgent: "border-orange-400/30 bg-orange-500/15 text-orange-100",
  standby: "border-amber-300/30 bg-amber-300/15 text-amber-100",
  none: "border-slate-400/20 bg-slate-400/10 text-slate-300",
};

function formatRelative(iso: string): string {
  return iso.slice(11, 16) + " UTC";
}

export function FloodReportCard({ report }: FloodReportCardProps) {
  const Icon = report.severity <= 2 ? CheckCircle2 : AlertTriangle;
  const sevClass = severityClasses[report.severity] ?? severityClasses[3];
  const evacClass =
    evacClasses[report.evacuation_priority] ?? evacClasses.none;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className={`mt-1 rounded-2xl border p-3 ${sevClass}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white truncate">
              {report.severity_rationale}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
              <span className="inline-flex items-center gap-2">
                <MapPin size={14} />
                {report.location.label ?? "Unknown location"}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock size={14} />
                {formatRelative(report.timestamp_iso)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Radio size={14} />
                {report.disaster_type} (
                {(report.disaster_type_confidence * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0 whitespace-nowrap">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${sevClass}`}
            title={`Severity ${report.severity} - ${severityLabel[report.severity]}`}
          >
            SEV {report.severity}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${evacClass}`}
          >
            {report.evacuation_priority}
          </span>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
        <div className="font-semibold text-white/90 mb-1">Immediate action</div>
        {report.immediate_action}
      </div>
      {report.hazards_visible.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {report.hazards_visible.map((h) => (
            <span
              key={h}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300"
            >
              {h}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-500">
        <span className="font-mono truncate">{report.report_id.slice(-20)}</span>
        <span
          className={`shrink-0 whitespace-nowrap ${
            report.routing_recommendation === "deep_lane"
              ? "text-orange-300"
              : "text-emerald-300"
          }`}
        >
          {report.routing_recommendation === "deep_lane"
            ? "deep lane"
            : "fast lane"}
        </span>
      </div>
    </div>
  );
}
