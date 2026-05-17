import { BrainCircuit, GitBranch, Smartphone, Zap } from "lucide-react";
import { OfflineCapabilityCard } from "./OfflineCapabilityCard";

const capabilities = [
  {
    icon: Smartphone,
    title: "Field tier · Gemma 4 E2B",
    description:
      "On-device inference via Google AI Edge LiteRT. ~1.5GB Q4 model accepts a photo plus optional voice note and produces a structured EdgeTriageReport in under 5 seconds. Fully offline.",
    status: "Edge",
  },
  {
    icon: BrainCircuit,
    title: "Sync tier · Gemma 4 31B",
    description:
      "When connectivity returns, queued reports flow to the command-center model. 128k context, 4-bit quantized via Unsloth on 2× T4. Cross-report synthesis with reasoning trace.",
    status: "Cloud",
  },
  {
    icon: GitBranch,
    title: "Intelligent routing",
    description:
      "Every report carries the on-device model's own routing recommendation. The app layer combines that with cross-report context (recurring location, low confidence, trapped persons) to decide fast lane vs deep lane.",
    status: "Live",
  },
  {
    icon: Zap,
    title: "Same family, top to bottom",
    description:
      "E2B on the phone shares architecture, tokenizer, and chat template with the 31B in the cloud. One JSON contract: EdgeTriageReport → CommandCenterSynthesis.",
    status: "Open",
  },
];

export function OfflineResiliencePanel() {
  return (
    <section className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6 shadow-2xl">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Architecture · Same Gemma 4 family, edge to cloud
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Designed for the moments connectivity fails — where disaster
            coordination matters most.
          </p>
        </div>
        <div className="rounded-full border border-emerald-400/30 bg-slate-950/50 px-4 py-2 text-sm text-emerald-200">
          Apache 2.0 · Open weights
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {capabilities.map((capability) => (
          <OfflineCapabilityCard key={capability.title} {...capability} />
        ))}
      </div>
    </section>
  );
}
