# Gemma Rescue Grid — Android edge tier

The on-device tier of the **Gemma Disaster Grid** architecture, shipped as the **Gemma Rescue Grid** Android app. Runs Gemma 4 E2B fully offline via Google AI Edge LiteRT on a responder's phone, accepting a photograph plus optional voice or text annotation and emitting a structured `EdgeTriageReport` JSON object in under 5 seconds on a Snapdragon 8 Gen 2-class device.

This is the **field-responder** half of the system. The other half (cloud-tier 31B synthesis) lives in [`notebook/gemma_rescue_grid.ipynb`](../notebook/gemma_rescue_grid.ipynb).

---

## Status — 2026-05-15 — End-to-end shipped

The Android edge tier is **functionally complete** and the **phone → dashboard pipeline is live**. A field responder can launch the rebranded **Gemma Rescue Grid** app, triage a scene via photo / voice / both fully offline, and the structured report uploads to the operations dashboard the moment connectivity returns — including from a process that has been killed and reopened.

| Milestone | State |
|---|---|
| Gallery fork builds clean + rebranded | ✅ App launcher reads "Gemma Rescue Grid", red warning-triangle adaptive icon, single Disaster Triage tile (all other gallery tasks filtered out at the Hilt set level) |
| `gemma-4-E2B-it` multimodal on Samsung Galaxy A71 (2020, Snapdragon 730, no NPU) | ✅ 30–60 s end-to-end per triage; CPU-bound, deliberately the device profile our Global Resilience pitch targets |
| Structured JSON output from our locked system prompt | ✅ First-shot valid `EdgeTriageReport`, all enum / range / length constraints respected |
| **Photo / Voice / Photo+Voice triage** | ✅ All three modes verified on the A71. Voice uses 16 kHz mono PCM via `AudioRecord` wrapped in a 44-byte RIFF/WAVE header so LiteRT-LM's `miniaudio` decoder will accept it. |
| `parseEdgeReport()` round-trips on real model output | ✅ Envelope-field fallback (UUID + ISO timestamp generated app-side) |
| `decideRouting()` (Cactus Prize hook) rendered as fast/deep lane badge | ✅ |
| **GPS + reverse geocoding** on every report | ✅ `FusedLocationProviderClient` with `CurrentLocationRequest` (4 s timeout, balanced-power-accuracy), `Geocoder` for the `subLocality, adminArea, country` label. Falls back gracefully to empty fields when permission denied. |
| **Phone → dashboard live sync** | ✅ `TriageUploader` does HTTPS POST to `https://nusasiaga.vercel.app/api/reports` with a shared-secret token. Dashboard surfaces the report within ~10 s. |
| **Offline queue + background sync** | ✅ SharedPreferences-backed `TriageQueue` (survives app kill), `TriageSyncManager` drains on `ConnectivityManager.NetworkCallback` + on every triage attempt, plus a `WorkManager` `CoroutineWorker` (`NetworkType.CONNECTED`, 30-min periodic + expedited one-time) for true background sync. New `SyncState.Queued` UI state; queued count visible in the header pill. |
| Hardware floor demonstrated | ✅ Snapdragon 730 (2020 mid-range) — well below the Snapdragon 8 Gen 2 baseline most LiteRT demos target |

The "CPU-bound 30-60 second" latency on a 5-year-old mid-range phone **is the Global Resilience point**: this is the device profile available in the field response contexts that benefit most from this work. We are not pitching a flagship-only system. Voice-only and combined triage land in the same latency band; the audio backend adds negligible overhead vs the vision pass.

### Recommended end-to-end demo cycle

1. Connected baseline — triage once, watch the sync chip turn green and the card appear in the dashboard's "Live field reports" panel within 10 s.
2. Toggle airplane mode on, triage 2–3 times. Each result card chip lands on amber **Queued for retry** with reason text. Header pill reads "N queued".
3. Force-quit the app from recents. Pending state persists across the kill.
4. Reopen the app — pending pill still shows N.
5. Toggle airplane mode off. Within ~5 s the connectivity callback fires, the queue drains, chips go green, dashboard fills in.
6. (Bonus, for the writeup) Force-quit *while* offline, then turn wifi on without reopening. Within ~15–30 minutes the periodic `WorkManager` job drains the queue with the app closed.

