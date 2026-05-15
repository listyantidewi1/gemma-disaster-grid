# NusaSiaga · Gemma Disaster Grid

### Offline-first disaster intelligence powered by Gemma 4 — from the responder's phone to the command center, even when the cell tower is gone

**Tracks:** Impact / Global Resilience · Special Tech / Cactus (intelligent on-device routing)
**Live demo:** <https://nusasiaga.vercel.app>
**Code:** [github.com/listyantidewi1/gemma-disaster-grid](https://github.com/listyantidewi1/gemma-disaster-grid) · [github.com/listyantidewi1/nusasiaga](https://github.com/listyantidewi1/nusasiaga) · [github.com/listyantidewi1/gallery](https://github.com/listyantidewi1/gallery) (Android fork)
**Video:** *(YouTube link added at submission)*
**APK:** *(attached to this writeup)*

---

## The first hour

On 21 November 2024 a shallow magnitude 5.6 earthquake struck Cianjur, West Java. More than 600 died, most in the first hours. Indonesian responders said the same thing they always say after a disaster — the same thing responders say after a hurricane in the Caribbean, a flood in Bangladesh, a wildfire in California: information arrived as fifty unsynced WhatsApp messages and a hundred photos. The deadliest hour was spent reading, not acting.

The problem is not that AI cannot help. The problem is that disaster AI today either (a) needs steady cloud connectivity to function, or (b) is text-only and cannot read a photograph of a flooded street. In a disaster zone — anywhere — both assumptions fail at exactly the moment they matter most.

Gemma 4 is the first open model family that spans this gap: frontier 31B reasoning in the cloud, plus a multimodal 2.3B-effective-parameter sibling that runs entirely on a 2020 mid-range phone via Google AI Edge LiteRT. We built **Gemma Disaster Grid** — a platform with the **Gemma Rescue Grid** Android app on the responder's phone and the **NusaSiaga · Gemma Disaster Grid** dashboard at the command center — to put both ends of that family in the same response stack, and to keep working even when the radio is dead for days.

## Solution at a glance

A field responder in a possibly-disconnected zone opens a single-tile Android app called **Gemma Rescue Grid**. They snap a photo of the scene, record a short voice note, or both. **Gemma 4 E2B**, fully offline on the phone, produces a structured `EdgeTriageReport` JSON: disaster type, severity 1–5, hazards visible, vulnerable people, the single most important action for the next ten minutes, plus the model's own self-assessment of whether the case needs deeper synthesis. The report is GPS-stamped and reverse-geocoded.

The report is held in a persistent local queue. The moment connectivity returns — even after the app has been killed for hours — a `WorkManager` background job uploads queued reports to a Vercel-hosted command center. **Gemma 4 31B** on Kaggle 2× T4 (Unsloth 4-bit) then consolidates the reports into a single `CommandCenterSynthesis` JSON: priority zones, ranked actions, consolidated hazards, validity flags. The web dashboard renders this synthesis live, alongside a worldwide NASA FIRMS satellite layer.

When connectivity is gone for *days*, responders fall back to peer hand-off: any unresolved report on the phone exposes a QR code and an Android share-intent button. A second phone scans or receives the JSON, which then rides forward on the next-online phone in the chain. Server-side deduplication on `report_id` ensures the dashboard sees each report exactly once no matter how many phones relayed it.

**Same Gemma 4 family at every scale. One JSON contract end to end. Apache 2.0 throughout.**

## Architecture

```
   PHONE  (Gemma Rescue Grid app, offline by default)
   ─────────────────────────────────────────────────────
   Gemma 4 E2B  •  Google AI Edge LiteRT  •  ~1.5 GB Q4
   Multimodal: photo + voice + both modalities together
   ↓
   EdgeTriageReport JSON  (severity, hazards, action, routing)
   ↓
   Local queue ─── connectivity-driven WorkManager sync ───┐
        │                                                  │
        │  Peer mesh: QR scan / Android share-intent       │
        │  for the no-connectivity-for-days case           │
        ↓                                                  ↓
   COMMAND CENTER (Vercel /api/reports + Upstash Redis)    │
   ─────────────────────────────────────────────────────   │
   Server-side reverse geocode · dedupe by report_id ←─────┘
   ↓
   Gemma 4 31B  •  Kaggle 2× T4  •  Unsloth 4-bit  •  16k ctx
   ↓
   CommandCenterSynthesis JSON  (priority zones, ranked actions)
   ↓
   Dashboard  ·  Triage Operations  /  Wildfire Monitoring
   live phone uploads + global NASA FIRMS satellite hotspots
```

**Edge tier.** Kotlin Android app forked from `google-ai-edge/gallery`. We added a custom `DisasterTriage` task to its Hilt-injected plugin set, rebranded the launcher (red warning-triangle icon, "Gemma Rescue Grid" name), and filtered the home screen to surface only that one task. Inference runs against `litert-community/gemma-4-E2B-it-litert-lm` (2.5 GB on disk, ~1.5 GB resident at INT4). The system prompt is locked in app — every triage produces JSON conforming to `EdgeTriageReport`, modality-flexible (photo, voice, or both). The result card renders severity, hazards, immediate action, and a fast/deep-lane routing badge.

**Sync tier.** A `TriageQueue` backed by `SharedPreferences` holds each report with a `pending/synced/ended` status and a `self/qr/share` provenance source. A `TriageSyncManager` drains it through three triggers: in-foreground after each triage, a `ConnectivityManager.NetworkCallback` that fires the instant a validated internet path appears, and a 30-minute periodic `WorkManager` job that runs even after the user kills the app.

**Cloud tier.** `/api/reports` on the Vercel deployment ingests POSTs gated by a shared secret. Reports are stored in Upstash Redis (provisioned through the Vercel Marketplace), deduped by `report_id`, and surfaced to the dashboard via a polling hook. Server-side reverse geocoding (BigDataCloud free endpoint) fills missing place labels for reports the phone uploaded offline.

**Synthesis tier.** A Kaggle notebook (`gemma_rescue_grid_kaggle.ipynb` in the repo) loads Gemma 4 31B via Unsloth `FastModel` with `device_map="balanced"`, processes all three pre-curated scenarios (12, 15, 8 reports respectively), and emits drop-in TypeScript modules that the dashboard imports as `synthesis-scenario-{a,b,c}.ts`.

**Dashboard.** Next.js 16 on Vercel. Two-mode toggle — Triage Operations / Wildfire Monitoring — replaced the original four-way scenario picker. A unified operational map merges every scenario's pre-baked reports with live phone uploads, filterable by a 10-chip disaster-type bar. The Environmental Intelligence panel reads real-time AQI and wind from Open-Meteo, anchored at the viewer's geolocation. The incident feed ranks every NASA FIRMS satellite hotspot by severity × proximity to the viewer.

## Trust and resilience

Three things make this more than a demo:

**Trust gradient on resolution.** Who marks a disaster "ended" matters. The reporter who triaged it knows the ground truth — single tap on their own row, instant resolution, stamped `_resolved_by: "reporter"`. Anonymous dashboard viewers cannot be trusted individually, but consensus can — each browser gets one vote, threshold 5 votes flips the report to ended with `_resolved_by: "crowd"`. Two distinct trust paths, the same data model.

**Offline-for-days handoff.** A flooded village can stay disconnected for days. A responder taps "Show QR" on any unresolved report; another responder scans it; the receiving phone's queue picks up the report and forwards it the moment any phone in the chain gets connectivity. An Android share-intent on the same report opens the system share sheet — Bluetooth, Nearby Share, Signal, email, whatever channel works at that moment. Inbound `ACTION_SEND` is registered against our `MainActivity`, so any text payload that parses as `EdgeTriageReport` auto-imports.

**Hardware floor.** All edge-tier verification was done on a **Samsung Galaxy A71 (2020, Snapdragon 730, no NPU)** — deliberately below the Snapdragon 8 Gen 2 baseline most LiteRT demos target. Triage runs in 30–60 seconds per inference; CPU-bound and battery-conscious. That latency is the Global Resilience point: this is the device profile the field-response contexts that matter most can actually afford.

## Cactus Prize angle

Every `EdgeTriageReport` carries the on-device model's own `routing_recommendation` (fast lane / deep lane) and `routing_rationale`. The app layer combines that self-assessment with cross-report heuristics — recurring location within 60 minutes, trapped persons visible, low confidence — to decide whether the report stays local or queues for 31B synthesis. The routing decision is visible to the operator as a badge on every result card. Intelligent local-first routing between two Gemma 4 models is the canonical Cactus Prize pattern, and we are running it on a 5-year-old mid-range phone.

## What we shipped vs. what is v1.1

**Shipped:** full pipeline phone → dashboard, tri-modal triage (photo + voice + both), live sync with offline queue, WorkManager background drain, QR-mesh + share-intent peer handoff, reporter and crowd resolution paths, real-time AQI/wind, global FIRMS, three pre-curated scenarios, drop-in TypeScript modules for the Day-4 31B synthesis, bilingual team plan and documentation.

**v1.1 roadmap:** Bluetooth LE peer discovery so phones in proximity gossip without line-of-sight, dynamic clustering of incidents across reports, multi-organisation operator accounts, server-side incident closure workflow, mobile dashboard view for ops coordinators in the field.

We are not pitching a flagship-only system. We are not pitching a cloud-dependent system. We are pitching a Gemma 4 system that keeps working when the cell tower is gone for days, on the phones people already have. That is what offline-first disaster response means.
