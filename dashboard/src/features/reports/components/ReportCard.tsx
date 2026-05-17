import type { Report } from "@/lib/reports";

type ReportCardProps = {
  report: Report;
};

export function ReportCard({ report }: ReportCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{report.area}</h3>
        <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-300">
          {report.risk}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-400">{report.status}</p>
      <div className="mt-4 flex justify-between text-sm">
        <span>AQI: {report.aqi}</span>
        <span>CO₂: {report.co2}</span>
      </div>
    </div>
  );
}
