# TESTING — Gemma Disaster Grid reproducible test scenarios

This document is for hackathon judges and reviewers. Each scenario below is a self-contained, reproducible test of one claim made in the writeup. Each one lists **what you need**, **what to do**, **what success looks like**, and **where to look in the code** if you want to verify the implementation, not just the behaviour.

The complete system has three deployables:

- **Dashboard** — Next.js 16 app on Vercel. Public demo: <https://nusasiaga.vercel.app>. Source: [`/dashboard`](../dashboard) in this repo.
- **Android app** — Kotlin app, fork of `google-ai-edge/gallery`. Source: [`/android`](../android) in this repo. APK attached to the writeup.
- **Kaggle notebook** — Gemma 4 31B synthesis on 2× T4. Source: [`/notebook/gemma_rescue_grid_kaggle.ipynb`](../notebook/gemma_rescue_grid_kaggle.ipynb).

You can verify the writeup's claims at three levels of effort:

| Level | What it proves | Setup time |
|---|---|---|
| **L1 — Dashboard only** | Tiers 3 & 4 (sync, dashboard, FIRMS, environment, crowd resolve) | 0 min — open the live URL |
| **L2 — Android + dashboard** | Tier 1 (edge inference) + Tier 2 (offline queue, WorkManager, QR mesh, share intent) | ~20 min — sideload APK on any Android 12+ phone with ~3 GB free |
| **L3 — Full Kaggle reproduction** | Tier 5 (31B synthesis) | ~45 min — open the notebook on Kaggle 2× T4 and Run All |

---

## L1 — Dashboard-only tests

These work from any browser. No installation required.

### Test L1.1 — Live operational map

**Goal:** verify the unified map merges three pre-baked scenarios + live phone uploads into one operational picture, filterable by disaster type.

**Steps**
1. Open <https://nusasiaga.vercel.app>.
2. Confirm the page lands on **Triage Operations** mode (toggle at top right).
3. Scroll to the operational map. You should see ~35 pins clustered into three regions (Jakarta flood, Cianjur quake, industrial fire compound).
4. Use the 10-chip filter bar above the map. Click **Flood** — only flood pins remain. Click **Earthquake** — only quake pins remain.
5. Toggle the **Fit to all** control. The viewport zooms out across all visible pins.

**Success criteria:** map renders, filters mutually exclude, fit-to-all reframes the bounds.

**Code**: `dashboard/src/features/flood/components/FloodMapClient.tsx`, `dashboard/src/features/triage/components/DisasterTypeFilter.tsx`.

---

### Test L1.2 — Environmental Intelligence (real AQI + wind)

**Goal:** verify the environmental panel is wired to a real API (Open-Meteo), anchored at the viewer's location, not hardcoded demo data.

**Steps**
1. On <https://nusasiaga.vercel.app>, scroll to the **Environmental Intelligence** panel (below the map).
2. Allow the browser geolocation prompt when it appears.
3. Observe the AQI and wind cards. They should display values appropriate to your local time + location, not a fixed Jakarta reading.
4. Open the browser devtools network tab, reload, and confirm a request fires to `/api/environment?lat=…&lon=…`.

**Success criteria:** values vary by location; network tab shows the `/api/environment` proxy call with your lat/lon.

**Code**: `dashboard/src/app/api/environment/route.ts`, `dashboard/src/features/environment/components/EnvironmentStats.tsx`, `dashboard/src/lib/use-user-location.ts`.

---

### Test L1.3 — Live NASA FIRMS satellite hotspots (Wildfire Monitoring)

**Goal:** verify global FIRMS data is loaded live and ranked by severity × proximity to the viewer.

**Steps**
1. Toggle the top-right mode switch to **Wildfire Monitoring**.
2. Wait ~5 s for the FIRMS layer to load. You should see VIIRS hotspot pins across multiple continents.
3. Scroll to the **Incident Feed** panel. The top 5 hotspots are ordered by combined severity score and distance to your geolocation.
4. Refresh the page — pin positions persist (FIRMS API is cached 30 min server-side).

**Success criteria:** worldwide hotspot coverage (not Indonesia-only), feed is sorted by relevance, no hardcoded demo strings.

**Code**: `dashboard/src/app/api/firms/route.ts`, `dashboard/src/features/incidents/components/IncidentFeed.tsx`.

---

### Test L1.4 — Crowd-vote resolution (trust gradient, dashboard half)

