# Architecture

## The core insight: same family, different deployment

The Gemma 4 family ships four variants that span deployment scenarios from $200 phones to multi-GPU workstations. Gemma Rescue Grid uses two of them in concert:

- **Gemma 4 E2B** (2.3B effective params, ~2.5GB in `.litertlm` format) — on-device, multimodal, runs offline via Google AI Edge LiteRT. This is the **field responder** tier.
- **Gemma 4 31B** (dense, 4-bit quantized via Unsloth, runs on 2x T4 or any consumer GPU with 16GB+ VRAM) — high-context cross-report reasoning. This is the **command center** tier.

Both tiers consume the same multimodal inputs (text, image, audio) and emit JSON that conforms to schemas documented in [`prompts/output_schemas.md`](../prompts/output_schemas.md). The wire format between tiers is identical, by design — the phone produces individual reports; the command center consumes an array of them.

## Tier 1: edge (E2B on Android via LiteRT)

**Inputs:**
- Photograph (JPEG, encoded as image content block)
- Optional voice note (raw audio, 16kHz, ≤30s, Gemma 4 handles audio natively)
- Optional text note typed by responder
- Optional GPS coordinates from device

**Processing:**
1. Camera captures photo. Audio capture optional (voice memo).
2. App constructs a multimodal Gemma 4 message with system prompt from [`prompts/edge_triage_system.md`](../prompts/edge_triage_system.md).
3. LiteRT-LM runs inference on-device. Target latency: <5s on a Snapdragon 8 Gen 2-class phone, <8s on mid-range hardware.
4. Model emits a single JSON object matching the `EdgeTriageReport` schema, including a self-assessed `routing_recommendation` field (`fast_lane` or `deep_lane`).

**Outputs:**
- Structured JSON triage report
- A confidence number, a routing recommendation, and a rationale
- Local persistence: report written to a SQLite queue, regardless of connectivity

**Function calling on edge:** Gemma 4 E2B supports native function calling. For the demo we use it in **structured-output mode** (the model treats the JSON schema as its "function signature"), which is more reliable than asking the model to choose between many tools. This matches how production agents on edge are actually deployed — single canonical action with structured arguments.

## The routing decision

After the edge model emits a triage report, the app makes a routing decision. **This is the hook for the Cactus Prize criterion: "intelligently routes tasks between models."**

The decision combines two signals:
1. **Model self-assessment.** The E2B output includes a `routing_recommendation` it emitted itself. The model "knows when it's out of its depth" — high-stakes severity, unusual hazards, ambiguous imagery.
2. **Application heuristics.** Deterministic code reviews context the model can't see: how many reports have arrived from this area in the last hour, whether connectivity is currently available, queue depth, battery.

| Signal | Fast lane (E2B output is final) | Deep lane (queue for 31B) |
|---|---|---|
| Severity | 1–3 with high confidence | 4–5, or any with low confidence |
| Hazards | Common, well-classified | Unusual entries, conflicting cues |
| Cross-reports | First report from this area | 2+ reports from same area in 60min |
| Connectivity | Offline | Available now or recently |
| Model self-assessment | `fast_lane` | `deep_lane` |

Routing rationale is logged with every report so the demo can show it on screen ("queued for synthesis: severity 5 + 3 prior reports within 200m").

## Tier 2: command center (31B in Kaggle notebook)

**Inputs:**
- An array of `EdgeTriageReport` JSON objects (recently queued)
- Optional: original photos referenced by each report (Gemma 4 31B can re-process imagery)
- Time window of reports
- Geographic context (if location data present)

**Processing:**
1. Notebook loads Gemma 4 31B-it via Unsloth `FastModel.from_pretrained`, 4-bit, on 2x T4.
2. Constructs a synthesis prompt from [`prompts/cloud_synthesis_system.md`](../prompts/cloud_synthesis_system.md), with the report array serialized into the user message.
3. 31B reasons over up to 128k tokens of context — practically, dozens to low-hundreds of reports plus their images.
4. Emits a single JSON object matching the `CommandCenterSynthesis` schema.

**Outputs:**
- Consolidated incident picture: classification, geographic scope, severity distribution
- Priority evacuation zones with rationale
- Aggregated hazard list
- Recommended action queue with priorities and rationale
- Cross-report validity flags (duplicates, conflicts, low quality)

## Data flow end-to-end

```
1. Responder in field
   └─ Phone camera + voice memo
       └─ E2B on-device inference (LiteRT)
           └─ EdgeTriageReport JSON
               ├─ Fast lane: render on phone, locally
               └─ Deep lane: write to SQLite queue
                   └─ When online: HTTPS POST to command center
                       └─ Command center batches recent reports
                           └─ 31B synthesis (Kaggle notebook GPU)
                               └─ CommandCenterSynthesis JSON
                                   └─ Ops dashboard (notebook output)
```

For the hackathon demo:
- "Online" is simulated by toggling airplane mode off; the queued reports are written to a JSON file the notebook reads.
- "Command center" is the Kaggle notebook itself; judges can click "Run all" to see the synthesis live.

## What we are deliberately *not* building

- Routing/navigation (this is GIS, not AI; doesn't showcase Gemma 4)
- Heatmap visualization (UI window dressing; can be cut from video)
- Hoax detection (too easy to demo poorly; we surface conflicts honestly in synthesis instead)
- iOS app (Android only — LiteRT-LM Swift is "in development")
- Mesh/Bluetooth sync (massive engineering for one demo beat; "queue + HTTPS when online" is enough story)

## Open-source dependencies

| Component | License | Use |
|---|---|---|
| Gemma 4 model weights | Apache 2.0 | Inference (E2B and 31B) |
| LiteRT-LM | Apache 2.0 | On-device inference framework |
| Unsloth | LGPL-3.0 / Apache-2.0 | 31B 4-bit quantization + (optional) E2B LoRA fine-tune |
| Transformers | Apache 2.0 | Tokenizer + chat templates |

All custom code is Apache 2.0. Per hackathon rules, the winning submission will additionally be released under CC-BY 4.0.
