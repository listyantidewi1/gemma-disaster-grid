# NusaSiaga · Gemma Rescue Grid

### Offline-first disaster intelligence powered by Gemma 4 — from the field responder's phone to the command center, one operational picture

**Track:** Impact / Global Resilience
**Stackable:** Special Tech / Cactus
**Live Demo:** *(Vercel URL — added Day 6)*
**Code:** github.com/listyantidewi1/gemma-disaster-grid · github.com/NoesaaDecodes/nusasiaga
**Video:** *(YouTube — added Day 6)*
**APK:** *(attached to this writeup)*

---

## The first hour

On 21 November 2024, a shallow magnitude 5.6 earthquake struck Cianjur, West Java. More than 600 people died, most in the first hours. Indonesian responders later said the same thing they say after every disaster — and the same thing responders say after a hurricane in the Caribbean, a flood in Bangladesh, a wildfire in California: information arrived as fifty unsynced WhatsApp messages and a hundred photos. The deadliest hour was spent reading, not acting.

The problem is not that AI can't help. The problem is that today's AI disaster tools either (a) need steady cloud connectivity to function, or (b) are text-only chatbots that can't read a photograph of a flooded street. In a disaster zone — any disaster zone, anywhere — both assumptions fail at exactly the moment they matter most.

Gemma 4 is the first open model family designed to span this gap — frontier-quality reasoning at 31 billion parameters in the cloud, and a multimodal 2.3-billion-effective-parameter sibling that runs entirely on a phone via Google AI Edge LiteRT. We built NusaSiaga · Gemma Rescue Grid to put both ends of that family in the same disaster-response stack, deployable for any community a phone can reach.

## Solution at a glance

A field responder in a possibly-disconnected disaster zone snaps a photograph on an ordinary Android phone. Gemma 4 E2B, running fully offline via LiteRT, produces a structured emergency triage in under five seconds: disaster type, severity 1–5, visible hazards, vulnerable people, the single most important action for the next ten minutes, and the model's own assessment of whether the case needs deeper analysis. When connectivity returns, queued reports flow to Gemma 4 31B in a command-center notebook, which consolidates dozens of reports across a 128k-token context into a single operational picture: priority zones, ranked actions, validity flags, confidence notes. A web dashboard renders that synthesis behind a single disaster-type picker — wildfire, flood, earthquake, industrial fire today; volcanic, tsunami, landslide, storm next — alongside a live NASA FIRMS satellite layer for wildfire monitoring. One platform, every disaster type, same Gemma 4 architecture end to end.

**Same Gemma 4 family at every scale. One JSON contract end-to-end. Apache 2.0 top to bottom.**

## Architecture

```
PHONE (LiteRT, offline)            COMMAND CENTER (Kaggle, GPU)
─────────────────────              ───────────────────────────────
Gemma 4 E2B  · ~1.5 GB Q4      ←→  Gemma 4 31B · Unsloth 4-bit on 2×T4
Photo + voice/text → JSON           Multi-report synthesis, 128k ctx
EdgeTriageReport                    CommandCenterSynthesis
Field responder                     Ops coordinator → web dashboard
```

**Edge tier.** Gemma 4 E2B runs via Google AI Edge LiteRT in a Kotlin Android app forked from the official `google-ai-edge/gallery` reference. We pin to the `litert-community/gemma-4-E2B-it-litert-lm` weights (2.5 GB on disk, ~1.5 GB resident at INT4). The system prompt — copied verbatim into the app as a Kotlin constant — instructs the model to emit a single `EdgeTriageReport` JSON object with no preamble. We use Gemma 4's recommended sampling (`temperature=1.0, top_p=0.95, top_k=64`) and a `max_new_tokens` budget of 512.

**Intelligent routing (the Cactus Prize hook).** Every report carries the on-device model's own `routing_recommendation` field — `fast_lane` or `deep_lane`. The model knows when it's out of its depth: severity 4–5, low confidence, compound hazards, trapped persons. But the application also adds context the model cannot see — how many other reports have arrived from the same location label in the past hour, what the queue depth is, what battery level remains. A deterministic Kotlin function combines both signals into the final routing decision. The rationale string is shown on screen and read aloud in the demo video.

**Sync tier.** When the device next has connectivity, deep-lane reports flow to the command-center notebook running Gemma 4 31B (Unsloth-quantized to 4-bit, loaded across 2× Tesla T4 on Kaggle). The synthesis prompt instructs the model to cluster reports geographically and temporally, detect duplicates and conflicts, and emit a single `CommandCenterSynthesis` JSON. We deliberately allow a `<|channel>thought` reasoning trace before the final JSON — judges and operators can see how the model resolved conflicts.

**Dashboard.** A Next.js 16 web app deployed on Vercel renders the synthesis as an operational picture. A tab pill at the top switches between **Wildfire Monitoring** (live NASA FIRMS VIIRS hotspot data across Indonesia, with FRP-weighted risk scoring) and **Flood Response Demo** (the Gemma 4 synthesis of Scenario A — a simulated 90-minute Jakarta flood with twelve hand-crafted field reports). Both tabs share the same `NusaSiaga · Gemma Rescue Grid` shell. The dashboard is what judges click first; everything else is the engine behind it.