A fuller per-feature test matrix — including QR-mesh peer hand-off, share-intent receive path, server-side dedup, and reporter-vs-crowd resolve — lives in [`docs/TESTING.md`](../docs/TESTING.md). The judges' zero-to-working onboarding guide is at [`docs/HOW-TO.md`](../docs/HOW-TO.md).

---

## Drop-in Kotlin domain layer

The `app/src/main/kotlin/ai/grg/` directory contains **nine** Kotlin files. The first four are platform-agnostic schema + prompt + routing + parser (drop into any Kotlin/Android project); the rest depend on the Android SDK and `play-services-location` / `androidx.work`.

| File | Purpose |
|---|---|
| [`Schemas.kt`](app/src/main/kotlin/ai/grg/Schemas.kt) | `EdgeTriageReport`, `CommandCenterSynthesis`, enums, supporting types. Uses `kotlinx.serialization`. Mirrors `grg/schemas.py`. |
| [`EdgeTriagePrompt.kt`](app/src/main/kotlin/ai/grg/EdgeTriagePrompt.kt) | The exact system prompt sent to Gemma 4 E2B on every inference. Modality-flexible (photo / voice / both). Also defines recommended sampling parameters. |
| [`Routing.kt`](app/src/main/kotlin/ai/grg/Routing.kt) | `decideRouting(report, context)` — the Cactus Prize hook. Combines the model's self-assessment with app-level cross-report heuristics. |
| [`JsonExtraction.kt`](app/src/main/kotlin/ai/grg/JsonExtraction.kt) | `extractJsonFromModelOutput`, `attemptTruncatedJsonRepair`, and `parseEdgeReport` — robust parsing for whatever the model emits. |
| [`TriageConfig.kt`](app/src/main/kotlin/ai/grg/TriageConfig.kt) | Constants — dashboard ingest URL, shared-secret token, network timeouts. |
| [`TriageUploader.kt`](app/src/main/kotlin/ai/grg/TriageUploader.kt) | `suspend fun upload(report): UploadResult`. HTTPS POST via `HttpURLConnection` (zero new deps). Sealed result: `Success`, `HttpError(code)`, `NetworkError`. |
| [`LocationProvider.kt`](app/src/main/kotlin/ai/grg/LocationProvider.kt) | Two-stage location fetch via `FusedLocationProviderClient` (cached `lastLocation` if < 60 s old, otherwise a fresh `CurrentLocationRequest` with 4 s timeout). Reverse-geocodes the result via `Geocoder` to produce a `subLocality, adminArea, country` label. Never throws. |
| [`TriageQueue.kt`](app/src/main/kotlin/ai/grg/TriageQueue.kt) | SharedPreferences-backed persistent queue of pending `EdgeTriageReport`s. Exposes `StateFlow<List<EdgeTriageReport>>` for live UI badges. |
| [`TriageSyncManager.kt`](app/src/main/kotlin/ai/grg/TriageSyncManager.kt) | Orchestrator. `syncOnce()` drains the queue and classifies outcomes (4xx → drop, 5xx / network → leave queued). `scheduleBackgroundSync()` enqueues an expedited one-time + a 30-min periodic `WorkManager` job under `NetworkType.CONNECTED`. `registerConnectivityCallback()` returns an unregister lambda — drains the moment the radio reappears. |
| [`SyncWorker.kt`](app/src/main/kotlin/ai/grg/SyncWorker.kt) | Plain `CoroutineWorker` (no `HiltWorker` needed; matches the gallery's existing `DownloadWorker` pattern). `doWork` calls `TriageSyncManager.syncOnce()`. Returns `Result.retry` if items remain so WorkManager rescheduules with exponential backoff. |

Gradle dependencies the on-device path adds: `kotlinx-serialization-json:1.6.x`, `play-services-location:21.3.0` (already present via tflite tree, free upgrade), `androidx.work:work-runtime-ktx` (already in the gallery). The `org.jetbrains.kotlin.plugin.serialization` plugin must be on the `app/build.gradle.kts`.

---

## Approach: fork Google AI Edge Gallery, plug in a custom task

Rather than building the LiteRT-LM Kotlin integration from scratch (model download, multimodal prompt construction, streaming inference, camera permission flow, Compose scaffolding — all non-trivial), we forked `google-ai-edge/gallery` and added Disaster Triage as a new entry in its existing **custom-task plugin architecture**. Gallery's home screen iterates over a Hilt-injected `Set<CustomTask>`; ours joins the set at app startup.

That gave us all of the gallery's infrastructure for free and let us focus the four Day-3 files on what's actually disaster-specific: the locked system prompt, the structured result-card UI, and the Cactus Prize routing badge.

## Gallery integration — what shipped

Five buckets of change turn a vanilla `google-ai-edge/gallery` fork into Gemma Rescue Grid. **(1)** the custom Disaster Triage task (4 new files in a new package), **(2)** the on-device sync + offline-queue + GPS stack (the 6 newer `ai.grg.*` files above), **(3)** a 4-line patch to the gallery's model registry so image-capable LLMs attach to our task ID, **(4)** the `getActiveCustomTasks()` filter so the home screen renders only our tile, and **(5)** rebrand resources (`strings.xml`, manifest `android:label`, new adaptive launcher icon, `gm4=false` flag flip + defensive `listOfNotNull` patch in `HomeScreen.kt`).

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

That's the customization. The gallery's scaffold, model lifecycle, config UI, and accelerator picker carry over unchanged.

### Other patches required for the rebrand

| File | Change |
|---|---|
| `ui/modelmanager/ModelManagerViewModel.kt#getActiveCustomTasks()` | Filter the Hilt-injected `Set<CustomTask>` to only `DisasterTriageTask.TASK_ID`. Hides all the gallery's built-in tiles (Chat, Ask Image, Mobile Actions, Tiny Garden, etc.) without removing them from the codebase. |
| `ui/navigation/GalleryNavGraph.kt` | Flip `gm4 = true` → `gm4 = false` on the home screen call site. The `gm4` highlighted-tiles section hard-required `LLM_CHAT` and `LLM_AGENT_CHAT` which our task filter removes, causing an NPE. |
| `ui/home/HomeScreen.kt` | Defensive: `listOf(getTaskById(...)!!)` → `listOfNotNull(getTaskById(...))` so future re-enables of `gm4` don't crash when a built-in task is absent. |
| `res/values/strings.xml` | `app_name` "Google AI Edge Gallery" → "Gemma Rescue Grid". `app_name_first_part` / `_second_part` adjusted so the two-line home title reads "Gemma / Rescue Grid". `app_intro` rewritten. `tos_dialog_title_app` rewritten. |
| `AndroidManifest.xml` | `<application android:label>` was a literal "Edge Gallery" — switched to `@string/app_name`. Added `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION` permissions for the GPS path. |
| `res/mipmap-anydpi-v26/ic_launcher.xml` | Adaptive launcher icon rewritten: deep-red diagonal gradient background, white warning-triangle foreground (Material Symbols `warning` glyph scaled 3× and centred in the 72 dp safe zone via a new `res/drawable/ic_grg_warning_foreground.xml`). |
| `gradle/libs.versions.toml` + `app/build.gradle.kts` | Added `play-services-location:21.3.0` for `FusedLocationProviderClient`. |

### Phone → dashboard wire

After triage finishes, the report is enqueued in `TriageQueue` and a sync is attempted immediately. The HTTPS POST goes to `https://nusasiaga.vercel.app/api/reports` with an `X-Triage-Token` header matched against the server's `TRIAGE_INGEST_TOKEN` env var. Server side stores the report in Upstash Redis (provisioned through the Vercel Marketplace) and the dashboard's `useLiveReports` hook polls `/api/reports` every 10 s to surface it in the operational map + live-feed panel.

If the upload fails (offline, server 5xx), the report stays in the queue and the user sees an amber **Queued for retry** chip with reason text. Three retry paths converge on the same queue:

1. **Foreground / immediate**: every successful triage re-attempts the drain.
2. **Connectivity-driven**: a `ConnectivityManager.NetworkCallback` registered while the screen is visible fires `syncOnce()` the moment a validated internet path appears.
3. **Background / app-closed**: `WorkManager` runs `SyncWorker` every 30 minutes under `NetworkType.CONNECTED`, plus an expedited one-time job is enqueued after every triage. So even if the user closes the app between captures, queued reports drain themselves the next time Android has a moment.

Hard server errors (4xx — schema mismatch, auth failure) drop the offending report from the queue rather than loop forever on a poison record. The result-card chip surfaces the reason and offers a manual retry button.

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
