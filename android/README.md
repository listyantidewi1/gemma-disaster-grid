# Gemma Rescue Grid — Android edge tier

The on-device tier of the Gemma Rescue Grid architecture. Runs Gemma 4 E2B fully offline via Google AI Edge LiteRT on a responder's phone, accepting a photograph plus optional voice or text annotation and emitting a structured `EdgeTriageReport` JSON object in under 5 seconds on a Snapdragon 8 Gen 2-class device.

This is the **field-responder** half of the system. The other half (cloud-tier 31B synthesis) lives in [`notebook/gemma_rescue_grid.ipynb`](../notebook/gemma_rescue_grid.ipynb).

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

## Recommended approach: fork Google AI Edge Gallery

Don't build the LiteRT integration from scratch. Fork:

```bash
git clone https://github.com/google-ai-edge/gallery
```

Gallery already implements:
- LiteRT-LM model download + loading
- Multimodal prompt construction (text + image + audio)
- Inference loop with streaming
- A working camera permission + capture flow
- Compose UI scaffolding

**What you change to make it Gemma Rescue Grid:**

| Gallery file | Change |
|---|---|
| Model selection / download | Pin to `litert-community/gemma-4-E2B-it-litert-lm` only. Hide other models from the UI. |
| Chat screen | Replace the free-form chat with a single-button "Snap & Triage" capture flow. Use CameraX or `ACTION_IMAGE_CAPTURE`. |
| Prompt construction | Always prepend `ai.grg.EDGE_SYSTEM_PROMPT` as the first user-turn content. |
| Output rendering | Parse output with `ai.grg.parseEdgeReport()`. Render an `EdgeTriageReport` as a result card: severity badge, hazards list, immediate action, routing badge. |
| Sampling | Use `ai.grg.EdgeSamplingParams.TEMPERATURE = 1.0f, TOP_P = 0.95f, TOP_K = 64, MAX_NEW_TOKENS = 512`. |
| Queue / sync (Day 4) | Add a Room database table for `EdgeTriageReport`. For demo: just toggle a "synced" flag locally; no real HTTPS upload needed. |

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

| Device class | Cold model load | First inference | Subsequent inference | VRAM |
|---|---|---|---|---|
| Snapdragon 8 Gen 2 / Pixel 8 Pro | ~8 sec | ~5 sec | ~3 sec | ~2.5 GB |
| Snapdragon 7+ Gen 3 / mid-range | ~12 sec | ~8 sec | ~5 sec | ~2.5 GB |
| Snapdragon 6 series | ~20 sec | ~15 sec | ~10 sec | tight (4 GB phones may swap) |

Numbers are Google AI Edge published estimates; we'll record real ones on the user's TUF A15 + their test Android phone for the writeup.

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
