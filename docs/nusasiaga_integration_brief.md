# NusaSiaga ↔ Gemma Rescue Grid integration brief

**For:** the NusaSiaga teammate
**Repo to edit:** https://github.com/NoesaaDecodes/nusasiaga
**Local clone:** `d:\Projects\hackathon\nusasiaga\`
**Goal:** by end of Day 3, NusaSiaga renders our Scenario A synthesis as its operational dashboard, branded as "NusaSiaga · Gemma Rescue Grid", deployable to Vercel.

This document describes every file you need to change, exactly what to change it to, and includes copy-paste-ready TypeScript data files alongside this one in `docs/nusasiaga_data_files/`.

---

## Why we're doing this

Our submission has three artifacts:
1. **Android APK** — field responder takes a photo on the phone, Gemma 4 E2B produces a triage report fully offline (your lead is building this)
2. **Kaggle notebook** — Gemma 4 31B synthesizes 12 field reports into a single operational picture
3. **NusaSiaga dashboard** ← *this is yours*. The Vercel-deployed web app where ops coordinators (and Kaggle judges) see the consolidated picture

The dashboard is the **Live Demo URL** required by the Kaggle submission rules. It's what judges click first. It must look polished and tell the disaster-response story end-to-end.

Right now NusaSiaga shows mock wildfire data for Riau/Kalimantan. We're swapping that for our **Scenario A: Jakarta flooding**, with 12 real `EdgeTriageReport` objects and a real `CommandCenterSynthesis` derived from running Gemma 4 E4B over them on Colab.

---

## Change checklist (do in this order)

### 1. Branding

| File | Change |
|---|---|
| `README.md` | Top line: change `# NusaSiaga` to `# NusaSiaga · Gemma Rescue Grid`. Update tagline: `Offline-first disaster intelligence powered by Gemma 4 — from the field responder's phone to the command center.` |
| `src/components/shared/AppHeader.tsx` | Add subtitle "Gemma Rescue Grid · Offline Disaster Intelligence". Keep NusaSiaga as the primary brand. |
| `package.json` | No change needed (the npm `name` field can stay as `nusasiaga-app`). |
| `src/app/layout.tsx` | Update `<title>` and `<meta name="description">` to mention "NusaSiaga · Gemma Rescue Grid" and "powered by Gemma 4". |

### 2. Replace `src/lib/reports.ts` — old schema is wrong for our data

Old shape: `{ area, risk, aqi, co2, status }` — that's wildfire-specific.

New shape: align with our `EdgeTriageReport`. Use the ready-made file: `docs/nusasiaga_data_files/edge-reports-scenario-a.ts` (in *this* repo). Copy its contents into `nusasiaga/src/lib/reports.ts`. It exports an array of 12 typed reports.

### 3. Add TypeScript types matching our schemas

Create `nusasiaga/src/lib/types.ts`. Copy from `docs/nusasiaga_data_files/types.ts` (in this repo). These types mirror our Python Pydantic schemas exactly:
- `EdgeTriageReport` — what the phone emits per report
- `CommandCenterSynthesis` — what the cloud 31B emits over an array of reports
- Supporting types: `PriorityZone`, `RecommendedAction`, etc.

### 4. Replace the mock synthesis result

The current `mockHazardAnalysisResult` in `src/ai/gemma/prompts.ts` has the old wildfire-specific shape. Create `nusasiaga/src/lib/synthesis-scenario-a.ts` (copy from `docs/nusasiaga_data_files/synthesis-scenario-a.ts`).

This exports a `CommandCenterSynthesis` object — the *actual output* from the Colab E4B run we did on 2026-05-13. Five priority zones, three recommended actions, full validity flags.

### 5. Update the DisasterMap component

`src/features/maps/components/DisasterMapClient.tsx` currently plots Riau / Kalimantan / Sumatera. We want Jakarta.

Centre the map on `[-6.24, 106.86]` (central Jakarta), zoom 13.

Plot each report from Scenario A as a marker at `(report.location.lat, report.location.lon)`. Color-code by severity:
- 5 → dark red `#7f1d1d`
- 4 → red `#dc2626`
- 3 → orange `#ea580c`
- 2 → amber `#d97706`
- 1 → yellow `#ca8a04`

