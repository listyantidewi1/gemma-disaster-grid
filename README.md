# Gemma Disaster Grid

*The Python, Android, and Kaggle notebook tiers of **Gemma Disaster Grid** — an offline-first disaster intelligence platform built on Gemma 4, for communities anywhere. The dashboard tier lives at [**NusaSiaga · Gemma Disaster Grid**](https://github.com/listyantidewi1/nusasiaga). Live demo: <https://nusasiaga.vercel.app>.*

When the cell tower dies, coordination dies with it. Gemma Disaster Grid puts a multimodal first responder in every pocket via the **Gemma Rescue Grid** Android app, then synthesizes every field report into a single operating picture the moment the signal returns. The architecture is disaster-type-agnostic — wildfire, flood, earthquake, industrial fire today; tsunami, landslide, volcanic, storm next.

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
│   ├── architecture.md                  ← deep technical narrative
│   ├── TESTING.md                       ← reproducible per-feature test matrix (L1/L2/L3)
│   ├── HOW-TO.md                        ← judges' onboarding walkthrough
│   ├── TEAM_PLAN.en.md / TEAM_PLAN.id.md ← bilingual day-by-day plan
│   └── nusasiaga_integration_brief.md   ← phone ↔ dashboard JSON contract
├── prompts/
│   ├── output_schemas.md                ← JSON data contract (edge + cloud)
│   ├── edge_triage_system.md            ← E2B system prompt
│   └── cloud_synthesis_system.md        ← 31B system prompt
├── grg/                                 ← Pydantic schemas + routing + smoke tests
├── notebook/
│   ├── build_kaggle_notebook.py         ← deterministic builder for the .ipynb
│   └── gemma_rescue_grid_kaggle.ipynb   ← Kaggle 2× T4 31B synthesis notebook
├── android/                             ← Kotlin domain layer (drop-in) + edge-tier README
├── data/                                ← Three curated scenarios (12 + 15 + 8 reports)
└── writeup/
    ├── kaggle_writeup_v1.md             ← submission writeup (≤1500 words)
    ├── kaggle_writeup_v0.5.md / outline ← earlier drafts (kept for diff)
    ├── video_script_v1.md               ← 3-min video script
    └── demo_qr/                         ← pre-rendered QR samples for the mesh demo
```

## Status — 2026-05-15

| Day | Status |
|---|---|
| Day 1 — 13 May | ✅ Foundation: schemas, prompts, three scenarios, routing, Colab notebook end-to-end. Synthesis verified on Gemma 4 E4B. Dual-track NusaSiaga dashboard with unified disaster-type picker. Kotlin domain scaffold. Writeup v0.5 (1573 words). Bilingual team plan. |
| Day 2 — 14 May | ✅ Shipped. Android Studio installed, gallery forked, sync clean, build passes. `gemma-4-E2B-it` confirmed available in gallery picker without HuggingFace OAuth. First multimodal inference verified on Samsung Galaxy A71 (2020 mid-range, Snapdragon 730, no NPU). |
| Day 3 — 14 May (one day ahead of plan) | ✅ Shipped tri-modal. Edge tier functionally complete in **all three input modes**: photo-only, voice-only, and photo+voice combined. Validated `EdgeTriageReport` JSON output from our locked system prompt on Galaxy A71 (first-shot valid; all enum, range, and length constraints respected). Four Kotlin files for a "Disaster Triage" custom task in the gallery fork — Hilt-discovered tile, photo capture, voice capture (16 kHz mono PCM in a RIFF/WAVE wrapper for LiteRT-LM's miniaudio decoder), streaming inference, parsed result card. System prompt revised to handle all three modality combinations without changing the validated JSON contract. |
| Day 3+ — 15 May (overshoot) | ✅ **Full live phone → dashboard pipeline**: `/api/reports` route on the dashboard with **Upstash Redis** storage, Android `TriageUploader` doing HTTPS POST with shared-secret auth, dashboard's **IncomingReportsPanel** + **live pin overlay on the FloodMap** (pulsing rings vs solid scenario pins). **Offline-first sync stack**: SharedPreferences-backed `TriageQueue`, `TriageSyncManager` with `ConnectivityManager.NetworkCallback` for opportunistic drain, `SyncWorker` (WorkManager with `NetworkType.CONNECTED`, 30-min periodic + expedited one-time) so the queue drains even after the app is killed. New `SyncState.Queued` UI state + pending-count pill in the app header. **GPS + reverse geocoding** stamped on every report. **App rebrand**: name "Gemma Rescue Grid", red warning-triangle adaptive icon, single-tile home (Disaster Triage only). **Dashboard restructure**: dropped scenario picker, unified operational map merging all three pre-baked scenarios + live phone uploads with disaster-type chip filters, two-mode toggle (Triage Operations / Wildfire Monitoring). **Global FIRMS**: bbox widened from Indonesia-only to worldwide, continental fallback regions, top-500-FRP cap. **Live EnvironmentStats**: Open-Meteo AQI + wind anchored at the user's location, CO₂ estimate computed from FIRMS FRP totals (peatland-weighted), severity-bucket priority. **IncidentFeed pivoted to real**: FIRMS hotspots ranked by severity × proximity to viewer. **User location resolution**: GPS → IP (ipapi.co) → Jakarta default. |
| Day 3+ — 15 May (overshoot continued) | ✅ **Trust gradient + offline-for-days resilience**: reporter-side single-tap resolve (PATCH `/api/reports/{id}`), dashboard-side 5-vote crowd consensus (POST `/api/reports/{id}/vote` with localStorage-persisted voter UUID), QR-mesh peer hand-off (`QrCodeRenderer` + `QrCodeScanner` via ZXing), Android share-intent receive path (`ACTION_SEND text/plain` filter on MainActivity), re-share QR dialog from any unresolved row in Recent reports, server-side dedupe by `report_id` so QR mesh never floods the dashboard. **Docs sprint**: [Kaggle writeup v1](writeup/kaggle_writeup_v1.md) (≤1500 words), [Kaggle synthesis notebook](notebook/gemma_rescue_grid_kaggle.ipynb) + deterministic builder script, [TESTING.md](docs/TESTING.md) (L1/L2/L3 reproducible matrix), [HOW-TO.md](docs/HOW-TO.md) (judges' onboarding). |
| Day 4 — 16 May | Kaggle quota resets. Run [notebook/gemma_rescue_grid_kaggle.ipynb](notebook/gemma_rescue_grid_kaggle.ipynb) on 2× T4 with `unsloth/gemma-4-31B-it` for all three scenarios. Drop emitted `synthesis-scenario-{a,b,c}.ts` modules into `nusasiaga/src/lib/`; flip B and C from `pending` to `generated`. |
| Day 5 — 17 May | Film 3-min video (see [video_script_v1.md](writeup/video_script_v1.md)). Optional Unsloth fine-tune. Optional wildfire user-report scenario. |
| Day 6 — 18 May | Trim writeup to ≤1500 words, dry run, **submit before 11:59 PM UTC**. |

## What you can interact with right now

- **Live demo**: <https://nusasiaga.vercel.app> — unified operational map with disaster-type chip filters, live phone uploads landing in <10 s, live AQI/wind anchored to your browser's geolocation, global NASA FIRMS satellite hotspots. The map's "Fit to all" toggle zooms out across continents when reports land from outside the scenario region.
- **APK**: install the gallery fork from `listyantidewi1/gallery` onto any Android phone with ~3 GB free. The app is named **Gemma Rescue Grid**, opens to a single Disaster Triage tile, runs Gemma 4 E2B fully offline. Snap a photo, record a voice note, or both — the resulting triage JSON uploads to the dashboard within ~10 s of getting connectivity (saved locally and retried in the background via WorkManager if offline).
- **Reproducible tests**: see [docs/TESTING.md](docs/TESTING.md) for the per-feature verification matrix (L1 dashboard-only, L2 phone+dashboard, L3 Kaggle 31B reproduction).
- **Judge onboarding walkthrough**: see [docs/HOW-TO.md](docs/HOW-TO.md) for the zero-to-working setup guide.

## License

Code: Apache 2.0. Winning Submission, per Kaggle rules, will be CC-BY 4.0.
