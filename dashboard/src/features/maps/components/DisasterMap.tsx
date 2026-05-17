"use client";

import type { DashboardHotspotsPayload } from "@/lib/dashboard-hotspots";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { MapLegend } from "./MapLegend";

const DisasterMapClient = dynamic(
  () => import("./DisasterMapClient").then((mod) => mod.DisasterMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] w-full items-center justify-center bg-slate-900 text-sm text-slate-400">
        Loading map...
      </div>
    ),
  }
);

type DisasterMapProps = {
  data: DashboardHotspotsPayload;
};

type SourceKey = "firms-live" | "notebook" | "demo";

function SourceBadge({ source }: { source: SourceKey }) {
  if (source === "firms-live") {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-green-400/30 bg-green-500/10 px-4 py-2 text-sm text-green-300">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
        Live NASA FIRMS
      </div>
    );
  }
  if (source === "notebook") {
    return (
      <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm text-sky-200">
        Notebook output
      </div>
    );
  }
  return (
    <div className="rounded-full border border-yellow-400/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-200">
      Demo fallback
    </div>
  );
}

export function DisasterMap({ data: initialData }: DisasterMapProps) {
  const [data, setData] = useState<DashboardHotspotsPayload>(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(
    initialData.source === "firms-live"
      ? (initialData as { fetched_at?: string }).fetched_at ?? null
      : null
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/firms");
      if (!res.ok) throw new Error("Fetch failed");
      const fresh = await res.json();
      if (fresh.hotspots?.length > 0) {
        setData(fresh);
        setLastRefreshed(fresh.fetched_at ?? new Date().toISOString());
      }
    } catch {
      // silently keep existing data
    } finally {
      setRefreshing(false);
    }
  }, []);

  const formatTime = (iso: string) => {
    try {
      return (
        new Date(iso).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        }) + " WIB"
      );
    } catch {
      return iso;
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Indonesia Wildfire Hotspot Map
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Real-time satellite fire detection · NASA FIRMS VIIRS
          </p>
          {lastRefreshed && (
            <p className="mt-0.5 text-xs text-slate-500">
              Last updated: {formatTime(lastRefreshed)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={data.source as SourceKey} />
          <div className="rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {data.hotspots.length} active hotspots
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {data.summary && (
        <div className="mb-4 flex flex-wrap gap-3 text-xs">
          <span className="rounded-md bg-red-500/20 px-2 py-1 text-red-300">
            CRITICAL {data.summary.critical}
          </span>
          <span className="rounded-md bg-orange-500/20 px-2 py-1 text-orange-300">
            HIGH {data.summary.high}
          </span>
          <span className="rounded-md bg-yellow-500/20 px-2 py-1 text-yellow-300">
            MEDIUM {data.summary.medium}
          </span>
          <span className="rounded-md bg-green-500/20 px-2 py-1 text-green-300">
            LOW {data.summary.low}
          </span>
          {data.summary.max_frp && (
            <span className="rounded-md bg-white/5 px-2 py-1 text-slate-400">
              Max FRP: {data.summary.max_frp} MW
            </span>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          <DisasterMapClient hotspots={data.hotspots} />
        </div>
        <div className="space-y-4">
          <MapLegend />
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4 text-xs text-slate-400 space-y-1">
            <div className="font-medium text-slate-300 mb-1">Data Pipeline</div>
            <div>① NASA FIRMS VIIRS live API</div>
            <div>② Notebook JSON output</div>
            <div>③ Demo fallback</div>
          </div>
        </div>
      </div>
    </section>
  );
}
