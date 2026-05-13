# Android app — `Gemma Rescue Grid Edge`

The Android app is the **video demo's hero** and the **APK live-demo attachment**. It runs Gemma 4 E2B on-device via Google AI Edge LiteRT, fully offline.

## Stack

- **Language:** Kotlin (LiteRT-LM Kotlin API is stable)
- **Min SDK:** API 28 (Android 9). Tested on API 33+.
- **Architecture:** single-activity, Jetpack Compose UI, ViewModel + Coroutines
- **Inference:** Google AI Edge LiteRT-LM Kotlin bindings, loading `gemma-4-E2B-it-litert-lm`
- **Storage:** Room (SQLite) for the report queue
- **Camera:** CameraX
- **Audio:** MediaRecorder (16kHz mono PCM for Gemma 4 audio input)
- **Permissions:** CAMERA, RECORD_AUDIO, (optional) ACCESS_FINE_LOCATION

## App flow (UI states)

```
┌────────────────────────┐
│  HOME                  │
│  [New report]          │
│  [Queue: 3 pending]    │
│  [Settings]            │
└────────────────────────┘
            │
            ▼
┌────────────────────────┐
│  CAPTURE               │
│  Camera preview         │
│  [Snap photo]          │
│  [Hold to record]      │
│  [Optional text note]  │
└────────────────────────┘
            │
            ▼
┌────────────────────────┐
│  PROCESSING            │
│  "Running Gemma 4 on   │
│   your device..."      │
│  [progress ring]       │
│  ~4-8s on midrange     │
└────────────────────────┘
            │
            ▼
┌────────────────────────┐
│  RESULT                │
│  ┌──────────────────┐  │
│  │ SEVERITY 4       │  │
│  │ FLOOD            │  │
│  │ 2 adults, 1 child│  │
│  │ Live wires near  │  │
│  │   pedestrians    │  │
│  │ ACTION: move      │  │
│  │   pedestrians... │  │
│  │ ┌──────────────┐ │  │
│  │ │DEEP LANE     │ │  │
│  │ │queued        │ │  │
│  │ └──────────────┘ │  │
│  └──────────────────┘  │
│  [Save & continue]     │
│  [Save & sync now]     │
└────────────────────────┘
            │
            ▼
┌────────────────────────┐
│  QUEUE                 │
│  list of pending sync  │
│  with status badges    │
│  [Sync all when online]│
└────────────────────────┘
```

## Key implementation notes

### LiteRT model loading
Per Google AI Edge docs, the recommended approach is to download the `.litertlm` file once (from `litert-community/gemma-4-E2B-it-litert-lm` on Hugging Face) and load it from app-private storage. Model is ~2.5GB so this is a one-time cost.

### Multimodal message construction
Gemma 4 E2B accepts a multimodal message:
```kotlin
val message = listOf(
    Content.SystemText(systemPromptFromAssets()),
    Content.UserText("Triage this scene."),
    Content.UserImage(photoBitmap),
    Content.UserAudio(voiceNotePcmBytes)  // optional
)
```
(Exact API surface TBD — confirm against LiteRT-LM Kotlin samples on Day 2.)

### JSON parsing + validation
Use `kotlinx.serialization` for `EdgeTriageReport`. Validate against the schema before persisting; if validation fails, retry once with `temperature=0.4` and `top_p=0.9`.

### Routing decision
Implemented as a pure Kotlin function `decideRouting(report: EdgeTriageReport, context: AppContext): RoutingDecision` that combines:
- `report.routing_recommendation` (the model's self-assessment)
- Recent report count from the same `location.label` (queried from Room)
- Current connectivity state (ConnectivityManager)
- Battery level (BatteryManager)

The decision and rationale are displayed on the result screen — this is the visible Cactus Prize element.

### Sync logic
- Trigger: app foregrounded + connectivity online + queue depth > 0
- Endpoint: configurable; for demo we point at a Kaggle-hosted endpoint or a local dev server
- Retry: exponential backoff, max 5 attempts per report
- Conflict handling: server is the source of truth once a report is acknowledged

## What to fork as a starting point

**Reference apps to study:**
1. **Google AI Edge Gallery** — official sample app (https://github.com/google-ai-edge/gallery)
2. **LiteRT-LM Android samples** in the main repo (https://github.com/google-ai-edge/LiteRT-LM/tree/main)

**Decision:** Fork AI Edge Gallery and strip out everything that isn't related to text-image input → text output. Replace UI with our triage-specific flow. This saves ~2 days of Android setup.

## Build & install

```bash
# Once forked and customized:
./gradlew :app:assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
# Attach this APK to the Kaggle Writeup as a file (per submission rules)
```

Target APK size: <60MB (model is downloaded on first run, not bundled).

## Telemetry & analytics

**None.** This is an offline-first privacy-preserving disaster tool. We do not bundle Firebase, Crashlytics, or any analytics SDK in the demo build. Mention this explicitly in the writeup as an ethics differentiator.

## What we are NOT building in the Android app

- Login / account system
- Cloud configuration UI (endpoint is hardcoded for demo)
- Multi-user/team features
- Map view (this is a phone-side reporter, not a coordinator dashboard)
- Push notifications
- Background sync service (foreground sync only — keeps battery story honest)
