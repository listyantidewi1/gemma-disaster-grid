import { FloodHero } from "./FloodHero";
import { FloodMap } from "./FloodMap";
import { FloodReportFeed } from "./FloodReportFeed";
import { FloodSampleCard } from "./FloodSampleCard";
import { FloodScenarioProvider } from "./FloodScenarioContext";
import { FloodStats } from "./FloodStats";
import { FloodSynthesisPanel } from "./FloodSynthesisPanel";
import { IncomingReportsPanel } from "@/features/live-reports/components/IncomingReportsPanel";
import { OfflineResiliencePanel } from "@/features/offline/components/OfflineResiliencePanel";
import type { ScenarioId } from "@/lib/scenarios";

type FloodViewProps = {
  initial?: ScenarioId;
};

/**
 * Flood Response composition. Wraps children in FloodScenarioProvider so
 * the synthesis-aware components read the active scenario from context.
 *
 * The top-level UnifiedDashboard handles the disaster-type / scenario
 * picker; this view just renders the panels for whatever scenario its
 * parent decided.
 */
export function FloodView({ initial = "A" }: FloodViewProps) {
  return (
    <FloodScenarioProvider initial={initial}>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <FloodHero />
        <FloodSampleCard />
      </div>
      <FloodMap />
      <FloodSynthesisPanel />
      <IncomingReportsPanel />
      <FloodStats />
      <FloodReportFeed />
      <OfflineResiliencePanel />
    </FloodScenarioProvider>
  );
}