**Goal:** verify that 5 anonymous dashboard voters can collectively mark a report `ended` with `_resolved_by: "crowd"`, but a single voter cannot.

**Steps**
1. Open <https://nusasiaga.vercel.app> in **5 different browsers or 5 incognito windows** (each gets its own `localStorage`-persisted `voter_id`).
2. In each, scroll to the **Live field reports** panel. Pick any active report row.
3. Click **Vote to resolve (0/5)** in window 1. The button updates to **1/5**.
4. Click **Vote to resolve** in window 2 — counter → **2/5**. Repeat in windows 3 and 4.
5. In window 5, click **Vote to resolve** — counter hits 5; the card flips to greyscale with a **RESOLVED** pill and `Resolved (crowd) Ns ago`.
6. Open any window's devtools → `localStorage` → key `grg.voter_id`. Confirm a UUID is present.
7. Try clicking **Vote to resolve** twice in the same window — the second click silently no-ops (server returns `already_voted: true`).

**Success criteria:** 5 distinct voters required; same voter can't double-vote; resolved card visibly fades.

**Code**: `dashboard/src/app/api/reports/[id]/vote/route.ts`, `dashboard/src/lib/use-live-reports.ts` (`voteToResolve`, `getOrCreateVoterId`), `dashboard/src/features/live-reports/components/IncomingReportsPanel.tsx`.

---

### Test L1.5 — Pagination on live feed

**Goal:** verify the live feed collapses to 5 most-recent reports by default and expands on demand.

**Steps**
1. Wait until at least 6 reports have been uploaded (or use a fresh APK install to drive them — see L2.1).
2. Confirm the panel shows 5 cards plus a **Show all N reports (M hidden)** button.
3. Click expand. All N reports render. Button flips to **Collapse to 5 most recent**.

**Success criteria:** `COLLAPSED_PAGE_SIZE = 5` is honoured; expand/collapse round-trips.

**Code**: `dashboard/src/features/live-reports/components/IncomingReportsPanel.tsx` (constant `COLLAPSED_PAGE_SIZE`).

---

## L2 — Android + dashboard tests

You need the APK (attached to the writeup) and any Android 12+ phone with ~3 GB free. Tested device of record: **Samsung Galaxy A71 (2020, Snapdragon 730, no NPU)** — deliberately below the Snapdragon 8 Gen 2 baseline most LiteRT demos use.

### One-time setup

1. Sideload the APK (`adb install gemma-rescue-grid.apk`, or transfer + open + install).
2. Open **Gemma Rescue Grid**. You should land on a single **Disaster Triage** tile — no other gallery tasks visible.
3. Tap the tile, then tap the model row and download `gemma-4-E2B-it-litert-lm` (~2.5 GB). First download is a one-time cost.
4. Grant camera, microphone, and location permissions when prompted.

---

### Test L2.1 — Connected baseline (the happy path)

**Goal:** verify a single triage flows phone → dashboard in under 10 seconds.

**Steps**
1. With wifi or mobile data on, point the phone camera at any disaster-like scene (a sink overflowing, a stove on, a printed photo of a flood — anything photo-classifiable will do).
2. Tap **Capture photo**.
3. (Optional) Tap **Record voice**, speak a 5–10 second annotation, stop.
4. Tap **Triage** and wait. On the A71, this takes 30–60 seconds for the multimodal pass.
5. The result card renders: severity (1–5), disaster type, hazards, immediate action, fast/deep lane badge.
6. The header pill briefly shows **Syncing…** then **Synced ✓**.
7. Open <https://nusasiaga.vercel.app> on a laptop. Within ~10 seconds your new report appears at the top of the **Live field reports** panel with a pulsing pin on the operational map.

**Success criteria:** result card shows in 30–60 s; sync chip turns green; dashboard reflects the new report in under 10 s; reverse-geocoded place label populated.

**Code**: edge inference — `gallery/Android/src/app/src/main/java/com/google/ai/edge/gallery/customtasks/disastertriage/DisasterTriageScreen.kt`. Upload — `ai/grg/TriageUploader.kt`. Server — `dashboard/src/app/api/reports/route.ts`.

---

### Test L2.2 — Offline queue cycle

**Goal:** verify reports are persisted locally and drained when connectivity returns.

