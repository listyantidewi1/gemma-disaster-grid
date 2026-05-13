# NusaSiaga · Gemma Rescue Grid — Team Plan (English)

> *Indonesian version: [`TEAM_PLAN.id.md`](TEAM_PLAN.id.md)*

A single source of truth for the team while we ship the Kaggle Gemma 4 Good Hackathon submission. **Read this before pushing anything to either repo.** It is intentionally long — if something below seems repetitive, that's because we'd rather repeat ourselves than have someone guess.

---

## 1. The 60-second version

We are building **NusaSiaga · Gemma Rescue Grid**, an offline-first disaster intelligence platform powered by Gemma 4. It is one product with three tiers that share one JSON contract:

1. **An Android app** running Gemma 4 E2B on the phone. A field responder takes a photograph (optionally adds a voice note or text), and the model produces a structured disaster-triage report in under five seconds. **Fully offline. No internet needed.**
2. **A Kaggle notebook** running Gemma 4 31B in the cloud. When the phone gets connectivity, queued reports flow here for cross-report synthesis: priority zones, ranked actions, validity flags. Same Gemma 4 family, larger model, more reasoning.
3. **A web dashboard** deployed on Vercel. Same data, public URL judges can click. Shows wildfires (live NASA FIRMS satellite layer) and flood/quake/industrial-fire scenarios (Gemma 4 synthesis output) in a single unified picker.

We are submitting to the **Kaggle Gemma 4 Good Hackathon** in the **Impact / Global Resilience** track, with the **Cactus Prize** stacked on top. Deadline: **Monday 18 May 2026, 11:59 PM UTC**. Video carries roughly **70% of the score** — invest accordingly.

If you only read one section, read this one.

---

## 2. What problem we are solving

When a disaster strikes — anywhere on the planet — the first hour is the deadliest. It's also the hour with the worst connectivity. Cell towers go down. Bandwidth collapses. The information that reaches an emergency coordinator arrives as fifty unsynced WhatsApp messages, blurry photos taken on shaking phones, and shouted radio descriptions. Aid teams spend the first critical hour just trying to read.

This pattern is universal — a hurricane in the Caribbean, an earthquake in Türkiye, a flash flood in Bangladesh, a peatland fire in Riau, a shallow quake in Cianjur, an industrial accident in Surabaya. The shape of the disaster differs; the field-response problem is identical.

Existing AI disaster tools fail at exactly this moment because they either (a) require steady cloud connectivity to function, or (b) are text-only chatbots that cannot read a photograph of a flooded street.

Gemma 4 is the first open model family designed to span both ends of this problem at once: a 2.3-billion-effective-parameter on-device variant that runs entirely on a phone via Google AI Edge LiteRT, and a 31-billion-parameter cloud variant for serious cross-report reasoning. **Same family, same JSON contract, same prompts work at both scales.** That is the technical insight that makes this project worth doing in the first place.

Our demonstration scenarios are Indonesian (Jakarta flood, Cianjur quake, an industrial flood-fire event) because that is the team's home context. The architecture is designed to deploy in any country where a responder can hold a phone.

---

## 3. The hackathon

