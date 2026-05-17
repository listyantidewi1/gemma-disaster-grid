# Data — curated scenarios for the 31B synthesis tier

This directory contains the demo inputs the Kaggle notebook feeds to Gemma 4 31B.

## `synthesis_scenarios/`

Three pre-curated scenarios. Each is a JSON file containing an array of `EdgeTriageReport` objects — what the Android tier produces from real field input. The 31B notebook consolidates each array into a single `CommandCenterSynthesis` JSON.

| File | Disaster | Reports | Window |
|---|---|---|---|
| `scenario_a_jakarta_flood.json` | Rapid-onset flood | 12 | 90 min |
| `scenario_b_cianjur_quake.json` | Shallow earthquake | 15 | 2 hours |
| `scenario_c_compound_flood_fire.json` | Compound flood + electrical fires | 8 | 60 min |

Every report validates against the Pydantic `EdgeTriageReport` schema in `grg/schemas.py` (run `python grg/smoke_test.py` from the repo root to verify — all 35 should parse).

The three scenarios were chosen to exercise different facets of the synthesis tier:

- **A** — clustered priority zones, recurring electrical hazards, one vulnerable evacuee group.
- **B** — three sev-5 incidents, mass-casualty potential, one low-confidence ambiguous report (forces the model to handle uncertainty).
- **C** — reports disagree on the primary disaster type. The model must produce a coherent compound classification rather than pick one.

## `disaster_images_dataset.zip`

The Comprehensive Disaster Dataset (CDD) by Niloy, F. F.; Akhter, F. (2021), Mendeley Data, V1 — CC-BY 4.0. The Kaggle notebook's edge-tier section extracts a handful of images from this zip (one per disaster type, picked deterministically) to feed Gemma 4 E2B as multimodal input. This proves the same JSON contract holds at the edge as well as the cloud.