**Steps**
1. Toggle airplane mode **on**.
2. Run two or three triages back to back. Each result card lands with an amber **Queued for retry** chip; the header pill reads **N queued**.
3. **Force-quit** the app from the recents tray.
4. Reopen the app — the queued pill still shows N. Pending state survives process death.
5. Toggle airplane mode **off**. Within ~5 s the connectivity callback fires; chips flip to **Synced ✓**; pill drops to 0.
6. Reload the dashboard — all N reports are now visible.

**Success criteria:** queue persists across kill; reconnection drains within a few seconds; nothing is lost.

**Code**: `ai/grg/TriageQueue.kt` (SharedPreferences-backed), `ai/grg/TriageSyncManager.kt` (`registerConnectivityCallback`).

---

### Test L2.3 — WorkManager background drain

**Goal:** verify the queue drains even when the app is closed and the phone screen is off.

**Steps**
1. Toggle airplane mode **on**.
2. Triage once. Header pill: **1 queued**.
3. Force-quit the app.
4. Toggle airplane mode **off** **without reopening the app**.
5. Wait up to 30 minutes. Watch the dashboard.

**Success criteria:** within ~30 minutes the queued report appears on the dashboard, without the app ever being reopened.

**Code**: `ai/grg/SyncWorker.kt` (`CoroutineWorker`, `NetworkType.CONNECTED`). `TriageSyncManager.scheduleBackgroundSync()` enqueues a 30-min `PeriodicWorkRequest`.

---

### Test L2.4 — QR-mesh peer hand-off

**Goal:** verify a report can travel phone-A → phone-B → cloud when phone A has no connectivity.

**Setup:** two Android phones with the APK installed. Phone A in airplane mode; phone B online.

**Steps**
1. On phone A, run one triage. The result card lands in the queue. Status: pending.
2. Scroll down to **Recent reports**, expand it, find the queued row.
3. Tap the **QR** icon on that row. A dialog renders a QR code (~250×250).
4. On phone B, in the Disaster Triage screen, tap **Scan QR**. The system camera opens, point at phone A's screen.
5. Phone B parses the JSON, enqueues with `source = QR`, and immediately calls `TriageSyncManager.syncOnce()`.
6. Open the dashboard. The report appears within ~10 s — provenance `qr` is reflected in the stored `_received_at` metadata (visible in `/api/reports` GET response).

**Success criteria:** report survives phone-A airplane mode; lands on dashboard via phone-B's connection; dashboard shows exactly one entry (no duplicate).

**Code**: `ai/grg/QrCodeRenderer.kt` (encoder), `ai/grg/QrCodeScanner.kt` (decoder via zxing-android-embedded), `DisasterTriageScreen.kt` (`ShareReportDialog`, `ScanRow`).

---

### Test L2.5 — Server-side dedup (the corollary to QR mesh)

**Goal:** verify the cloud sees each `report_id` exactly once, no matter how many phones relayed it.

**Steps**
1. After Test L2.4, take phone A out of airplane mode. Its queue still has the original triage.
2. Phone A's `TriageSyncManager` fires; tries to POST the same `report_id` that phone B already uploaded.
3. Open dashboard. Count the rows with that `report_id`.

**Success criteria:** exactly **one** row for that report on the dashboard. Server dedup wins.

**Code**: `dashboard/src/app/api/reports/route.ts` (`SADD` semantics keyed on `report_id`).

---

### Test L2.6 — Share-intent peer hand-off (Bluetooth / Nearby Share / messaging)

**Goal:** verify the system Android share sheet is a valid alternative transport when QR is awkward.

**Steps**
1. On phone A (offline), in **Recent reports**, tap the QR row's row dialog → **Share** button (or the dedicated share button on the result card).
2. The system share sheet opens. Pick any channel — Bluetooth, Nearby Share, Signal, email, etc.
3. Send the JSON to phone B's matching channel.
4. On phone B, open the received message and tap the JSON text → **Share with → Gemma Rescue Grid**.
5. App opens at the Disaster Triage screen, parses `Intent.ACTION_SEND`'s `EXTRA_TEXT` as `EdgeTriageReport`, enqueues with `source = SHARE`.
6. Same outcome as Test L2.4 once phone B has connectivity.

**Success criteria:** share sheet shows Gemma Rescue Grid in the target list; inbound intent enqueues and syncs.

**Code**: `gallery/Android/src/app/src/main/AndroidManifest.xml` (`intent-filter android.intent.action.SEND text/plain`), `DisasterTriageScreen.kt` (`LaunchedEffect(intent)` handler).

