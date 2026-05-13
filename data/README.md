# Demo data

The demo needs **15–20 curated disaster scenes** that:
1. Cover the major disaster types (flood, earthquake, landslide, fire, storm, building collapse)
2. Span the severity range (1 through 5, with weight at 3–4 since those are the most demo-worthy)
3. Include some deliberately ambiguous or compound-hazard cases to showcase the routing decision
4. Are usable under permissive licenses (Creative Commons, public domain, or self-shot)

This is the **newbie teammate's primary deliverable** on Day 1–2. The curated set drives:
- Edge model prompt tuning (what does E2B see and what does it produce?)
- Command-center synthesis demonstration (the 31B ingests these as input)
- Video B-roll (the camera-snap scenes use these images)
- Optional Unsloth fine-tune dataset on Day 5

## Folder structure (target)

```
data/
├── README.md                    ← you are here
├── demo_reports/                ← the curated 15-20 set
│   ├── 001_flood_jakarta_moderate/
│   │   ├── image.jpg
│   │   ├── voice_note.wav        (optional; ≤30s, 16kHz)
│   │   ├── ground_truth.json     (expected EdgeTriageReport)
│   │   └── notes.md              (provenance, license, why included)
│   ├── 002_quake_cianjur_severe/
│   ├── ...
│   └── 020_compound_flood_fire/
└── synthesis_scenarios/         ← the inputs to the 31B notebook demo
    ├── scenario_a_jakarta_flood_12reports.json
    ├── scenario_b_quake_15reports.json
    └── scenario_c_compound_8reports.json
```

## How to curate (process for the newbie teammate)

For each of 15–20 entries:

1. **Find the image.** Sources, in priority order:
   - Creative Commons disaster photo collections (search `Flickr` with CC-BY filter, Wikimedia Commons, Pexels, Unsplash)
   - Indonesian disaster agency public photos (BNPB has some public domain footage)
   - Self-shot scenes (controlled flooding, staged debris) — only if safe and we have time
   - **Avoid:** copyrighted news photos, photos depicting identifiable victims in distress, anything that fails dignity guidelines

2. **Save with provenance.** Every image must have a `notes.md`:
   - Source URL
   - License (must be CC-BY, CC0, or public domain)
   - Attribution string if required
   - Date of disaster, location if known
   - Why it's in the demo set (what does it demonstrate?)

3. **Write ground-truth JSON.** A first-pass `EdgeTriageReport` that we'd accept as a correct output. This is the "answer key" we'll use to evaluate prompt iterations.

4. **(Optional) Add a voice note.** Record a 10–20 second voice memo in Bahasa Indonesia or English describing the scene from the responder's POV. Saves to `voice_note.wav` at 16kHz mono. Voice notes are great for video B-roll *and* for demonstrating Gemma 4's audio understanding.

## Composition target

| Disaster type | Count | Severity weights |
|---|---|---|
| Flood | 4 | one each of 2, 3, 4, 5 |
| Earthquake / collapse | 4 | one each of 2, 3, 4, 5 |
| Fire | 3 | severity 2, 3, 4 |
| Landslide | 3 | severity 3, 4, 5 |
| Storm / wind damage | 2 | severity 1, 3 |
| Compound (flood+fire, quake+gas, etc.) | 2 | severity 4, 5 |
| Edge cases (poor image quality, near-miss, false-positive scene) | 2 | for testing routing |

**Total: 20 entries.** Cuttable down to 15 if time is tight.

## Synthesis scenarios

Three pre-staged scenarios feed the 31B notebook synthesis demo:

- **Scenario A — Jakarta flooding (12 reports):** mostly severity 2–3, geographically clustered, demonstrates routine synthesis
- **Scenario B — Cianjur-style earthquake (15 reports):** mixed severity including one 5, multiple priority zones, demonstrates the hardest case
- **Scenario C — Compound disaster (8 reports):** flood that triggers electrical fires, demonstrates conflict resolution and consolidated-hazard reasoning

Each scenario is a JSON file containing an array of `EdgeTriageReport` objects, which the notebook serializes into the 31B user message.

## License hygiene

Per Kaggle rules, the winning Submission and source code must be releasable under CC-BY 4.0. **Every image we ship in the public repo must have a compatible upstream license.** A misstep here can disqualify us.

If a particular image can't be confirmed CC-compatible, exclude it from the public `demo_reports/` folder and reference it only in private working notes.
