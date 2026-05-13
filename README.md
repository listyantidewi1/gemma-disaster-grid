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

## Status (2026-05-13)

| Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | Day 6 |
|---|---|---|---|---|---|
| ✅ LiteRT/Gemma 4 risk killed; foundation files; schema | E2B prompt + 31B synthesis prompt running on test inputs | Android shell + routing UI; full sync demo | End-to-end run; prompt polish | Unsloth fine-tune; video edit | Final dry-run; **submit** |

## License

Code: Apache 2.0. Winning Submission, per Kaggle rules, will be CC-BY 4.0.
