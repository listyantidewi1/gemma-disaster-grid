# NusaSiaga · Gemma Disaster Grid — Dashboard

The web-app tier of the Gemma Disaster Grid platform. **Live:** <https://nusasiaga.vercel.app>.

A single unified operational dashboard with a disaster-type chip filter — wildfire, flood, earthquake, industrial fire today; tsunami, landslide, volcanic, storm next — that renders both the **31B synthesis** of queued phone reports and a **live NASA FIRMS satellite layer** for passive global intelligence.

This is one of three tiers in the monorepo; see the [top-level README](../README.md) for the platform overview.

## What's in the box

| Surface | What it shows |
|---|---|
| **Two-mode toggle** | Triage Operations / Wildfire Monitoring (top right) |
| **Unified operational map** | Pre-baked scenario reports (solid pins) + live phone uploads (pulsing rings) + crowd/reporter-resolved (greyed). 10-chip disaster-type filter bar. Fit-to-all auto-frame. |
| **Live field reports panel** | Polls `/api/reports` every 10 s. Severity, hazards, immediate action, fast/deep-lane badge per card. "Vote to resolve (N/5)" button. Pagination at 5. |
| **Environmental Intelligence** | Real Open-Meteo AQI + wind anchored at the viewer's geolocation (browser GPS → ipapi.co → Jakarta default). |
| **Incident Feed** | Top-5 NASA FIRMS hotspots worldwide, ranked by severity × proximity to the viewer. |
| **Scenario synthesis panel** | The Gemma 4 31B `CommandCenterSynthesis` output rendered as priority zones + ranked actions + consolidated hazards + validity flags. |

## API routes

| Path | Purpose | Auth |
|---|---|---|
| `POST /api/reports` | Ingest a phone-uploaded `EdgeTriageReport`. Server-side reverse geocode. Dedupes on `report_id`. | `X-Triage-Token` shared secret |
| `GET /api/reports` | Returns every stored report for the live feed. | None |
| `PATCH /api/reports/[id]` | Reporter-side resolve — flips status to `ended` with `_resolved_by: "reporter"`. | `X-Triage-Token` |
| `POST /api/reports/[id]/vote` | Crowd-vote resolve. localStorage-persisted `voter_id`. 5 distinct voters → `_resolved_by: "crowd"`. | None |
| `GET /api/firms` | Cached NASA FIRMS proxy (30-min server cache, top-500 FRP cap, worldwide bbox). | None |
| `GET /api/environment` | Open-Meteo air-quality + weather proxy (no API key). | None |

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (no errors expected)
npm run lint
```

### Environment variables

For full functionality `.env.local` should contain:

```
NASA_FIRMS_MAP_KEY=<get one at https://firms.modaps.eosdis.nasa.gov/api/area/>
TRIAGE_INGEST_TOKEN=<any string, must match the Android app's TriageConfig.kt>
KV_REST_API_URL=<from Vercel Marketplace → Upstash KV integration>
KV_REST_API_TOKEN=<from Vercel Marketplace → Upstash KV integration>
```

Without `NASA_FIRMS_MAP_KEY` the wildfire layer falls back to demo data.
Without Upstash, the live reports feed will 500 — the rest of the app still renders.

## Tech stack

- Next.js 16 App Router · React 19 · TypeScript
- Tailwind CSS 4 · Lucide-react · Framer Motion
- React Leaflet for the operational map and FIRMS overlay
- Upstash Redis (via Vercel Marketplace) for the live reports store
- NASA FIRMS API (VIIRS/SNPP NRT) for live satellite hotspots
- Open-Meteo (no API key required) for AQI + wind

## Reproducing the dashboard claims

See [`../docs/TESTING.md`](../docs/TESTING.md) for the L1 dashboard-only reproducible test matrix (5 tests that work from any browser, no installation).

## License

Apache 2.0. The Winning Submission, per Kaggle rules, will be CC-BY 4.0.
