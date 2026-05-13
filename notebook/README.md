# Submission notebook

The Kaggle notebook is **both** the public code repository and the live demo (per submission rules). It is the second-most-important artifact after the video.

This folder will contain the final `gemma_rescue_grid.ipynb` once built. The structure below is the target layout — judges should be able to "Run all" on a 2x T4 Kaggle environment and see end-to-end functionality.

## Target notebook structure

| Section | Cells | Purpose |
|---|---|---|
| 0. Cover | markdown | Title, subtitle, track selection, links to video & live demo & repo |
| 1. The problem | markdown | 200-word version of the writeup hook with embedded disaster photo |
| 2. Architecture | markdown + diagram | The same architecture diagram from `docs/architecture.md` |
| 3. Setup | code | `!pip install unsloth transformers torch ...` — pinned versions |
| 4. Load Gemma 4 31B | code | `FastModel.from_pretrained("unsloth/gemma-4-31B-it", load_in_4bit=True, device_map="balanced", max_seq_length=32768)` |
| 5. Demo input: a single edge report | markdown + code | Load one `EdgeTriageReport` JSON to show schema |
| 6. Cross-report scenario A: Jakarta flood (12 reports) | code | Load scenario, render as table, prepare 31B prompt |
| 7. Run 31B synthesis on scenario A | code | Apply chat template, generate, parse JSON output, validate against schema |
| 8. Render ops dashboard for scenario A | code | Visualize the synthesis: priority zones, hazards, actions |
| 9. Scenario B: Cianjur quake (15 reports, includes severity 5) | code | Repeat with harder scenario |
| 10. Scenario C: compound flood+fire (8 reports, conflicting) | code | Show how 31B resolves conflicts with thinking trace visible |
| 11. The edge tier: Gemma 4 E2B | markdown | Explain that E2B runs on the phone (via LiteRT); link to APK & video |
| 12. Edge tier simulation in-notebook | code | Run `unsloth/gemma-4-E2B-it` on a single image to show the schema is identical |
| 13. Intelligent routing logic | code | Deterministic routing function with both model signal + heuristic; show 3 example reports getting routed |
| 14. (Day 5 stretch) Unsloth fine-tune of E2B | code | LoRA fine-tune on curated disaster set, before/after comparison |
| 15. Limitations & ethics | markdown | Honest section on what we don't do, privacy posture, hoax handling |
| 16. Reproducibility | markdown | Exact dependency versions, hardware notes, runtime estimates |

## Performance budget on Kaggle 2x T4

| Step | Estimated time |
|---|---|
| Setup + model download | ~3 min |
| Load 31B in 4-bit | ~2 min |
| Single 31B synthesis call (12 reports, no images) | ~30s |
| Single 31B synthesis call (12 reports + images) | ~90s |
| Load E2B for edge simulation | ~1 min |
| Single E2B inference | ~5s |
| Unsloth fine-tune (60 steps, LoRA, E2B) | ~45 min |
| **Total "Run all" time, no fine-tune** | **~10 min** |
| **Total with fine-tune** | **~55 min** |

A judge clicking "Run all" should see results in 10 minutes. Fine-tune is a separate cell guarded by `if RUN_FINETUNE:` so it doesn't block the basic demo.

## Required imports

```python
from unsloth import FastModel
from transformers import TextStreamer
import torch, json, uuid
from datetime import datetime, timezone
from pathlib import Path
import jsonschema  # for schema validation
from PIL import Image
import io, base64
```

## Notebook narrative tone

This is a serious technical document attached to a humanitarian project. Tone:
- Concise. Markdown cells under 100 words each except sections 1 and 11.
- Show, don't tell. Every claim is backed by an executable cell whose output appears below it.
- Acknowledge limitations honestly. Judges respect "here's what we'd improve" more than overclaim.
- No marketing speak. The video carries the emotion; the notebook carries the engineering.

## Submission link

Once the notebook is uploaded to Kaggle, the URL will be:
- `https://www.kaggle.com/code/<user>/gemma-rescue-grid`

This URL goes into the writeup's Live Demo + Code Repository sections.