## Why Gemma 4 specifically

Three properties of Gemma 4 make this architecture viable where a year ago it was not.

**Native multimodal on edge.** Most on-device language models are text-only. Disaster reports are inherently multimodal — a photograph is the input that matters. Gemma 4 E2B accepts text, image, and audio natively, without separate encoders or pre-processing pipelines. The responder's voice note in Bahasa Indonesia is processed by the same model that reads the image.

**Same family at every scale.** The 2.3-billion-effective-parameter E2B on the phone shares its architecture, tokenizer, and chat template with the 31-billion-parameter dense model in the cloud. This is rare among open-model families and dramatically simplifies the routing story: schemas, prompts, and post-processing are written once and used at both ends.

**Function calling and 128k context.** The edge tier uses Gemma 4's structured-output behavior to produce reliable schema-shaped JSON. The 31B's 128k context lets the command center ingest dozens of reports plus references to their imagery in a single call. We tested 12 reports in 3,200 tokens of input and got a coherent five-priority-zone synthesis on Gemma 4 E4B during development; 31B on Kaggle for the final submission produces sharper output still.

**Apache 2.0 weights.** Unrestricted commercial deployment matters to disaster-response NGOs, which is who actually adopts these tools.

## Technical challenges and what we did

Five concrete things broke during the build, and how we fixed them:

**1. Reliable JSON output from a multimodal prompt.** Multimodal inputs can throw a model off the JSON format it's been instructed to produce. We addressed this with a strict system prompt that explicitly forbids preamble, three few-shot examples that demonstrate the schema, and a validator that runs every output through a Pydantic schema and surfaces errors instead of hiding them.

**2. Schema templates inside the system prompt confusing our extractor.** Our first JSON-extraction helper found the first balanced `{...}` substring in the model output — which turned out to be the *schema template* in the system prompt (containing `<placeholder>` markers that aren't valid JSON), not the model's actual answer. We rewrote the extractor to try every balanced substring and return the first one that round-trips through `json.loads`. Schema templates fail to parse and get skipped automatically.

**3. Truncation when output exceeded `max_new_tokens`.** Some synthesis runs produced more than 4,096 tokens and got chopped mid-array. We added a `attemptTruncatedJsonRepair` function that balances open delimiters at the last safely-closeable position; partial outputs still render a partial dashboard while a warning tells the user to regenerate cleanly.

**4. Two-track coexistence in one dashboard.** Mid-build we discovered our teammate had been shipping a real-time NASA FIRMS satellite wildfire integration to the same NusaSiaga repo. Rather than choose one direction or lose work, we structured the dashboard as two tabs — Wildfire Monitoring (their work, fully preserved) and Flood Response Demo (the Gemma 4 hybrid). The integration was purely additive; nothing of the wildfire track was modified or deleted.

**5. Latency budget for the demo.** Synthesis on Gemma 4 E4B on a single Colab T4 takes 10–12 minutes per scenario. For the video demo we cache `raw_output` to disk after the first successful generation; re-runs load instantly. The published Kaggle notebook will use 31B on the dual-T4 setup judges have access to.

## Real-world impact and ethics

More than 800 million people live more than three hours from a hospital. Indonesia alone sees recurring floods in Jakarta, earthquakes in Sulawesi and West Java, volcanic activity in Sumatera, and persistent peatland fires in Kalimantan. Connectivity in these zones is variable at best; in the first hours of a disaster, it is reliably terrible. An offline-first first responder tool is not a nice-to-have here. It is the only design that survives contact with the problem.

**Privacy posture is offline-first too.** Photographs and audio stay on the device unless the user explicitly queues a report for sync. The MVP app ships with no analytics, no Firebase, no Crashlytics. The dashboard reads pre-baked synthesis JSON for the demo; it does not call out to any third-party service in default operation.

**Hoax and misuse.** The synthesis tier flags reports as `low_quality`, `possible_duplicate`, or `conflicting` rather than silently filtering them. Decisions about validity remain visible to the human coordinator.

## What's next

Mesh sync over Wi-Fi Direct or Bluetooth, so coordinated triage works even when *no* signal exists, not just delayed signal. Specialized Unsloth LoRA fine-tunes on curated per-disaster-type imagery (flood depth from photos; structural damage classification). Integration with national disaster agency APIs (Indonesian BNPB, Philippine NDRRMC). Multilingual coverage — Gemma 4 already handles Bahasa Indonesia natively; we want to validate Tagalog, Vietnamese, Bengali, and Swahili next.

The same architecture works for any disaster type where the input is a photograph and a voice note from someone who is in the disaster zone right now. Wildfire intake is on the same dashboard. The only thing that changes is the schema and the prompt.

---

*Written by the team. We are two people who have done two days of work in one. Thank you for reading.*
