import { DashboardOverview } from "@/features/dashboard/components/DashboardOverview";
import { EnvironmentStats } from "@/features/environment/components/EnvironmentStats";
import { IncidentFeed } from "@/features/incidents/components/IncidentFeed";
import { IncomingReportsPanel } from "@/features/live-reports/components/IncomingReportsPanel";
import { DisasterMap } from "@/features/maps/components/DisasterMap";
import { ReportGrid } from "@/features/reports/components/ReportGrid";
import type { DashboardHotspotsPayload } from "@/lib/dashboard-hotspots";
import { reports } from "@/lib/reports";

type WildfireViewProps = {
  hotspotData: DashboardHotspotsPayload;
};

/**
 * Wildfire monitoring view: global NASA FIRMS VIIRS satellite hotspots,
 * environmental impact stats, regional incident feed, plus the live
 * field-reports panel so phone uploads with disaster_type="fire" surface
 * here alongside the satellite signal.
 *
 * The old HazardAnalysisPanel (Ollama-based local hazard analyzer) and
 * LocalAiMode banner were removed once the Android edge app started
 * doing the real on-device Gemma 4 inference. Keeping a second 'local
 * AI' surface on the dashboard would have confused the architecture
 * story; the phone is the local AI.
 */
export function WildfireView({ hotspotData }: WildfireViewProps) {
  return (
    <>
      <DashboardOverview hotspots={hotspotData.hotspots} />
      <DisasterMap data={hotspotData} />
      <IncomingReportsPanel />
      <EnvironmentStats hotspots={hotspotData.hotspots} />
      <IncidentFeed hotspots={hotspotData.hotspots} />
      <ReportGrid reports={reports} />
    </>
  );
}
