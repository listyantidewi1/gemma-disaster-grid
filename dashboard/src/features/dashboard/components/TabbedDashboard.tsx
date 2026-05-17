"use client";

import { useState, type ReactNode } from "react";
import { Flame, Waves } from "lucide-react";

type Tab = "wildfire" | "flood";

type TabbedDashboardProps = {
  wildfire: ReactNode;
  flood: ReactNode;
  initialTab?: Tab;
};

export function TabbedDashboard({
  wildfire,
  flood,
  initialTab = "flood",
}: TabbedDashboardProps) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <>
      <div className="mt-6 inline-flex rounded-full border border-white/10 bg-white/5 p-1 shadow-2xl">
        <button
          type="button"
          onClick={() => setTab("wildfire")}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${
            tab === "wildfire"
              ? "bg-orange-500/20 text-orange-200 shadow-inner"
              : "text-slate-400 hover:text-slate-200"
          }`}
          aria-pressed={tab === "wildfire"}
        >
          <Flame size={16} />
          Wildfire Monitoring · Live NASA FIRMS
        </button>
        <button
          type="button"
          onClick={() => setTab("flood")}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition ${
            tab === "flood"
              ? "bg-sky-500/20 text-sky-200 shadow-inner"
              : "text-slate-400 hover:text-slate-200"
          }`}
          aria-pressed={tab === "flood"}
        >
          <Waves size={16} />
          Flood Response · Gemma 4 Synthesis Demo
        </button>
      </div>

      <div hidden={tab !== "wildfire"}>{wildfire}</div>
      <div hidden={tab !== "flood"}>{flood}</div>
    </>
  );
}
