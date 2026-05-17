"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { SCENARIOS, type ScenarioBundle, type ScenarioId } from "@/lib/scenarios";

type FloodScenarioContextValue = {
  scenario: ScenarioBundle;
  setScenarioId: (id: ScenarioId) => void;
};

const FloodScenarioContext = createContext<FloodScenarioContextValue | null>(null);

/**
 * Wrap the Flood Response tab in this provider so all child components
 * can call `useFloodScenario()` to read the active scenario data.
 */
export function FloodScenarioProvider({
  children,
  initial = "A",
}: {
  children: ReactNode;
  initial?: ScenarioId;
}) {
  const [id, setId] = useState<ScenarioId>(initial);
  const value: FloodScenarioContextValue = {
    scenario: SCENARIOS[id],
    setScenarioId: setId,
  };
  return (
    <FloodScenarioContext.Provider value={value}>
      {children}
    </FloodScenarioContext.Provider>
  );
}

export function useFloodScenario(): FloodScenarioContextValue {
  const ctx = useContext(FloodScenarioContext);
  if (!ctx) {
    throw new Error(
      "useFloodScenario must be used inside <FloodScenarioProvider>",
    );
  }
  return ctx;
}
