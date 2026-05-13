# Gemma Rescue Grid — Android edge tier

The on-device tier of the Gemma Rescue Grid architecture. Runs Gemma 4 E2B fully offline via Google AI Edge LiteRT on a responder's phone, accepting a photograph plus optional voice or text annotation and emitting a structured `EdgeTriageReport` JSON object in under 5 seconds on a Snapdragon 8 Gen 2-class device.

This is the **field-responder** half of the system. The other half (cloud-tier 31B synthesis) lives in [`notebook/gemma_rescue_grid.ipynb`](../notebook/gemma_rescue_grid.ipynb).

---

## Status — 2026-05-14 — Day 3 shipped (tri-modal)

The Android edge tier is **functionally complete and verified end-to-end on real hardware in all three input modes**. A field responder can launch the app and triage via a photo, a voice note, or both — entirely offline, on a 2020 mid-range phone.

| Milestone | State |
|---|---|
| Gallery fork builds clean | ✅ Gradle sync ~22 min, unmodified gallery installs and runs |
| `gemma-4-E2B-it` available without HuggingFace OAuth | ✅ Listed in gallery's model picker out of the box |
| Multimodal inference verified on Samsung Galaxy A71 (Snapdragon 730, no NPU) | ✅ Image description in 20-60 s |
| Structured JSON output from our system prompt | ✅ First-shot valid `EdgeTriageReport` JSON, all enum/range/length constraints respected |
| Custom **Disaster Triage** task in the gallery (4 new files) | ✅ Hilt-discovered tile, locked system prompt, streaming inference, parsed result card |
| **Photo-only triage** | ✅ Verified on A71 |
| **Voice-only triage** | ✅ Verified on A71. 16 kHz mono PCM via `AudioRecord`, wrapped in a 44-byte RIFF/WAVE header (LiteRT-LM's `miniaudio` decoder rejects raw PCM with error -10) |
| **Photo + voice combined triage** | ✅ Verified on A71. Image is primary truth, voice provides context per the system prompt's modality-priority rules |
| `parseEdgeReport()` round-trips on real model output | ✅ Including envelope-field fallback (UUID + ISO timestamp generated app-side) |
| `decideRouting()` (Cactus Prize hook) rendered as fast/deep lane badge | ✅ |
| Hardware floor demonstrated | ✅ Snapdragon 730 (2020 mid-range) — well below the Snapdragon 8 Gen 2 baseline most LiteRT demos target |

The "CPU-bound 30-60 second" latency on a 5-year-old mid-range phone **is the Global Resilience point**: this is the device profile available in the field response contexts that benefit most from this work. We are not pitching a flagship-only system. Voice-only and combined triage land in the same latency band; the audio backend adds negligible overhead vs the vision pass.

---

## Drop-in Kotlin domain layer

The `app/src/main/kotlin/ai/grg/` directory contains four platform-agnostic Kotlin files you can drop straight into any Android project (or pure Kotlin/JVM project):

| File | Purpose |
|---|---|
| [`Schemas.kt`](app/src/main/kotlin/ai/grg/Schemas.kt) | `EdgeTriageReport`, `CommandCenterSynthesis`, enums, supporting types. Uses `kotlinx.serialization`. Mirrors `grg/schemas.py`. |
| [`EdgeTriagePrompt.kt`](app/src/main/kotlin/ai/grg/EdgeTriagePrompt.kt) | The exact system prompt sent to Gemma 4 E2B on every inference. Also defines recommended sampling parameters. |
| [`Routing.kt`](app/src/main/kotlin/ai/grg/Routing.kt) | `decideRouting(report, context)` — the Cactus Prize hook. Combines the model's self-assessment with app-level cross-report heuristics. |
| [`JsonExtraction.kt`](app/src/main/kotlin/ai/grg/JsonExtraction.kt) | `extractJsonFromModelOutput`, `attemptTruncatedJsonRepair`, and `parseEdgeReport` — robust parsing for whatever the model emits. |

Only Gradle dependency you must add: `org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.x` (and the `org.jetbrains.kotlin.plugin.serialization` plugin in your app `build.gradle.kts`).

---

## Approach: fork Google AI Edge Gallery, plug in a custom task

Rather than building the LiteRT-LM Kotlin integration from scratch (model download, multimodal prompt construction, streaming inference, camera permission flow, Compose scaffolding — all non-trivial), we forked `google-ai-edge/gallery` and added Disaster Triage as a new entry in its existing **custom-task plugin architecture**. Gallery's home screen iterates over a Hilt-injected `Set<CustomTask>`; ours joins the set at app startup.

That gave us all of the gallery's infrastructure for free and let us focus the four Day-3 files on what's actually disaster-specific: the locked system prompt, the structured result-card UI, and the Cactus Prize routing badge.

## Gallery integration — what shipped (Day 3)

Two pieces of code go into a gallery fork to turn it into Gemma Rescue Grid: a Hilt-discovered custom task (4 new files), and a 4-line patch to the gallery's model registry so it knows that any image-capable LLM is also a valid model for our task.

### Files in this repo

| File | Purpose |
|---|---|
| [`app/src/main/kotlin/com/google/ai/edge/gallery/customtasks/disastertriage/DisasterTriageTask.kt`](app/src/main/kotlin/com/google/ai/edge/gallery/customtasks/disastertriage/DisasterTriageTask.kt) | Implements `CustomTask`. Locks the system prompt to `ai.grg.EDGE_SYSTEM_PROMPT`; opts into `supportImage = true`. |
| [`DisasterTriageTaskModule.kt`](app/src/main/kotlin/com/google/ai/edge/gallery/customtasks/disastertriage/DisasterTriageTaskModule.kt) | Hilt `@Provides @IntoSet` binding so gallery auto-discovers the task. |
| [`DisasterTriageViewModel.kt`](app/src/main/kotlin/com/google/ai/edge/gallery/customtasks/disastertriage/DisasterTriageViewModel.kt) | Holds the captured bitmap + inference state; calls `runtimeHelper.runInference()`; parses the raw model output via `ai.grg.parseEdgeReport`; enriches with generated `report_id` (UUID) + ISO timestamp; runs `ai.grg.decideRouting()` for the Cactus Prize hook. |
| [`DisasterTriageScreen.kt`](app/src/main/kotlin/com/google/ai/edge/gallery/customtasks/disastertriage/DisasterTriageScreen.kt) | Compose UI: header → photo card → "Snap & triage" → streaming inference state → result card (severity badge color-coded 1-5, hazards as chips, people breakdown, highlighted immediate-action callout, routing decision with fast/deep-lane color). |

These files have no real platform dependencies beyond the gallery types they import — copy them into a freshly-forked `google-ai-edge/gallery` at the same `app/src/main/...` path and they compile.

### Required patch to gallery's model registry

`ui/modelmanager/ModelManagerViewModel.kt#loadModelAllowlist()` builds the `task → models` mapping from each model's `taskTypes` list in the allowlist JSON. The allowlist is hosted externally (it doesn't know about our custom task ID), so without this patch our task tile would open into an empty model picker and immediately pop back.

