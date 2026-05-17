import { DashboardHero } from "./DashboardHero";
import { HazardAnalyzer } from "./HazardAnalyzer";
import type { DashboardHotspot } from "@/lib/dashboard-hotspots";

type Props = {
  hotspots: DashboardHotspot[];
};

export function DashboardOverview({ hotspots }: Props) {
  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <DashboardHero />
      <HazardAnalyzer hotspots={hotspots} />
    </div>
  );
}