Popup on click: `report.location.label` + `report.severity_rationale` + `report.immediate_action`.

For the priority zones, draw a filled circle (radius ~150m) at the lat/lon of the first report in each zone's `report_ids` array, colored by `evacuation_priority` (immediate=red, urgent=orange, standby=yellow).

### 6. Update the HazardAnalysisPanel to show our synthesis

`src/features/hazard-analysis/components/HazardAnalysisPanel.tsx` currently has an input box that calls `/api/analyze` and shows mock output.

For now (MVP), we **skip the live AI integration** and just *display* our pre-baked `synthesis` from step 4. Replace the panel content with sections that show:
- Primary disaster classification + confidence
- Geographic scope
- Severity distribution bar chart (use recharts since it's already in `package.json`)
- Priority zones list (use accordion or expandable cards)
- Recommended actions list (numbered, with rationale)
- Data confidence notes (italic, small text)

We will *not* be calling Ollama for the live demo. The synthesis JSON is static, generated once on Kaggle and baked in.

### 7. Update the IncidentFeed

`src/features/incidents/components/IncidentFeedCard.tsx` should render an `EdgeTriageReport`:
- Top line: severity badge + timestamp + location label
- Body: severity_rationale (truncated to 100 chars)
- Footer: routing_recommendation badge + immediate_action

Render in reverse-chronological order from the imported `reports` array.

### 8. Update the EnvironmentStats panel

This currently shows AQI, CO2 etc. — wildfire metrics. Replace with disaster-response metrics derived from the synthesis:
- "Reports synthesized" → `synthesis.report_count`
- "Priority zones" → `synthesis.priority_zones.length`
- "People affected (est.)" → `synthesis.estimated_affected.people_count_max`
- "Hazards consolidated" → `synthesis.consolidated_hazards.length`
- "Recommended actions" → `synthesis.recommended_actions.length`
- "Vulnerable groups" → short text from `synthesis.vulnerable_groups_summary`

### 9. Update or remove the OfflineResiliencePanel

Currently shows generic offline capabilities. Update it to describe our actual architecture:
- "Field tier: Gemma 4 E2B on Android via LiteRT (offline)"
- "Sync tier: Gemma 4 31B in command center (when online)"
- "Same model family top to bottom — frontier reasoning at every scale"

This is great pitch material for the Cactus Prize narrative.

### 10. Delete or hide things we no longer need

For the MVP demo, hide or remove:
- `DemoReadinessPanel` — internal status, not for judges
- `LocalAiMode` toggle — we're not running live AI in the dashboard
- The `/api/analyze` route — we don't call it (but keep the file; it documents the future plan)

### 11. Deploy to Vercel

Once steps 1–10 are working locally (`npm run dev`):

```bash
npm install -g vercel
cd nusasiaga
vercel
```

Follow the prompts. The free tier is fine. You'll get a URL like `https://nusasiaga.vercel.app/`. **That URL goes in the Kaggle Writeup as the Live Demo link.**

---

## Acceptance criteria (definition of "done" for Day 3)

- [ ] Running `npm run dev` opens a clean dashboard with no console errors
- [ ] Map shows Jakarta with 12 plotted reports color-coded by severity
- [ ] Hazard analysis panel shows our 5 priority zones, 3 recommended actions, severity distribution
- [ ] Incident feed lists the 12 EdgeTriageReports in reverse chronological order
- [ ] Header reads "NusaSiaga · Gemma Rescue Grid"
- [ ] `npm run build` succeeds (deployable to Vercel)
- [ ] Site loads on a phone browser without layout breaking (responsive check)

If you finish all of that on Day 3, Day 4 is purely polish + cover image + Vercel deployment.

---

## What to ask if you're stuck

- Layout breaking on mobile? Take a screenshot, paste in chat
- A component using the old `Report` type that won't compile? Paste the file
- Map not rendering? React Leaflet needs a height on its parent; check the wrapper has `h-[500px]` or similar

The lead will pair on the build between their own Android-app sessions. Aim to have at least map + dashboard rendering Scenario A by end of Day 3, even if styling needs Day 4 polish.

Welcome to the team — your dashboard is the artifact every judge will see first. Make it beautiful.