---

### Test L2.7 — Reporter resolution (trust gradient, phone half)

**Goal:** verify the reporter can flag a disaster as ended from their phone with a single tap.

**Steps**
1. Drive a triage to the dashboard (Test L2.1 path).
2. On the phone, scroll to **Recent reports**, find the synced row, tap the **Check** icon.
3. The row flips to status `ended`. The phone fires a PATCH `/api/reports/{id}` with the shared-secret token.
4. Open the dashboard. The card flips to grey/RESOLVED instantly (next polling cycle), tagged `Resolved (reporter)`.

**Success criteria:** single tap on the responder's phone is enough to resolve. No 5-vote consensus needed (compare with L1.4). The two trust paths produce different `_resolved_by` markers.

**Code**: `ai/grg/TriageUploader.kt` (`patchResolve`), `dashboard/src/app/api/reports/[id]/route.ts` (PATCH handler).

---

## L3 — Kaggle 31B synthesis reproduction

**Goal:** verify the cloud-tier 31B synthesis runs end-to-end, produces valid `CommandCenterSynthesis` JSON for all three scenarios, and emits drop-in TypeScript modules that the dashboard imports.

### Prerequisites
- A Kaggle account with weekly GPU quota remaining (the run needs **~25 minutes** on 2× T4 for three scenarios).
- The repo `listyantidewi1/gemma-disaster-grid` accessible (the notebook clones it).

### Steps
1. Open the notebook on Kaggle: `notebook/gemma_rescue_grid_kaggle.ipynb`.
2. Enable **GPU T4 ×2** in the right-hand sidebar. Internet must be **on**.
3. **Run All**. The notebook will:
   - install `unsloth`, `transformers==5.5.0`, `torch>=2.8.0`, `triton>=3.4.0`, `bitsandbytes`;
   - clone `listyantidewi1/gemma-disaster-grid`;
   - load `unsloth/gemma-4-31B-it` with `FastModel.from_pretrained(load_in_4bit=True, device_map="balanced")`;
   - run synthesis on **Scenarios A (12 reports), B (15 reports), C (8 reports)**;
   - write `outputs/synthesis_scenario_{a,b,c}.json` and matching `synthesis-scenario-{a,b,c}.ts`.
4. Inspect the final summary cell. It prints a pandas table: scenario → report count, severity distribution, hot zones, output token count, wall-clock seconds.

**Success criteria:** all three scenarios complete; each produces JSON conforming to the `CommandCenterSynthesis` schema (validated by `grg/schemas.py`); each `.ts` module is a drop-in for `dashboard/src/lib/`.

**Code**: `notebook/build_kaggle_notebook.py` (script that builds the .ipynb), `notebook/gemma_rescue_grid_kaggle.ipynb` (the built artifact), `grg/schemas.py` (Pydantic validation).

---

## What a quick judge run should look like

If you have 10 minutes:

1. **2 min** — L1.1 + L1.2 + L1.3 in the browser. Confirms the dashboard tier and the live data sources work.
2. **2 min** — L1.4 (open 5 incognito windows in parallel, click through). Confirms crowd consensus.
3. **6 min** — If you have the APK on hand, run L2.1 + L2.2 back-to-back. Confirms edge inference + offline queue.

If you have 30 minutes, add L2.4 (QR mesh) — it is the single most resilience-illustrative test.

If you have an afternoon, queue L3 on Kaggle and let it run while you do the rest.

---

## Where claims map to evidence

| Writeup claim | Test that proves it |
|---|---|
| "Gemma 4 E2B runs fully offline on a 2020 mid-range phone" | L2.1 (in airplane mode after first download) |
| "Reports survive process kill" | L2.2 |
| "Background drain even with app closed" | L2.3 |
| "QR-mesh hand-off when no connectivity for days" | L2.4 |
| "Server dedup on report_id" | L2.5 |
| "Two trust paths: reporter and crowd" | L2.7 vs L1.4 |
| "Real AQI/wind anchored at viewer location" | L1.2 |
| "Global FIRMS, not Indonesia-only" | L1.3 |
| "Pagination on live feed" | L1.5 |
| "Gemma 4 31B synthesises N reports into priority zones" | L3 |

If you can run all of these and they all pass, the writeup is honest. If any one of them fails, please [open an issue](https://github.com/listyantidewi1/gemma-disaster-grid/issues) — every fail is a bug we want fixed before submission.