**[The Gemma 4 Good Hackathon](https://www.kaggle.com/competitions/gemma-4-good-hackathon)** on Kaggle. Final submission deadline **Monday 18 May 2026, 11:59 PM UTC** — that is **Tuesday 19 May 2026, 06:59 WIB** in Jakarta. **Do not submit at the last minute.** Aim to submit at least six hours before the deadline.

### Prizes we target

- **Impact / Global Resilience — $10,000 (primary).** The track description names "offline, edge-based disaster response to long-range climate mitigation." Our system is literally that. This is the most defensible track for us.
- **Special Tech / Cactus — $10,000 (stackable).** "Best local-first mobile or wearable application that intelligently routes tasks between models." Our hybrid E2B-on-phone + 31B-in-cloud architecture, with the on-device model self-assessing which lane each report should go down, is the canonical example.
- **Main Track — $10,000 to $50,000 (aspirational).** Awarded to overall best projects. Only triggers if execution is top-tier. Don't count on it, but don't sandbag either.

The Special Tech and Main Track prizes can stack. The Impact Track is its own pool. In the worst case we get the Impact Track only ($10K). In a strong case we stack Impact + Cactus ($20K). In the dream case we add a Main Track placement on top ($30K – $60K).

### How we will be judged

Three criteria, 100 points total:

- **40 pts · Impact & Vision.** Measured from the video. Does the project address a significant real-world problem? Is the vision inspiring?
- **30 pts · Video Pitch & Storytelling.** How well-produced is the video?
- **30 pts · Technical Depth & Execution.** Verified from the code repository and writeup.

That is **70 points (70%) decided by the 3-minute video** and 30 points by the code and writeup. The implication is brutal: it doesn't matter how good the engineering is if the video doesn't communicate it well. Plan accordingly.

---

## 4. Key concepts (glossary)

If you encounter one of these terms anywhere in our docs or code and it doesn't make sense, this section is the answer.

### `EdgeTriageReport`

The structured JSON object that the on-device Gemma 4 E2B produces from one photograph. It has fields like `disaster_type` (flood, fire, earthquake, etc.), `severity` (1-5), `severity_rationale` (one sentence explaining the score), `hazards_visible` (array of visible threats), `people_visible` (counts of adults, children, elderly, injured, trapped), `immediate_action` (the single most important thing to do in the next ten minutes), and `evacuation_priority` (immediate, urgent, standby, none). Plus the on-device model's own `routing_recommendation` (fast_lane or deep_lane). Every report carries a UUID and an ISO timestamp.

We have 35 hand-crafted EdgeTriageReports across three scenarios sitting in `data/synthesis_scenarios/` in the Python repo and `src/lib/scenario_*.json` in the dashboard repo. These are what we feed the synthesis model.

### `CommandCenterSynthesis`

The structured JSON object that the cloud-side Gemma 4 31B produces when it ingests an *array* of EdgeTriageReports. Fields include `primary_disaster_classification`, `geographic_scope`, `severity_distribution`, `estimated_affected` (a range of how many people are involved), `priority_zones` (clusters of reports in the same area ranked by severity), `consolidated_hazards` (cross-report aggregation), `recommended_actions` (ranked by life-safety priority), and `report_validity_notes` (flagging duplicates, conflicts, low-quality images, or corroborated reports).

This is what the dashboard renders for each flood/quake/industrial-fire scenario.

### Intelligent routing (the Cactus Prize hook)

Every EdgeTriageReport carries a `routing_recommendation` field — `fast_lane` or `deep_lane` — that the on-device model assigns based on its own confidence and the severity it observed. The application layer then *layers on top* deterministic context the model couldn't see: how many other reports have arrived from this same area in the past hour, current connectivity state, queue depth, battery. The combined decision is the *intelligent routing* the Cactus Prize description rewards.

The point is: the routing is not just a rules engine. The model decides for the cases it understands; the application escalates the edge cases the model couldn't possibly know about (cross-report context). Both decisions are visible on screen so judges can see them.

### Scenarios

Three hand-crafted disaster scenarios used to demonstrate the synthesis tier. Each one is a JSON file containing an array of EdgeTriageReports plus metadata.

- **Scenario A — Rapid-onset central Jakarta flood.** 12 reports across a 90-minute window. Multiple priority zones, recurring electrical hazards in floodwater, one trapped elderly woman on a rooftop, one possible trapped motorcycle rider in a submerged underpass. Mid-difficulty case. **Synthesis verified on Gemma 4 E4B (Colab) on Day 1.**
- **Scenario B — Simulated Cianjur shallow quake.** 15 reports across two hours. Three severity-5 incidents including a building pancake-collapse with confirmed entrapment, a mosque dome collapse with secondary minaret failure, hospital evacuation, market gas leak, school courtyard with 30 children, and one deliberately low-confidence ambiguous report. Hardest case. **Synthesis pending Day 4 Kaggle 31B run.**
- **Scenario C — Compound flood + industrial fire.** 8 reports across 60 minutes. Different responders deliberately classify the same area's primary disaster differently (fire vs flood vs building collapse). Synthesis must produce a coherent compound classification. Includes a stranded ambulance with paramedics on its roof and a warehouse-rooftop group with one elderly worker. **Synthesis pending Day 4 Kaggle 31B run.**

### Wildfire view (NASA FIRMS)

A separate layer in the dashboard that shows live satellite-detected wildfire hotspots across Indonesia, refreshed every 30 minutes from the NASA FIRMS VIIRS API. **Not from Gemma 4.** This is passive intelligence (satellite) versus our active intelligence (user-submitted EdgeTriageReports). Both layer together for situational awareness, accessed via the same unified disaster-type picker.

The wildfire view existed in NusaSiaga before the Gemma 4 work began and was preserved fully — none of its components were modified or deleted in the integration.

---

## 5. Why we made these specific choices

Architectural decisions, in case anyone wonders.

**Why Gemma 4 instead of Gemma 3n.** The hackathon is specifically about Gemma 4. Gemma 3n exists for on-device, but Gemma 4 has an equivalent on-device variant (E2B / E4B) plus the larger 31B for cloud reasoning, and the cloud variant shares architecture with the on-device variant. We get the full vertical stack from one family.

**Why E2B for edge.** It's the smallest Gemma 4 with native multimodal (image + audio + text) and runs in ~1.5 GB of memory at INT4 quantization on a mid-range Android phone. The larger E4B would be better quality but uses more memory and more battery. For the demo we want speed and reliability.

**Why 31B for cloud.** It's the dense flagship in the Gemma 4 family. The 26B MoE alternative is faster but the 31B's reasoning is sharper, which matters when synthesizing 12+ conflicting reports. We run it 4-bit-quantized via Unsloth on Kaggle's 2× T4 setup, which is the same hardware judges have access to.

**Why LiteRT on Android.** Google AI Edge LiteRT (formerly TensorFlow Lite for LLMs) is the official deployment path for Gemma 4 on-device. There's also a Special Tech LiteRT Prize but we can only win one Special Tech prize, and Cactus is a better fit for our architecture story.

**Why pre-baked synthesis in the dashboard, not live AI calls.** Two reasons. First, judges who click the live demo URL should see results instantly, not wait minutes for a model. Second, the synthesis JSON is the artifact we want them to evaluate — the model's reasoning quality, the priority-zone clustering, the validity flags — and that artifact is static, identical for every viewer. Live AI calls would add variance without adding value.

**Why two repos instead of one.** Historical accident plus practical separation. The dashboard was already a separate repo when we joined work. Rather than fight git history, we keep them separate and link both in the writeup. Long-term we might merge; for the hackathon, not worth the churn.

**Why Vercel.** Free tier, deploys directly from GitHub, supports Next.js 16 + server components natively. The Live Demo requirement in the Kaggle rules is "a URL or files... publicly accessible, no login or paywall" — Vercel gives us that with one click.

---

## 6. The dashboard, walked through

When a judge or coordinator opens the deployed URL, here is what they see:

**At the top:** the brand header "NusaSiaga · Gemma Rescue Grid" with a subtitle "Wildfire monitoring · Offline-edge flood response · Powered by Gemma 4" and an "Offline-First Demo" badge.

**Just below:** a single unified disaster-type picker (a dropdown card). It defaults to "Flood" — the scenario with synthesis ready. Clicking it expands to four options:

- 🔥 **Wildfire** — Live NASA FIRMS satellite hotspots across Indonesia
- 🌊 **Flood** — Rapid-onset central Jakarta · 12 reports, full synthesis
- 🏚️ **Earthquake** — Simulated Cianjur shallow quake · 15 reports, synthesis pending
- ⚡ **Industrial Fire** — Floodwater + transformer fires in industrial zone · 8 reports, synthesis pending

And a footer band in the dropdown showing planned types (Volcanic, Tsunami, Landslide, Storm, Building Collapse) with the message "Same Gemma 4 architecture · same JSON contract · just add a scenario file."

**Below the picker**, the body changes depending on which view is active.

For **Wildfire**, the body shows the original NusaSiaga components: a "Live Disaster Intelligence" hero, a wildfire-themed AI Hazard Analyzer panel, the Indonesia hotspot map with FRP-weighted risk markers, environmental intelligence stats (AQI, wind direction, CO₂ estimate), the wildfire incident feed, the demo readiness panel, and an architecture description card. This is NASA FIRMS satellite data, refreshed every 30 minutes.

For **Flood / Earthquake / Industrial Fire**, the body shows: a hero block with three metrics (reports synthesized, severe count, people affected); a sample triage card featuring the most severe report from the scenario; a Jakarta/Cianjur/industrial-zone map with severity-colored markers for every report in the scenario; the full `CommandCenterSynthesis` rendered as panels (severity distribution bars, vulnerable groups, priority zones with hazard chips, ranked recommended actions, report validity flags, data confidence notes); an Operational Intelligence stats grid; the full list of EdgeTriageReports as cards; and the same architecture description card.

For scenarios where synthesis is pending (B and C until Day 4), the synthesis panel and stats grid degrade gracefully to a "synthesis pending" card while the rest of the view (map, hero, reports feed) still renders fully.

The aesthetic is dark operational — slate backgrounds, sky/emerald/red/orange accents, large clear typography. It is designed to be screenshotted for the video.

---

## 7. The Android app, planned

Forked from `google-ai-edge/gallery`, which already implements LiteRT model loading, multimodal prompt construction, and a camera capture flow. We customize:

- **Strip the gallery's general-purpose chat UI.** Replace with a single-button photo-capture screen.
- **Bundle our system prompt.** Embedded as a Kotlin `const` string at `ai.grg.EDGE_SYSTEM_PROMPT`.
- **Use our schema.** Outputs are decoded into the Kotlin `EdgeTriageReport` data class via kotlinx.serialization.
- **Add the routing decision.** After receiving an EdgeTriageReport, the app runs `decideRouting()` and shows a fast-lane or deep-lane badge.

The four drop-in Kotlin files live at `android/app/src/main/kotlin/ai/grg/` in the Python repo: `Schemas.kt`, `EdgeTriagePrompt.kt`, `Routing.kt`, and `JsonExtraction.kt`. They are platform-agnostic and the kotlinx.serialization plugin is the only Gradle change needed.

**What we deliberately do not build:** login, accounts, multi-user features, in-app map view, push notifications, background sync, iOS port. None of these affect the demo and all of them would steal time.

---

## 8. The Kaggle notebook, what it does

`notebook/gemma_rescue_grid.ipynb` — built from `build_notebook.py`, structured as 31 cells. A judge clicking "Run all" walks through:

1. Install dependencies (Unsloth, transformers pinned to 5.5.0, pydantic)
2. Clone the gemma-disaster-grid repo
3. Load Gemma 4 via Unsloth's `FastModel.from_pretrained` (one variable controls which size — E4B for Colab, 31B for Kaggle final)
4. Load our prompts and validators from the `grg` package
5. Load Scenario A's 12 EdgeTriageReports
6. Run the synthesis prompt; stream the model's `<|channel>thought` reasoning trace and final JSON
7. Validate against `CommandCenterSynthesis` Pydantic schema (with autotrim defense and truncation repair)
8. Render an operational-picture dashboard in the notebook
9. Inspect the edge-tier system prompt and one sample EdgeTriageReport
10. Run the intelligent routing function on every report; print a table showing fast-lane vs deep-lane decisions
11. Switch to Scenarios B or C with one variable change

The notebook is the "proof of work" artifact — the engineering judges can actually run.

---

## 9. Repository map

### `github.com/listyantidewi1/gemma-disaster-grid`

The Python / Android / writeup repo.

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

The Next.js dashboard repo.

```
src/app/                       Next.js App Router (page.tsx, api/firms, api/analyze)
src/components/shared/         AppHeader, Metric
src/features/dashboard/        UnifiedDashboard + DashboardViewPicker
src/features/wildfire/         WildfireView (composes the NASA FIRMS components)
src/features/flood/            Flood/quake/industrial-fire scenario components
src/features/maps/             NASA FIRMS map (wildfire view)
src/features/incidents/        Wildfire incident feed (preserved from MVP)
src/features/environment/      Wildfire environment stats (preserved from MVP)
src/features/hazard-analysis/  Wildfire AI hazard analyzer (preserved from MVP)
src/lib/                       Scenarios, types, synthesis output, FIRMS loader
notebooks/                     FIRMS data pipeline notebook
outputs/                       FIRMS data outputs
```

---

## 10. Pace note

We are tracking well ahead of any reasonable schedule — work originally budgeted as Day 1 and Day 2 was largely completed in the opening hours of Day 1. **The day-by-day plan below is the budget, not the floor.** Many items listed for "today" or "tomorrow" are already done. Re-read the checklists in order to know what's actually left.

That said, the back half of the timeline (filming the video, polishing the writeup, deploying to Vercel, getting the Android app actually running on a phone) is more time-consuming and less predictable than the front half. **Do not assume the rest of the project will compress the same way.**

### Status snapshot — 2026-05-14

- Android Studio installed; `google-ai-edge/gallery` forked and cloned; first Gradle sync clean; the unmodified gallery builds without errors.
- **`gemma-4-E2B-it` is available in the gallery's model picker without HuggingFace OAuth.** This resolves the largest pre-hackathon Android risk we had identified. No `ProjectConfig.kt` credential dance is needed for the demo path.
- Model is currently downloading on the test phone (~2.5 GB on Wi-Fi). Inference confirmation pending.
- NusaSiaga dashboard pushed through commit `2668f7a` with all branding and platform-positioning revisions. Vercel deployment pending.
- Synthesis cache from Colab E4B: only Scenario A was retained (the cache file is overwritten on each run). Scenarios B and C will be regenerated by Gemma 4 31B on Kaggle on Day 4 — better quality than re-running on Colab now.

These bullets are dated. Anything older than ~12 hours may already be outdated; re-read the day-by-day below for what is genuinely still open.

---

## 11. Day-by-day plan

Each day has a short rationale explaining *why* this is what we do this day, followed by a flat task checklist. Whoever has the capacity picks the next unblocked item and ships it. No ownership column — coordinate in chat.

### Day 1 — 13 May ✅ DONE

*Foundation day. Build the data contract, the prompts, the scenarios, and verify the synthesis tier works on a smaller model before committing to the larger one on Kaggle.*

- [x] Repo scaffold, schemas, prompts, three scenarios, routing logic
- [x] Kaggle/Colab notebook builds end-to-end on Gemma 4 E4B
- [x] Scenario A synthesis verified: 5 priority zones, ranked actions, validity flags
- [x] NusaSiaga integration: unified disaster-type picker, wildfire + flood/quake/industrial-fire views
- [x] Kotlin domain scaffold for Android
- [x] Writeup v0.5 (1573 words; trim to 1500 on Day 6)
- [x] Bilingual team plan (this doc)

### Day 2 — 14 May (current)

*The set-up-everything-physical day. Android Studio downloads a 5+ GB SDK; the Vercel deploy needs an env var; the test phone needs USB debugging enabled. None of this is intellectually hard, but all of it must happen before Days 3-5.*

- [x] Fork `google-ai-edge/gallery` to a personal GitHub account
- [x] Clone the fork in Android Studio at `D:\Projects\hackathon\gallery\Android\src`
- [x] First Gradle sync (~22 minutes on first try; clean build on retry)
- [x] Connect a test phone via USB; enable USB debugging from Developer Options
- [ ] Run the unmodified gallery on phone; confirm Gemma 4 E2B loads and runs (model downloading now)
- [x] Identified that only Scenario A is in the Colab synthesis cache; Scenarios B and C deferred to the Day 4 Kaggle 31B run
- [ ] `git pull` `nusasiaga` main to get all the unified-picker, scenario, branding, and platform-positioning work
- [ ] Run `npm install && npm run dev` locally on the dashboard to confirm the merged tree builds without errors
- [ ] Deploy NusaSiaga to Vercel for the Live Demo URL (free tier is fine; sign up with the GitHub account that owns the dashboard repo)
- [ ] Record the Vercel URL in this team plan and in the NusaSiaga README so we have one canonical Live Demo link
- [ ] Set `NASA_FIRMS_MAP_KEY` in Vercel project settings (Settings → Environment Variables) so the wildfire view's live data works

### Day 3 — 15 May

*Android customization day plus dashboard polish. The Kotlin domain files are already written; we drop them in, wire the inference loop to use our system prompt, and replace the gallery's free-form chat with a one-button capture flow.*

- [ ] Drop the four `ai.grg.*` Kotlin files into the gallery fork at the right package path (e.g. `app/src/main/kotlin/ai/grg/`)
- [ ] Add `kotlinx-serialization-json:1.6.x` to dependencies and the `org.jetbrains.kotlin.plugin.serialization` plugin to `app/build.gradle.kts`
- [ ] Replace the gallery's default chat flow with a single-button photo-capture → triage flow (this is the big UI change; the existing camera permission flow can be reused)
- [ ] Inject our system prompt as the first user-turn content when calling the model
- [ ] Decode the model output with `parseEdgeReport()` and render the resulting `EdgeTriageReport` as a result card with severity badge, hazards list, immediate action, and routing badge
- [ ] Confirm Gemma 4 E2B downloads from the gallery's model picker and runs inside the customized app
- [ ] Update Hazard Analyzer copy on the dashboard wildfire view: "Local Gemma analysis" → "Local Gemma 4 analysis" (small polish)
- [ ] Capture screenshots of both Wildfire and Flood views from the Vercel deployment for the video editor
- [ ] Refine the video storyboard in `writeup/video_script_v1.md` with the actual unified-picker visuals we now have

### Day 4 — 16 May (Kaggle weekly quota resets at the start of this day)

*Production-quality synthesis day. We move from Colab E4B (development) to Kaggle 31B (final submission). Scenarios B and C currently have placeholder "pending" cards on the dashboard; today we replace those with real synthesis JSON from the bigger model.*

- [ ] Open the notebook on Kaggle (not Colab), run on 2× T4 with `unsloth/gemma-4-31B-it`
- [ ] Run synthesis for Scenario A (validate the 31B output is at least as good as the E4B baseline)
- [ ] Run synthesis for Scenario B
- [ ] Run synthesis for Scenario C
- [ ] Save each output as its own `synthesis-scenario-{a,b,c}.ts` TypeScript module
- [ ] Drop those into `nusasiaga/src/lib/`, update `scenarios.ts` to import the new objects, flip B and C from `synthesisStatus: "pending"` to `"generated"`
- [ ] Push to `nusasiaga` main; Vercel auto-rebuilds
- [ ] Take fresh dashboard screenshots showing all three disaster types with full operational dashboards (no more "pending" cards)
- [ ] Begin filming phone footage if the Android UI is ready — responder snapping a photo, triage appearing on the result card

### Day 5 — 17 May

*Video production day. Everything technical should be done by tonight. From here it is editing, voicing, music, and polish.*

- [ ] Film the 3-minute video. Recommended scenes:
  1. Disaster B-roll (Cianjur quake or Jakarta flood footage; CC0 or fair-use snippets, max 5 sec each)
  2. Phone in hand, airplane-mode toggle visible, photo capture
  3. EdgeTriageReport result card filling the phone screen
  4. Dashboard scrolling, switching between Wildfire / Flood / Earthquake / Industrial Fire
  5. Architecture beat (E2B → 31B → dashboard, narrated)
- [ ] Edit. Add voice-over (English; native or near-native speaker, calm/serious tone). Add a music bed (YouTube Audio Library or a CC-attribution track suitable for a serious-but-hopeful tone)
- [ ] Upload to YouTube as unlisted. Verify the link is accessible without logging in. Save the link for the writeup
- [ ] Optional: Unsloth LoRA fine-tune of E2B on curated disaster images. If the fine-tune materially improves severity calibration, document it; otherwise drop it
- [ ] Optional: add a wildfire user-report scenario (Riau peatland fire, ~10 hand-crafted reports). Would make the dashboard's wildfire tab show both NASA FIRMS data AND user-report synthesis

### Day 6 — 18 May · SUBMISSION DAY

*Polish, dry run, submit. Don't ship code on this day unless something is broken.*

- [ ] Trim writeup from 1573 to ≤1500 words. Cut from the "Technical Challenges" section first; preserve the impact and architecture sections
- [ ] Add the Vercel URL, the YouTube URL, the GitHub URLs (both repos), and the APK file link to the writeup
- [ ] Pick a cover image — a clean shot of the dashboard with one scenario open is the strongest single image
- [ ] Dry run: open the Kaggle writeup form in a browser, paste everything, preview, but **do not submit yet**
- [ ] Double-check track selection: **Impact Track → Global Resilience**
- [ ] Submit at least 6 hours before deadline. **Deadline: 11:59 PM UTC, Monday 18 May 2026.** That is **06:59 AM WIB, Tuesday 19 May 2026.**

---

## 12. Submission deliverables (per Kaggle rules)

The Kaggle Writeup is the umbrella artifact. Everything else attaches to it. We must include all of these:

1. **Kaggle Writeup ≤ 1500 words.** A paper- or blog-style explanation of the project. Architecture, what we used Gemma 4 for, technical challenges, why our choices were the right ones. This is the "proof of work" — judges read it to verify the video isn't faked. Submissions over 1500 words may be penalized.
2. **YouTube Video ≤ 3 minutes.** Published to YouTube (unlisted is fine), publicly viewable without logging in. The single most important deliverable — 70% of the score.
3. **Public Code Repository.** Both our GitHub repos (`gemma-disaster-grid` and `nusasiaga`) listed in the Project Links section of the writeup. Code must be publicly readable, no login or paywall.
4. **Live Demo URL.** The Vercel deployment. Lets judges experience the project firsthand without running anything. Must be publicly accessible without login.
5. **Media Gallery including a cover image.** The cover image is required to submit the writeup. We'll pick on Day 6.
6. **(Optional) APK file attachment.** The Android app exported as an installable APK, attached as a file to the writeup. Lets judges install on their own Android phone if they want.

We submit under the **Impact Track / Global Resilience** category. We are eligible for the Cactus Prize in the Special Tech track simultaneously — the rules allow stacking Main + Special Tech, and our writeup should explicitly mention Cactus eligibility in the architecture section.

---

## 13. Working norms

Two-person project, one product. The faster we sync, the less rework.

- **`git pull` before you start working.** Stale checkouts cause merge conflicts that waste time.
- **Push small commits, push often.** One commit per logical change. Easier to review, easier to revert.
- **If you change shared files (schemas, prompts, scenarios, the team plan itself), say so in chat or in the commit message** so the other person knows to pull before they start their next change.
- **Never force-push to main.** If you need to rewrite history, talk to the other person first. There is no scenario in our six-day timeline where force-push is the right answer.
- **All major branding or architectural decisions are documented in this file.** If you make a decision that affects how we present the project, update this doc and push it.
- **One person at a time on big component refactors.** Cosmetic polish (CSS, copy edits, small fixes) in parallel is fine.
- **If you disagree with something here**, raise it in chat. Don't push around it. The point of a single source of truth is that it stays a single source of truth.
- **If you hit a merge conflict you don't know how to resolve**, don't force a resolution. Ping the other person, look at it together. Five minutes of conversation beats an hour of bad merges.

---

## 14. Critical risks and mitigations

| Risk | Likelihood | What we do |
|---|---|---|
| ~~**Android Gemma 4 E2B download fails** because the gallery requires HuggingFace OAuth~~ | **Resolved 2026-05-14** | `gemma-4-E2B-it` is exposed directly in the gallery's model picker without HuggingFace OAuth credentials. No `ProjectConfig.kt` placeholder substitution is needed. Risk struck through, no fallback required |
| **Kaggle 31B run fails on Day 4** because of memory issues, slow generation, or notebook errors | Low | Fall back to E4B output from Colab (we already have Scenario A from Day 1) and explicitly note in the writeup that the demo uses E4B because of compute constraints. The architecture story is the same regardless of which Gemma 4 variant ran |
| **Vercel deploy fails on FIRMS API key** | Low | The wildfire view's dashboard-hotspots loader has a 3-tier fallback chain (FIRMS live → notebook JSON output → demo data). Even with no API key set, the page renders demo hotspot data. If Vercel deploys at all, the wildfire view will work |
| **Video doesn't finish on Day 5** because filming + editing took longer than expected | Medium | Cut to a 90-second version that focuses on a single dashboard-side beat (the synthesis panel) plus one phone-side beat (airplane mode + photo capture + result card). Use lots of B-roll and minimal voice-over |
| **Writeup goes over 1500 words** | Low | Cut from Section 5 (Technical Challenges) first — drop the specific examples and keep the headlines. Preserve impact + architecture sections at all costs |
| **Phone doesn't have enough RAM / storage to run E2B** | Low | E2B needs about 2.5 GB free RAM. If the test phone struggles, document the recommended hardware in the writeup; record the demo video on whatever phone DOES work; mention the user can find a "Recommended Android device" list in our `android/README.md` |
| **Both team members are exhausted by Day 6** | High (always) | The submission dry run starts a full day early. Don't write new code on Day 6 unless something is on fire. Day 6 is for polish, not features |

---

## 15. Quick reference

- **Hackathon URL:** <https://www.kaggle.com/competitions/gemma-4-good-hackathon>
- **Code repo (Python/Android/writeup):** <https://github.com/listyantidewi1/gemma-disaster-grid>
- **Code repo (dashboard):** <https://github.com/NoesaaDecodes/nusasiaga>
- **Live demo URL:** (added Day 2 after Vercel deploy)
- **Video URL:** (added Day 5 after upload)
- **Kaggle starter notebook (for reference only):** <https://www.kaggle.com/code/danielhanchen/gemma4-31b-unsloth>
- **AI Edge Gallery (the Android app we fork):** <https://github.com/google-ai-edge/gallery>
- **Gemma 4 E2B LiteRT weights on Hugging Face:** <https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm>
- **Gemma 4 31B Unsloth weights on Hugging Face:** <https://huggingface.co/unsloth/gemma-4-31B-it>

---

## 16. Contributors

- listyantidewi@gmail.com
- noesaaerp@gmail.com

Let's ship.
