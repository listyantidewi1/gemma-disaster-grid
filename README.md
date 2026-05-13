# Gemma Rescue Grid

*The Python / Android / writeup half of [**NusaSiaga · Gemma Rescue Grid**](https://github.com/NoesaaDecodes/nusasiaga) — an offline-first disaster intelligence platform built on Gemma 4, for communities anywhere.*

When the cell tower dies, coordination dies with it. Gemma Rescue Grid puts a multimodal first responder in every pocket, then synthesizes every field report into a single operating picture the moment the signal returns. The architecture is disaster-type-agnostic — wildfire, flood, earthquake, industrial fire today; tsunami, landslide, volcanic, storm next.

This project is a submission to [The Gemma 4 Good Hackathon](https://www.kaggle.com/competitions/gemma-4-good-hackathon) (deadline 2026-05-18). Target tracks: **Impact / Global Resilience** + **Special Tech / Cactus** (intelligent on-device model routing).

---

## The 30-second pitch

A field responder in a disaster zone snaps a photo, speaks a short note, and 4 seconds later their offline Android phone produces a structured emergency triage: disaster type, 1–5 severity, hazards visible, vulnerable people, recommended immediate action. The phone is in airplane mode.

If the situation is complex — uncertain severity, conflicting reports, multiple incidents in the same area — the phone *intelligently routes* the report to a deeper analysis queue. When connectivity returns, the queue syncs to a command-center instance of Gemma 4 31B that ingests dozens of reports at once and produces a consolidated incident picture: hot zones, priority evacuations, hazard summary, response actions.

**Same Gemma 4 family, top to bottom. 2.5GB on the phone. Frontier reasoning in the cloud.**

## Architecture at a glance

```
┌─────────────────────────────┐                ┌────────────────────────────────┐
│  PHONE (offline, LiteRT)    │   sync queue   │  COMMAND CENTER (Kaggle, GPU)  │
│  Gemma 4 E2B • 2.5GB        │ ─────────────▶ │  Gemma 4 31B (Unsloth)         │
│  Photo + voice/text → JSON  │  when online   │  Multi-report synthesis        │
│  Routing self-assessment    │                │  128k context, all reports     │
└─────────────────────────────┘                └────────────────────────────────┘
       "fast lane"                                    "deep lane"
       ~4 seconds, fully offline                      ~30 seconds, cross-incident
```

## Why this can win

| Track | Prize | Our angle |
|---|---|---|
| Impact / Global Resilience | $10K | Track description names "offline, edge-based disaster response" verbatim |
| Special Tech / Cactus | $10K | Intelligent routing between two Gemma 4 models on a local-first app |
| Special Tech / Unsloth | $10K | E2B fine-tuned on curated disaster imagery (Day-5 stretch) |
| Main Track | $10K–$50K | Aspirational — depends on overall execution & storytelling |

## Repository layout

```
gemma4/
├── README.md                            ← you are here
├── docs/
│   └── architecture.md                  ← deep technical narrative
├── prompts/
│   ├── output_schemas.md                ← JSON data contract (edge + cloud)
│   ├── edge_triage_system.md            ← E2B system prompt
│   └── cloud_synthesis_system.md        ← 31B system prompt
├── notebook/                            ← Kaggle submission notebook (TBD)
├── android/                             ← LiteRT Android app (TBD)
├── data/                                ← Curated demo disaster reports
└── writeup/
    ├── video_script_v1.md               ← 3-min video script
    └── kaggle_writeup_outline.md        ← 1500-word writeup structure
```

## Status — 2026-05-14

| Day | Status |
|---|---|
| Day 1 — 13 May | ✅ Foundation: schemas, prompts, three scenarios, routing, Colab notebook end-to-end. Synthesis verified on Gemma 4 E4B. Dual-track NusaSiaga dashboard with unified disaster-type picker. Kotlin domain scaffold. Writeup v0.5 (1573 words). Bilingual team plan. |
| Day 2 — 14 May | ✅ Shipped. Android Studio installed, gallery forked, sync clean, build passes. `gemma-4-E2B-it` confirmed available in gallery picker without HuggingFace OAuth. First multimodal inference verified on Samsung Galaxy A71 (2020 mid-range, Snapdragon 730, no NPU). |
| Day 3 — 14 May (one day ahead of plan) | ✅ Shipped. Edge tier functionally complete. Validated `EdgeTriageReport` JSON output from our locked system prompt on Galaxy A71 (first-shot valid; all enum, range, and length constraints respected). Built four Kotlin files for a "Disaster Triage" custom task in the gallery fork — Hilt-discovered tile, photo capture, streaming inference, parsed result card with severity badge / hazards chips / immediate-action callout / fast-or-deep-lane routing decision. Patched the gallery's model registry to attach any image-capable LLM to our task ID. End-to-end verified on device. |
| Day 4 — 16 May | Kaggle quota resets. Run notebook on 2× T4 with `unsloth/gemma-4-31B-it` for all three scenarios. Drop synthesis JSON into NusaSiaga; flip B and C from `pending` to `generated`. |
| Day 5 — 17 May | Film 3-min video. Optional Unsloth fine-tune. Optional wildfire user-report scenario. |
| Day 6 — 18 May | Trim writeup to ≤1500 words, dry run, **submit before 11:59 PM UTC**. |

## License

Code: Apache 2.0. Winning Submission, per Kaggle rules, will be CC-BY 4.0.
