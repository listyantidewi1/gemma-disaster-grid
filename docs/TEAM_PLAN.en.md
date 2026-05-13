# NusaSiaga · Gemma Rescue Grid — Team Plan (English)

> *Indonesian version: [`TEAM_PLAN.id.md`](TEAM_PLAN.id.md)*

A single source of truth for the team while we ship the Kaggle Gemma 4 Good Hackathon submission. Read this before pushing anything to either repo.

## 1. What we are building

**NusaSiaga · Gemma Rescue Grid** is an offline-first disaster intelligence platform powered by Gemma 4. It has three tiers that share one JSON contract end-to-end:

```
┌─────────────────────────────┐    ┌─────────────────────────────┐    ┌─────────────────────────────┐
│  PHONE (offline, LiteRT)    │ →  │  COMMAND CENTER (Kaggle)    │ →  │  DASHBOARD (Vercel)         │
│  Gemma 4 E2B · ~1.5GB Q4    │    │  Gemma 4 31B · Unsloth 4-bit│    │  Next.js · React Leaflet   │
│  Photo + voice/text → JSON  │    │  Multi-report synthesis     │    │  Operational picture       │
│  EdgeTriageReport            │    │  CommandCenterSynthesis     │    │  Same data, public URL     │
└─────────────────────────────┘    └─────────────────────────────┘    └─────────────────────────────┘
        Field responder                 Cross-report reasoning            Ops coordinator / judges
```

Same Gemma 4 family at every scale. Apache 2.0 open weights, top to bottom.

## 2. Hackathon target

