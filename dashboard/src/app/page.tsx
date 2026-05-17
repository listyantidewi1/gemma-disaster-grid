import { AppHeader } from "@/components/shared/AppHeader";
import { UnifiedDashboard } from "@/features/dashboard/components/UnifiedDashboard";
import { FloodView } from "@/features/flood/components/FloodView";
import { WildfireView } from "@/features/wildfire/components/WildfireView";
import { loadDashboardHotspots } from "@/lib/dashboard-hotspots";

async function fetchLiveHotspots() {
  // During Vercel's build phase there is no server running on localhost, so
  // a same-origin fetch to /api/firms cannot succeed. Skip it and let
  // runtime revalidation populate the live data on the first real request.
  // The fallback chain (notebook JSON -> demo) renders during build instead.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return null;
  }

  try {
    // VERCEL_URL is set in serverless functions at runtime; fall back to
    // localhost for `next dev`. Without an absolute URL the fetch fails on
    // Vercel (every invocation is a separate function with no shared port).
    const host = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000");
    const res = await fetch(`${host}/api/firms`, {
      next: { revalidate: 1800 }, // revalidate every 30 minutes
    });
    if (!res.ok) throw new Error(`FIRMS API error: ${res.status}`);
    const data = await res.json();
    if (!data.hotspots || data.hotspots.length === 0)
      throw new Error("Empty hotspots");
    return data;
  } catch (err) {
    console.warn("[NusaSiaga] Live FIRMS fetch failed, falling back:", err);
    return null;
  }
}

export default async function Home() {
  // Wildfire view data: NASA FIRMS live -> notebook JSON -> demo fallback.
  const liveData = await fetchLiveHotspots();
  const hotspotData = liveData ?? (await loadDashboardHotspots());

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <AppHeader />
        <UnifiedDashboard
          wildfire={<WildfireView hotspotData={hotspotData} />}
          triageOperations={<FloodView initial="A" />}
        />
      </section>
    </main>
  );
}
