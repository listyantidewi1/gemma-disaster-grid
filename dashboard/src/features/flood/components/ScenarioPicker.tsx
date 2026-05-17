"use client";

import { SCENARIO_ORDER, SCENARIOS, type ScenarioId } from "@/lib/scenarios";
import { useFloodScenario } from "./FloodScenarioContext";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

export function ScenarioPicker() {
  const { scenario, setScenarioId } = useFloodScenario();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left shadow-2xl transition hover:bg-white/10"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-slate-400">
            Active scenario
          </div>
          <div className="mt-0.5 text-base font-bold text-white truncate">
            {scenario.title}
          </div>
          <div className="mt-1 text-xs text-slate-400 truncate">
            {scenario.description}
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
        >
          {SCENARIO_ORDER.map((id: ScenarioId) => {
            const s = SCENARIOS[id];
            const active = id === scenario.id;
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setScenarioId(id);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 transition ${
                  active ? "bg-sky-500/15" : "hover:bg-white/5"
                }`}
              >
                <div className="mt-1 shrink-0">
                  {active ? (
                    <Check size={16} className="text-sky-300" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-white truncate">
                      {s.title}
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        s.synthesisStatus === "generated"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                          : "border-amber-400/30 bg-amber-400/10 text-amber-200"
                      }`}
                    >
                      {s.synthesisStatus === "generated" ? "ready" : "pending"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {s.description}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    {s.reports.length} reports · {s.synthesisGeneratedBy}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