- **Competition:** [The Gemma 4 Good Hackathon](https://www.kaggle.com/competitions/gemma-4-good-hackathon) (Kaggle)
- **Final submission deadline:** Monday 18 May 2026 · 11:59 PM UTC
- **Primary track:** Impact / Global Resilience ($10K)
- **Stackable secondary:** Special Tech / Cactus Prize ($10K) — "best local-first mobile or wearable application that intelligently routes tasks between models"
- **Aspirational:** Main Track Prize ($10K – $50K)

Judging weight: 40 pts Impact & Vision · 30 pts Video Pitch & Storytelling · 30 pts Technical Depth. **Video carries roughly 70% of the score.**

## 3. Roles & ownership

| Person | Owns | Repos they push to |
|---|---|---|
| **Listyantidewi (lead)** | Android app · Kaggle notebook · Python schemas · Kotlin domain · Writeup · Video coordination | `gemma-disaster-grid` · `nusasiaga` (additive only) |
| **Noesaa Decodes** | NusaSiaga dashboard (wildfire / NASA FIRMS track) · Vercel deployment · Cosmetic polish on the Flood tab | `nusasiaga` (primary owner) |
| **Shared decisions** | Branding · video script · writeup direction · what goes in the submission | Discuss before pushing |

## 4. Repository map

### `github.com/listyantidewi1/gemma-disaster-grid`

The Python / Android / writeup repo. Owned by Listyantidewi.

```
docs/                          Architecture, integration brief, this team plan
prompts/                       Gemma 4 system prompts (edge + cloud)
grg/                           Python package: schemas, routing, JSON repair
data/synthesis_scenarios/      Three hand-crafted scenarios (A flood, B quake, C compound)
notebook/                      Kaggle/Colab notebook (builds via build_notebook.py)
android/                       Kotlin domain scaffold for the Android app
writeup/                       Kaggle Writeup v0.5 (target 1500 words)
```

### `github.com/NoesaaDecodes/nusasiaga`

The Next.js dashboard repo. Co-owned. Noesaa is primary; Listyantidewi pushes additive flood/scenario work.

```
src/app/                       Next.js App Router (page.tsx, api/firms, api/analyze)
src/components/shared/         AppHeader, Metric
src/features/dashboard/        UnifiedDashboard + DashboardViewPicker
src/features/wildfire/         WildfireView (composes the NASA FIRMS components)
src/features/flood/            Flood/quake/compound tab + components
src/features/maps/             NASA FIRMS map (wildfire view)
src/features/incidents/        Wildfire incident feed (preserved from MVP)
src/features/environment/      Wildfire environment stats (preserved from MVP)
src/features/hazard-analysis/  Wildfire AI hazard analyzer (preserved from MVP)
src/lib/                       Scenarios, types, synthesis output, FIRMS loader
notebooks/                     Noesaa's FIRMS data pipeline notebook
outputs/                       FIRMS data outputs
```

## 5. Day-by-day plan

Dates are based on a 2026-05-13 kickoff. Adjust if work happens faster (it has).

### Day 1 — 13 May ✅ DONE

- Repo scaffold, schemas, prompts, three scenarios, routing logic
- Kaggle/Colab notebook builds end-to-end on Gemma 4 E4B
- Scenario A synthesis verified: 5 priority zones, ranked actions, validity flags
- NusaSiaga integration: dual-track dashboard, scenario picker
- Kotlin domain scaffold for Android
- Writeup v0.5 (1573 words; trim to 1500 on Day 6)

### Day 2 — 14 May (current)

**Listyantidewi:**
- Install Android Studio (done) ✅
- Fork `google-ai-edge/gallery` to `listyantidewi1/gallery`
- Clone in Android Studio at `D:\Projects\hackathon\gallery\Android\src`
- Wait for first Gradle sync (~15-30 min)
- Connect test phone via USB, enable USB debugging
- Run the unmodified gallery on phone; confirm an LLM tile loads
- Paste the contents of `synthesis_cache_scenario_a.txt` (Colab cache) back to chat so we identify which scenario it actually contains and integrate

**Noesaa:**
- `git pull` `nusasiaga` main to get all the dual-track and flood scenario work
- Run `npm install && npm run dev` locally to confirm the build is healthy on the merged tree
- Deploy NusaSiaga to Vercel for the Live Demo URL (free tier is fine)
- Document the Vercel URL in the README so we have one canonical Live Demo link
- Make sure the NASA FIRMS env var (`NASA_FIRMS_MAP_KEY`) is set in Vercel project settings

### Day 3 — 15 May

**Listyantidewi:**
- Drop our four `ai.grg.*` Kotlin files into the gallery fork at the right package path
- Add `kotlinx-serialization-json` + the serialization Gradle plugin to `app/build.gradle.kts`
- Replace the gallery's default chat flow with a single-button photo-capture → triage flow
- Render the resulting `EdgeTriageReport` as a result card
- Confirm Gemma 4 E2B downloads and runs inside the customized app

**Noesaa:**
- Polish dashboard cosmetics (wildfire tab still has "Gemma 3n" copy in the Hazard Analyzer — update to Gemma 4)
- Capture screenshots of both views from the Vercel-deployed site for the video editor
- Help write the video storyboard (`writeup/video_script_v1.md` in `gemma-disaster-grid`)

### Day 4 — 16 May (Kaggle quota resets here)

**Listyantidewi:**
- Open the notebook on Kaggle (not Colab), run on 2× T4 with `unsloth/gemma-4-31B-it`
- Generate fresh synthesis for Scenarios A, B, C
- Save each output as its own `synthesis-scenario-{a,b,c}.ts` file
- Drop those into `nusasiaga/src/lib/`, update `scenarios.ts` to flip B and C from "pending" to "generated"
- Push to `nusasiaga` main; Vercel auto-rebuilds

**Noesaa:**
- After the Day 4 push lands, take fresh screenshots showing all three disaster types with full operational dashboards
- Help film phone footage — responder snapping a photo, triage appearing, dashboard updating

### Day 5 — 17 May

- Film the 3-minute video. Scenes:
  1. Disaster B-roll (Cianjur quake or Jakarta flood footage, CC0 or fair use)
  2. Phone in hand, airplane-mode toggle, photo capture
  3. EdgeTriageReport result card on phone
  4. Dashboard switching between Wildfire / Flood / Earthquake / Industrial Fire
  5. Architecture beat
- Edit, voice-over, music. Upload to YouTube unlisted; share link in writeup.
- Optional: Unsloth LoRA fine-tune of E2B on curated disaster images (Listyantidewi)
- Optional: add a wildfire user-report scenario (Listyantidewi or Noesaa)

### Day 6 — 18 May (SUBMISSION DAY)

- Trim writeup from 1573 to ≤1500 words
- Add Vercel URL, YouTube URL, GitHub URL, APK file link
- Cover image: a clean shot of the dashboard with one scenario open
- Dry run: open Kaggle writeup form, paste everything, preview, then submit
- **Deadline: 11:59 PM UTC, Monday 18 May 2026.** That is 06:59 AM Tuesday 19 May Jakarta time (WIB).
- Do not submit at the last minute. Aim for 6 hours before deadline.

## 6. Submission deliverables (per Kaggle rules)

We must attach all of these to the Writeup:

1. **Kaggle Writeup** ≤ 1500 words — `writeup/kaggle_writeup_v0.5.md` (trim on Day 6)
2. **YouTube Video** ≤ 3 minutes — filmed Day 5
3. **Public Code Repository** — both repos listed: `gemma-disaster-grid` and `nusasiaga`
4. **Live Demo URL** — Vercel-deployed NusaSiaga
5. **Media Gallery** including a cover image — picked on Day 6
6. **Optional: APK file** attachment — built on Day 5 once Android UI works

Select the **Impact Track / Global Resilience** category when creating the Writeup.

## 7. Communication norms

- **`git pull` before you start working.** Stale checkouts cause merge pain.
- **Push small commits, push often.** One commit per logical change.
- **If you change shared files (schemas, prompts, scenarios), say so in chat or commit message** so the other person knows to pull.
- **Never force-push to main.** If you need to rewrite history, talk to the other person first.
- **All major branding/architecture decisions go through this document.** Update this file as decisions change.
- **One person on the dashboard at a time** for big component refactors. Polish edits in parallel are fine.

## 8. Critical risks and what to do

| Risk | What we do |
|---|---|
| Android Gemma 4 E2B download fails (HuggingFace OAuth wall) | Use a smaller pre-downloaded model in the gallery to demonstrate the flow; pitch the writeup as "architecture proven, model bundle to follow" |
| Kaggle 31B run on Day 4 fails | Fall back to E4B output from Colab (we already have Scenario A) and note this in the writeup |
| Vercel deploy fails on FIRMS API key | Set the env var; if still broken, set the wildfire view to the notebook-JSON fallback (already implemented) |
| Video doesn't finish on Day 5 | Cut to a 90-second version focused on the Flood tab synthesis + phone airplane-mode shot |
| Writeup goes over 1500 words | Cut Section 5 (Technical Challenges) examples; keep impact + architecture |

## 9. Quick reference

- **Hackathon URL:** <https://www.kaggle.com/competitions/gemma-4-good-hackathon>
- **Code repo (Python/Android/writeup):** <https://github.com/listyantidewi1/gemma-disaster-grid>
- **Code repo (dashboard):** <https://github.com/NoesaaDecodes/nusasiaga>
- **Live demo URL:** (added Day 2 after Noesaa deploys to Vercel)
- **Video URL:** (added Day 5 after upload)

## 10. Founders

- **Listyantidewi** — listyantidewi@gmail.com — lead, mobile + on-device ML
- **Noesaa Decodes** — noesaaerp@gmail.com — dashboard, NASA FIRMS data pipeline

Let's ship.