Add this block right after the existing `for (taskType in allowedModel.taskTypes) { ... }` loop, alongside the existing `LLM_TINY_GARDEN` special-case:

```kotlin
// Gemma Rescue Grid: any image-capable LLM (E2B / E4B) can power
// on-device disaster triage. The allowlist JSON doesn't know about
// our custom task id, so attach matching models here.
if (allowedModel.taskTypes.contains(BuiltInTaskId.LLM_ASK_IMAGE)) {
  val triageTask =
    curTasks.find {
      it.id ==
        com.google.ai.edge.gallery.customtasks.disastertriage.DisasterTriageTask.TASK_ID
    }
  triageTask?.models?.add(model)
}
```

That's the entire customization. The gallery's scaffold, model lifecycle, config UI, and accelerator picker carry over unchanged.

---

## End-to-end inference flow (target)

```
User opens the app                                 ▼
                                          ┌────────────────┐
   Tap [Snap]      ─── camera capture ──▶ │  Bitmap photo  │
                                          └────────────────┘
                                                   │
   Optional: long-press [Snap] for                 │
   voice note (16 kHz mono PCM)                    │
                                                   ▼
                                          ┌────────────────┐
                                          │  LiteRT-LM     │
                                          │  Gemma 4 E2B   │
                                          │  + system      │
                                          │  prompt        │
                                          └────────────────┘
                                                   │
                                          raw text output
                                                   │
                                                   ▼
                                          ┌────────────────┐
                                          │ parseEdgeReport│
                                          │  (extract +    │
                                          │  repair +      │
                                          │  validate)     │
                                          └────────────────┘
                                                   │
                                          EdgeTriageReport
                                                   │
                                                   ▼
                                          ┌────────────────┐
                                          │ decideRouting  │
                                          │  (Cactus hook) │
                                          └────────────────┘
                                                   │
                                          RoutingDecision
                                                   │
                                                   ▼
                                          ┌────────────────┐
                                          │  Result screen │
                                          │  + Save & Queue│
                                          └────────────────┘
```

## Sampling, latency, and memory budget

| Device class | Cold model load | First inference | Subsequent inference | Memory |
|---|---|---|---|---|
| Snapdragon 8 Gen 2 / Pixel 8 Pro (Google's published estimate) | ~8 sec | ~5 sec | ~3 sec | ~2.5 GB |
| Snapdragon 7+ Gen 3 / mid-range (Google's published estimate) | ~12 sec | ~8 sec | ~5 sec | ~2.5 GB |
| **Snapdragon 730 / Samsung Galaxy A71 (our measured floor, 2020 mid-range, no NPU)** | **~25 sec** | **30-60 sec** | **30-60 sec** | OK on 6 GB device |

The Snapdragon 730 row is our actual demo device, deliberately chosen as the worst-case hardware floor available. The "30-60 second triage on a 5-year-old phone" is the Global Resilience demonstration: when even this works, the architecture is viable on the device profile field response contexts can rely on.

For sampling we recommend the `EdgeSamplingParams.DETERMINISTIC_*` profile (temperature 0.4, top-p 0.9) for JSON adherence. At the gallery's default chat-mode sampling (temperature 1.0) the JSON-strict prompt is roughly a coin flip; at 0.4 Gemma 4 E2B holds the format reliably.

## Build & install

Standard Android workflow once Gallery is forked and customized:

```bash
cd android
./gradlew :app:assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
# Attach this APK to the Kaggle Writeup as a file (per submission rules).
```

Target APK size: <50 MB (the model is downloaded on first run, not bundled).

## What we are NOT building

- Login / account system
- Cloud configuration UI (endpoint is hardcoded for demo)
- Multi-user/team features
- Map view in the app (the dashboard tab in NusaSiaga is the ops view)
- Push notifications
- Background sync service (foreground sync only — keeps battery story honest)
- iOS port (LiteRT-LM Swift is still maturing; out of hackathon scope)

## Privacy posture

No telemetry. No Firebase. No Crashlytics. No analytics SDKs. The MVP build phones home to nothing. Photos and audio stay on the device unless the user explicitly queues a report for sync. This is documented prominently in the Kaggle Writeup as an ethics differentiator.
