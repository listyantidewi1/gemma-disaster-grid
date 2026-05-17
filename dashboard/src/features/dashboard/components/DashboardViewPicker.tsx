"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  DASHBOARD_VIEWS,
  PLANNED_DISASTER_TYPES,
  VIEW_ORDER,
  type DashboardViewId,
} from "@/lib/dashboard-views";

type Props = {
  current: DashboardViewId;
  onSelect: (id: DashboardViewId) => void;
};

const statusClasses: Record<string, string> = {
  live: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
  ready: "border-sky-400/40 bg-sky-400/15 text-sky-200",
  pending: "border-amber-400/40 bg-amber-400/15 text-amber-200",
};

export function DashboardViewPicker({ current, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const active = DASHBOARD_VIEWS[current];

  return (
    <div className="relative mt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left shadow-2xl transition hover:bg-white/10"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="flex min-w-0 items-center gap-4">
          <span className="text-3xl" aria-hidden>
            {active.emoji}
          </span>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-slate-400">
              Active disaster intelligence
            </div>
            <div className="mt-0.5 text-lg font-bold text-white truncate">
              {active.longLabel}
            </div>
            <div className="mt-0.5 text-xs text-slate-400 truncate">
              {active.description}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
              statusClasses[active.status]
            }`}
          >
            {active.statusLabel}
          </span>
          <ChevronDown
            size={22}
            className={`text-slate-400 transition ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
        >
          {VIEW_ORDER.map((id) => {
            const view = DASHBOARD_VIEWS[id];
            const isActive = id === current;
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onSelect(id);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 transition ${
                  isActive ? "bg-sky-500/15" : "hover:bg-white/5"
                }`}
              >
                <div className="mt-1 shrink-0">
                  {isActive ? (
                    <Check size={16} className="text-sky-300" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                </div>
                <span className="text-2xl shrink-0" aria-hidden>
                  {view.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-white truncate">
                      {view.longLabel}
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        statusClasses[view.status]
                      }`}
                    >
                      {view.statusLabel}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {view.description}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Footer: planned disaster types. Demonstrates platform scope. */}
          <div className="border-t border-white/5 bg-black/30 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              Architecture supports — coming next
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLANNED_DISASTER_TYPES.map((p) => (
                <span
                  key={p.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-400"
                >
                  <span aria-hidden>{p.emoji}</span> {p.label}
                </span>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Same Gemma 4 architecture · same JSON contract · just add a scenario file.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
