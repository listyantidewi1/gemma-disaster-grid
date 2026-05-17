# Gemma Rescue Grid — Android edge tier

The on-device tier of the **Gemma Disaster Grid** platform, shipped as the
**Gemma Rescue Grid** Android app. Runs Gemma 4 E2B fully offline via
Google AI Edge LiteRT on a responder's phone — photo + voice → structured
`EdgeTriageReport` JSON in 30-60 s on a Samsung Galaxy A71 (2020 mid-range).

## How this fork was made

This directory is a fork of [`google-ai-edge/gallery`](https://github.com/google-ai-edge/gallery)
at commit (parent of the first commit on this branch). The upstream
documentation is preserved in [`_upstream/`](_upstream/) — original README,
contribution guide, development notes — under its Apache 2.0 license (see
[`LICENSE`](LICENSE)).

The Gallery's purpose is to be a sample harness for running on-device LLMs;
we kept its model-loading + LiteRT plumbing intact and added a single
**Disaster Triage** custom task plus the offline-first sync stack required
to make it useful in a disaster zone.

## What we added

Everything new lives under `Android/src/app/src/main/java/ai/grg/` and
`.../customtasks/disastertriage/`. Twelve files in total:

### Domain layer — `ai/grg/`

| File | Purpose |
|---|---|
| `Schemas.kt` | `EdgeTriageReport`, `CommandCenterSynthesis`, enums, supporting types. `kotlinx.serialization`. Mirrors [`grg/schemas.py`](../grg/schemas.py). |
| `EdgeTriagePrompt.kt` | The locked Gemma 4 E2B system prompt. Modality-flexible (photo / voice / both). |
| `Routing.kt` | `decideRouting(report, context)` — the Cactus Prize hook. Combines model self-assessment with app-level heuristics. |
| `JsonExtraction.kt` | Robust JSON parsing for whatever the model emits (truncated-repair fallback). |
| `TriageConfig.kt` | Constants — dashboard ingest URL, shared-secret token, network timeouts. |
| `TriageUploader.kt` | `suspend fun upload(report)` via `HttpURLConnection`. Sealed `UploadResult`. |
| `LocationProvider.kt` | Two-stage GPS via `FusedLocationProviderClient` + `Geocoder` for the human-readable label. Never throws. |
| `TriageQueue.kt` | SharedPreferences-backed persistent queue. Survives process kill. |
| `TriageSyncManager.kt` | Orchestrator. `syncOnce()` drains the queue; `scheduleBackgroundSync()` enqueues a `WorkManager` job (`NetworkType.CONNECTED`, 30-min periodic + expedited); `registerConnectivityCallback()` drains the moment the radio reappears. |
| `SyncWorker.kt` | `CoroutineWorker` that calls `TriageSyncManager.syncOnce()`. |
| `QrCodeRenderer.kt` | ZXing-based QR encoder for offline peer hand-off. |
| `QrCodeScanner.kt` | `zxing-android-embedded`-based QR scanner contract. |

### Custom Disaster Triage task — `customtasks/disastertriage/`

| File | Purpose |
|---|---|
| `DisasterTriageTask.kt` | Hilt `@IntoSet CustomTask` registration. |
| `DisasterTriageTaskModule.kt` | Hilt module. |
| `DisasterTriageViewModel.kt` | Inference + sync state machine. |
| `DisasterTriageScreen.kt` | Compose UI: photo + voice capture, result card with fast/deep-lane badge, Recent reports list with re-share-QR dialog, share-intent inbound handler. |

### Rebrand patches (small)

- `res/values/strings.xml`: `app_name` → "Gemma Rescue Grid"; two-line home title; new `app_intro`.
- `res/mipmap-anydpi-v26/`: red warning-triangle adaptive launcher icon (new vector drawable).
- `AndroidManifest.xml`: location + camera + record-audio permissions; `<intent-filter ACTION_SEND text/plain>` on `MainActivity` for the inbound share path.
- `HomeScreen.kt`: defensive `listOfNotNull` patch + `gm4 = false` flip so the home screen renders cleanly with only one task tile.
- `customtasks/` allowlist patch: attaches image-capable LLMs (E2B, E4B) to our `disaster_triage` task ID.

## Recommended end-to-end demo cycle

1. Connected baseline — triage once. Sync chip turns green; card appears in the dashboard's "Live field reports" panel within 10 s.
2. Airplane-mode on. Triage 2–3 times. Each card lands with an amber **Queued for retry** chip; header pill reads "N queued".
3. Force-quit. Pending state persists across kill.
4. Reopen — pending pill still shows N.
5. Airplane-mode off. Within ~5 s the connectivity callback fires; chips flip to green; dashboard fills in.
6. Force-quit *while* offline, then turn wifi on without reopening. Within 15–30 min the periodic `WorkManager` job drains the queue with the app closed.

A fuller per-feature test matrix — including QR-mesh peer hand-off, share-intent receive path, server-side dedup, and reporter-vs-crowd resolve — lives in [`../docs/TESTING.md`](../docs/TESTING.md). The judges' zero-to-working onboarding guide is at [`../docs/HOW-TO.md`](../docs/HOW-TO.md).

## Building from source

1. Open `Android/` in Android Studio Iguana or newer.
2. Sync Gradle (~5 min first time).
3. Plug in a phone with USB debugging enabled (Android 12+, ~3 GB free).
4. **Run → Run 'app'**.

The signing key for the public APK is the gallery fork's debug key — no certificate hoop to jump through for sideload.

The APK attached to the writeup was built from this exact tree.

## Hardware floor

All end-to-end verification was done on a **Samsung Galaxy A71 (2020, Snapdragon 730, no NPU)** — deliberately below the Snapdragon 8 Gen 2 baseline most LiteRT demos target. Triage takes 30–60 seconds per inference; CPU-bound and battery-conscious. That latency is the Global Resilience point: this is the device profile the field-response contexts that matter most can actually afford.
