# Gemma Disaster Grid

*An offline-first disaster intelligence platform built on Gemma 4, for communities anywhere. **Live demo:** <https://nusasiaga.vercel.app>. **APK:** attached to the writeup. Submission to [The Gemma 4 Good Hackathon](https://www.kaggle.com/competitions/gemma-4-good-hackathon), target tracks: **Impact / Global Resilience** + **Special Tech / Cactus** (intelligent on-device model routing).*

When the cell tower dies, coordination dies with it. Gemma Disaster Grid puts a multimodal first responder in every pocket via the **Gemma Rescue Grid** Android app and synthesizes every field report into a single operating picture — the **NusaSiaga · Gemma Disaster Grid** dashboard — the moment the signal returns. The architecture is disaster-type-agnostic: wildfire, flood, earthquake, industrial fire today; tsunami, landslide, volcanic, storm next.

This repository is the complete monorepo. Every tier lives here.

---

## The 30-second pitch

A field responder in a disaster zone snaps a photo, speaks a short note, and 30–60 seconds later their offline Android phone produces a structured emergency triage: disaster type, 1–5 severity, hazards visible, vulnerable people, recommended immediate action. The phone is in airplane mode.

If the situation is complex — uncertain severity, conflicting reports, multiple incidents in the same area — the phone *intelligently routes* the report to a deeper-analysis queue. When connectivity returns, the queue syncs to a command-center instance of Gemma 4 31B that ingests dozens of reports at once and produces a consolidated incident picture: hot zones, priority evacuations, hazard summary, response actions.

When the cell tower is gone *for days*, responders fall back to a QR-mesh peer hand-off — any unresolved report can be passed from phone to phone until one of them gets signal.

**Same Gemma 4 family, top to bottom. 2.5 GB on the phone. Frontier reasoning in the cloud.**

## Architecture at a glance

```
┌─────────────────────────────┐                ┌────────────────────────────────┐
│  PHONE (offline, LiteRT)    │   sync queue   │  COMMAND CENTER (Kaggle, GPU)  │
│  Gemma Rescue Grid app      │ ─────────────▶ │  Gemma 4 31B (Unsloth, 4-bit)  │
│  Gemma 4 E2B • 2.5 GB       │  when online   │  Multi-report synthesis        │
│  Photo + voice → JSON       │                │  16k context, all reports      │
│  Routing self-assessment    │                │  CommandCenterSynthesis JSON   │
└─────────────────────────────┘                └────────────────────────────────┘
       "fast lane"              ◀───── QR mesh / share intent ─────▶
   ~30-60s, fully offline       (no-connectivity-for-days handoff)
                                                │
                                                ▼
                              ┌──────────────────────────────────┐
                              │  NusaSiaga · Gemma Disaster Grid │
                              │  Next.js dashboard on Vercel     │
                              │  Live phone uploads + FIRMS      │
                              │  Reporter / crowd resolve paths  │
                              └──────────────────────────────────┘
```

## Repository layout (monorepo)

```
gemma-disaster-grid/
├── README.md                            ← you are here
│
├── android/                             ← Gemma Rescue Grid Android app
│   ├── README.md                        ← our additions to the gallery fork
│   ├── Android/src/app/                 ← Gradle source root (open in Android Studio)
│   ├── _upstream/                       ← preserved upstream gallery docs (Apache 2.0)
│   └── LICENSE                          ← Apache 2.0 (fork from google-ai-edge/gallery)
│
├── dashboard/                           ← NusaSiaga · Gemma Disaster Grid (Next.js)
│   ├── README.md
│   ├── src/                             ← App Router, components, hooks
│   ├── public/
│   └── package.json                     ← `npm install && npm run dev`
│
├── notebook/                            ← Kaggle 31B synthesis tier
│   ├── build_kaggle_notebook.py         ← deterministic builder
│   └── gemma_rescue_grid_kaggle.ipynb   ← one-shot end-to-end (E2B + routing + 31B)
│
├── grg/                                 ← Shared Python: Pydantic schemas + routing
│   ├── schemas.py
│   ├── routing.py                       ← the Cactus Prize hook
│   └── smoke_test.py
│
├── prompts/                             ← Locked system prompts (mirrored in Kotlin)
│   ├── edge_triage_system.md            ← Gemma 4 E2B
│   ├── cloud_synthesis_system.md        ← Gemma 4 31B
│   └── output_schemas.md
│
├── data/                                ← Three curated EdgeTriageReport scenarios
│   └── synthesis_scenarios/             ← (12 + 15 + 8 reports for the 31B notebook)
│
├── docs/
│   ├── architecture.md                  ← deep technical narrative
│   ├── TESTING.md                       ← reproducible per-feature test matrix
│   └── HOW-TO.md                        ← judges' onboarding walkthrough
│
└── writeup/
    ├── kaggle_writeup_v1.md             ← submission writeup (≤1500 words)
    ├── video_script_v1.md               ← 3-min video script
    └── demo_qr/                         ← pre-rendered QR samples for the mesh demo
```

The `dashboard/` and `android/` trees are also mirrored as deployment targets:
the dashboard auto-deploys from a sibling repo to <https://nusasiaga.vercel.app>,
and the APK was built from the corresponding gallery fork. The canonical source
of both is here; the mirrors only exist to keep the live demo and APK CI alive.

## What you can interact with right now

- **Live demo:** <https://nusasiaga.vercel.app> — unified operational map with disaster-type chip filters, live phone uploads landing in <10 s, live AQI/wind anchored to your browser's geolocation, global NASA FIRMS satellite hotspots.
- **APK:** attached to the Kaggle writeup. Install on any Android 12+ phone with ~3 GB free. The app is named **Gemma Rescue Grid**, opens to a single Disaster Triage tile, runs Gemma 4 E2B fully offline.
- **Kaggle notebook:** [`notebook/gemma_rescue_grid_kaggle.ipynb`](notebook/gemma_rescue_grid_kaggle.ipynb) — one **Run All** on 2× T4 demonstrates the entire platform end-to-end (edge tier with E2B → routing → sync simulation → 31B synthesis → dashboard module emission).
- **Reproducible tests:** [`docs/TESTING.md`](docs/TESTING.md) — per-feature verification matrix (L1 dashboard-only, L2 phone+dashboard, L3 Kaggle 31B reproduction).
- **Judge onboarding:** [`docs/HOW-TO.md`](docs/HOW-TO.md) — zero-to-working setup guide.

## License

Apache 2.0 for code (see [`LICENSE`](LICENSE) and [`android/LICENSE`](android/LICENSE)).
The Android tree is a fork of [`google-ai-edge/gallery`](https://github.com/google-ai-edge/gallery)
and preserves the upstream license and attribution.
Winning Submission, per Kaggle rules, will be CC-BY 4.0.
