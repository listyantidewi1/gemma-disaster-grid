import type { Report } from "@/lib/reports";
import { ReportCard } from "./ReportCard";

type ReportGridProps = {
  reports: Report[];
};

export function ReportGrid({ reports }: ReportGridProps) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      {reports.map((report) => (
        <ReportCard key={report.area} report={report} />
      ))}
    </div>
  );
}
