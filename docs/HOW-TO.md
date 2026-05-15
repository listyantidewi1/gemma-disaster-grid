# HOW-TO — Run Gemma Disaster Grid yourself

*The platform is **Gemma Disaster Grid**. The Android app is **Gemma Rescue Grid**. The dashboard is **NusaSiaga · Gemma Disaster Grid**.*

A compact onboarding guide for hackathon judges. **TESTING.md** is the per-feature verification matrix; this doc is the "how do I get from zero to a working setup" walkthrough.

---

## TL;DR — three things you can do

1. **Click the live demo** — <https://nusasiaga.vercel.app>. Works without any installation. Skip ahead to [Using the dashboard](#using-the-dashboard).
2. **Install the Android APK** — verifies the offline edge tier on a real phone. See [Installing the Android app](#installing-the-android-app).
3. **Run the Kaggle notebook** — verifies the 31B cloud synthesis. See [Running the Kaggle synthesis notebook](#running-the-kaggle-synthesis-notebook).

You do not need all three. Doing #1 alone shows the end-state output. Adding #2 shows where the data came from. Adding #3 shows the 31B synthesis pipeline that produced the consolidated picture.

---

## Installing the Android app

### What you need

- An Android phone running **Android 12 or newer**.
- At least **3 GB free storage** (the Gemma 4 E2B model is ~2.5 GB on disk).
- The APK file attached to the Kaggle writeup, **or** built from source via [`listyantidewi1/gallery`](https://github.com/listyantidewi1/gallery).
- USB cable + a computer with `adb`, **or** any way of moving an APK file onto the phone (cloud drive, email attachment, USB MTP, etc.).
- Wifi or mobile data for the initial Gemma 4 E2B model download. After that, the phone can be fully offline.

### Sideload steps

1. Copy the APK to the phone (cloud drive, USB transfer, `adb install gemma-rescue-grid.apk`, etc.).
2. Open the file on the phone. Android will prompt: "Install unknown apps". Allow for your file manager / browser.
3. Tap **Install**.
4. Launch **Gemma Rescue Grid** (red warning-triangle icon on the home screen).
5. Grant permissions when prompted: camera, microphone, location, notifications.

### First-run model download

1. Tap the single **Disaster Triage** tile on the home screen.
2. Tap the model picker row. Pick `gemma-4-E2B-it-litert-lm` (the only model offered).
3. Tap **Download**. The model is ~2.5 GB; on hotel wifi this can take 5–15 minutes. There is no Hugging Face login required — the LiteRT artefact is mirrored on a public CDN.
4. When the chip turns green ("Ready"), the model lives on the phone forever. You can airplane-mode the phone after this point and everything still works.

### Doing your first triage

1. Frame anything camera-classifiable as a "disaster scene" — a sink overflowing, a stove burner on, a printed photo of a flood. Drama is not required; the model just needs visual context.
2. Tap **Capture photo**.
3. (Optional but recommended) Tap **Record voice**, speak a 5–10 second annotation ("Water rising at the edge of the back garden, no people in sight."), tap stop.
4. Tap **Triage**.
5. Wait. On the Samsung Galaxy A71 reference device this takes **30–60 seconds** for a photo-plus-voice pass; closer to 20 seconds for photo-only. On a Snapdragon 8 Gen 2-class phone, expect 4–8 seconds. The latency is CPU-bound by design — we ship on the older hardware floor on purpose. See the writeup's "Hardware floor" section for why.
6. The result card renders. Severity, hazards, immediate action, fast/deep lane routing badge.
7. Header pill shows **Syncing…** then **Synced ✓** (assuming connectivity).
8. Open <https://nusasiaga.vercel.app> on a laptop. Your report shows up at the top of the **Live field reports** panel within ~10 seconds, plus a pulsing pin on the operational map.

If anything goes wrong here, see [Troubleshooting](#troubleshooting).

---

## Using the dashboard

The live URL is <https://nusasiaga.vercel.app>. No login.

### The two modes

The toggle at the top right of the page switches between two layouts. They share data but emphasise different things:

- **Triage Operations** — the operational picture for field-response coordinators. Unified map of pre-baked scenarios + live phone uploads. Disaster-type chip filter. Live field-reports panel with sortable cards. Reporter/crowd resolution buttons. Environmental Intelligence (live AQI + wind anchored at your location).
- **Wildfire Monitoring** — the passive-intelligence overlay. Global NASA FIRMS satellite hotspots, ranked by severity × proximity to your geolocation. Live IncidentFeed with the worldwide top-5 hotspots near you.

### Interacting with the map

- **Filter** — the 10-chip bar above the map mutually excludes by `disaster_type`. Click a chip to isolate; click again to clear.
- **Fit to all** — top-right control on the map. Reframes bounds to include every visible pin.
- **Pin style** — solid pins are the pre-baked scenario reports; pulsing pins are live uploads from phones; grey checkmark pins are resolved reports (either by reporter or by crowd).
- **Click a pin** — popup shows severity, disaster type, immediate action, location label.

### Resolving a report from the dashboard

Anonymous dashboard viewers cannot single-handedly mark a disaster ended — they can only **vote**. Five distinct browsers must vote on the same report for it to flip.

Each browser is identified by a `localStorage`-persisted UUID under the key `grg.voter_id`. This is generated lazily on first vote.

1. Find an active report in the **Live field reports** panel.
2. Click **Vote to resolve (N/5)**. The counter increments.
3. Repeat from 4 other browsers (incognito windows count). When the count hits 5, the card flips to RESOLVED, tagged `Resolved (crowd)`.

Compare this with reporter resolution — the original reporter can single-tap a row in their phone's **Recent reports** view and the dashboard updates immediately, tagged `Resolved (reporter)`. The two trust paths produce different `_resolved_by` markers in the stored JSON.

### Environmental Intelligence

The cards under "Environmental Intelligence" are wired live:

- **AQI** is from Open-Meteo's air-quality API, anchored at your browser's geolocation.
- **Wind** is from Open-Meteo's forecast API, same location.
- **Carbon release** and **emergency priority** are computed in-app from the global FIRMS Fire Radiative Power totals (peatland-weighted for tropical hotspots) — they are global aggregates, not viewer-local.

The geolocation resolution is three-tier: browser geolocation → IP geolocation (ipapi.co) → Jakarta default. You can see which tier is active by opening devtools → network and looking at the request URLs.

---

## Running the Kaggle synthesis notebook

### What you need

- A Kaggle account with **GPU quota remaining for the week** (the run uses ~25 minutes of 2× T4 time).
- Internet enabled in the notebook environment (the notebook clones a public GitHub repo and downloads model weights).

### Steps

1. Open the notebook on Kaggle:
   - Either import the file `notebook/gemma_rescue_grid_kaggle.ipynb` from `listyantidewi1/gemma-disaster-grid`,
   - Or copy-fork the public notebook (link in the writeup).
2. In the right-hand **Settings** pane:
   - **Accelerator** → **GPU T4 ×2**
   - **Internet** → **On**
   - **Persistence** → either is fine; not required.
3. Click **Run All**.
4. Watch the log:
   - Pip install of `unsloth`, `transformers==5.5.0`, `torch>=2.8.0`, `triton>=3.4.0`, `bitsandbytes` (~3 min).
   - Clone of `listyantidewi1/gemma-disaster-grid` (~5 s).
   - Load of `unsloth/gemma-4-31B-it` with `FastModel.from_pretrained(load_in_4bit=True, device_map="balanced")` (~6 min — 31B → 4-bit on 2× T4 takes a while).
   - Three synthesis passes (Scenarios A, B, C). Each one ~4 minutes wall-clock.
5. The final cell prints a pandas summary table: scenario → report count, severity distribution, hot zones, output token count, wall-clock seconds.
6. Three artefacts written to the working directory:
   - `outputs/synthesis_scenario_a.json` (machine-readable `CommandCenterSynthesis`)
   - `outputs/synthesis_scenario_a.ts` (drop-in TypeScript module that the dashboard imports)
   - Likewise `_b` and `_c`.

### Verifying the outputs

The notebook validates each JSON against `grg/schemas.py` (Pydantic). If any output fails validation, the cell raises — re-run that scenario's cell only.

You can copy the `.ts` files into `nusasiaga/src/lib/` to flip the dashboard's pre-baked scenarios B and C from `pending` to `generated`. The Day-3 demo already ships scenario A's synthesis from the same pipeline.

---

## Troubleshooting

### "Sync chip stuck on Syncing…"
The phone is trying to POST to `/api/reports` but failing. Causes:
- Phone genuinely offline. Watch the chip turn amber ("Queued for retry"). That is the queue working as designed. Reconnect to verify drain.
- The shared-secret token mismatch. This shouldn't happen on the production APK; if you built from source, check `TRIAGE_INGEST_TOKEN` in your `nusasiaga/.env.local` matches the constant in `ai/grg/TriageConfig.kt`.

### "Model picker is empty / model download fails"
- Confirm wifi or mobile data is on.
- The LiteRT artefact mirror is a public CDN. If it's rate-limited, wait a few minutes and retry.
- No Hugging Face login is required for this E2B build.

### "Dashboard says 'No live reports yet' forever"
- Open devtools → network and look for `/api/reports` polling every 10 s. If it 500s, Upstash Redis is unreachable.
- If you forked and self-deployed: the `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars must be set on Vercel. The Upstash Marketplace integration sets these automatically.
- The public demo is set up correctly; if it's broken, that's a server issue we want to know about.

### "AQI card shows 'unavailable'"
- The Open-Meteo API is rate-limited per IP. Heavy refresh-button mashing can trigger this. Wait ~60 s.
- Geolocation refused. Allow the browser prompt; the panel falls back to IP location after a short delay.

### "FIRMS layer is empty"
- FIRMS payload is cached server-side for 30 min. If the cache key just expired, the first request triggers a fresh fetch. Reload after ~10 s.
- If still empty, the `NASA_FIRMS_MAP_KEY` is misconfigured on the Vercel deployment. Get a free key at <https://firms.modaps.eosdis.nasa.gov/api/map_key/> and set it on the deployment.

### "QR scan succeeds but report doesn't sync"
- Confirm the scanning phone has connectivity. The QR mesh is a *transport* between phones; it still needs one phone in the chain to reach the dashboard.
- If still stuck, force-quit and reopen the app — the `TriageQueue` survives, and reopening triggers `syncOnce()` immediately.

### "Kaggle notebook OOMs on FastModel.from_pretrained"
- Confirm the accelerator is **2× T4**, not single T4. The 31B 4-bit weights need both.
- Confirm `device_map="balanced"` in the config cell (it should be the default).
- If you're using a smaller-GPU notebook environment (e.g., free Colab), the notebook will not run. The 31B tier is for the cloud half of the architecture.

### "Build the Android app from source instead of using the APK"
1. `git clone https://github.com/listyantidewi1/gallery.git`
2. Open `gallery/Android` in Android Studio Iguana or newer.
3. Sync Gradle. (~5 min first time.)
4. Plug in the phone with USB debugging enabled.
5. **Run → Run 'app'**.

The signing key for the public APK is the gallery fork's debug key, not anything sensitive — there's no certificate hoop to jump through for sideload.

---

## Where to file issues

If anything in this guide fails on your setup, open an issue at <https://github.com/listyantidewi1/gemma-disaster-grid/issues> with:
- What you were trying to do (which test number from TESTING.md, if applicable),
- What happened instead,
- Phone model + Android version (if Android-tier),
- Browser + OS (if dashboard-tier).

We will fix it before submission.
