# Kaggle Writeup Outline — 1500 word target

The writeup is the "proof of work" — it sits behind the video and convinces judges that the demo is backed by real engineering. It is judged under Technical Depth & Execution (30 pts) and contributes to Impact & Vision (40 pts).

## Title & subtitle (chosen Day 5)
- **Working title:** "Gemma Rescue Grid: an offline, edge-first disaster intelligence agent built on Gemma 4"
- **Working subtitle:** "Two Gemma 4 models, one operating picture, from the field worker's phone to the command center"
- Track selection: **Impact / Global Resilience** (we also indicate Special Tech / Cactus eligibility in the writeup body)

## Word budget per section (target 1500 total)

| Section | Words | Purpose |
|---|---|---|
| 1. Hook & problem | 150 | Why this matters — opens with a real disaster context |
| 2. Solution at a glance | 150 | What we built, in one paragraph a non-engineer can follow |
| 3. Architecture | 350 | Two-tier Gemma 4 with intelligent routing — the technical centerpiece |
| 4. Why Gemma 4 specifically | 250 | What Gemma 4 enables that other open models do not |
| 5. Technical challenges & how we solved them | 300 | Concrete engineering decisions and honest tradeoffs |
| 6. Real-world impact & ethics | 200 | Who benefits, deployment realism, privacy posture |
| 7. What's next | 100 | Brief roadmap — does not over-promise |
| **Total** | **1500** | |

## Section drafts (skeleton)

### 1. Hook & problem (~150 words)
- November 2024 Cianjur earthquake, 600+ deaths
- The first six hours are the deadliest, and they're spent reading 50 unsynced WhatsApp messages
- Cell coverage in disaster zones is the worst when it's needed most
- Existing AI disaster tools either (a) require connectivity or (b) are text-only chatbots that can't read a photo of a flooded street
- **Problem statement:** disaster coordination today fails at the data ingestion step, not the analytics step.

### 2. Solution at a glance (~150 words)
- One sentence: a field responder takes a photo and 4 seconds later their offline phone produces a structured emergency triage, then intelligently routes complex cases to a 31-billion-parameter command-center model when connectivity returns.
- Same Gemma 4 family on both tiers — frontier-quality reasoning at every scale of deployment.
- All data stays on the phone unless explicitly queued and synced.
- The whole stack is open source.

### 3. Architecture (~350 words)
- Diagram (we embed an image generated from `docs/architecture.md`)
- Edge tier: Gemma 4 E2B on Google AI Edge LiteRT, ~2.5GB on-device, multimodal (image + audio + text), targets sub-5s latency on mid-range Android
- Cloud tier: Gemma 4 31B-it (Unsloth, 4-bit, on 2x T4) for cross-report synthesis across the 128k context window
- The data contract: both tiers emit JSON conforming to documented schemas (`EdgeTriageReport`, `CommandCenterSynthesis`). Validators catch schema violations and trigger one retry.
- **Intelligent routing** (this is the Cactus Prize angle): the edge model self-assesses whether the report needs deeper analysis. The application layer combines that with deterministic context (cross-report aggregation, connectivity state) to decide fast-lane vs deep-lane. Routing rationale is logged and surfaced in the UI.
- Sync pattern: SQLite queue on device, HTTPS POST when online, deterministic batching window at the command center.

### 4. Why Gemma 4 specifically (~250 words)
- **Native multimodality on edge.** Most on-device LLMs are text-only. Disaster reports are inherently multimodal. Gemma 4 E2B accepts image + audio + text natively without separate encoders.
- **Same family at every scale.** The E2B on the phone shares architecture, chat template, and tokenizer with the 31B in the cloud. This is rare among open-model families and dramatically simplifies the routing story.
- **Native function calling and 128k context.** The edge tier uses Gemma 4's function-calling protocol to produce schema-shaped output reliably. The 31B's 128k context lets the command center ingest dozens of reports plus images in a single call.
- **Apache 2.0 weights.** Unrestricted commercial deployment — important for any real disaster-response NGO that wants to adopt this.
- **Per-Layer Embeddings + 2-bit/4-bit weight support** mean E2B fits in <1.5GB memory on supported devices, leaving headroom for the rest of the app.

### 5. Technical challenges & how we solved them (~300 words)
- **Challenge 1: reliable JSON output on edge.** E2B's text-only baseline is reasonable but multimodal inputs sometimes throw it off-format. Solution: structured-output prompt with three few-shot examples, validation + one-shot retry.
- **Challenge 2: intelligent routing without hard-coding heuristics.** We blend a model self-assessment (the edge model literally outputs `routing_recommendation`) with application heuristics that incorporate cross-report context the model can't see. This is the Cactus criterion's spirit: the *application* routes intelligently, drawing on both the model's introspection and the system's situational awareness.
- **Challenge 3: synthesis quality over conflicting reports.** Field reports often contradict (different responders, different angles, different times). We let Gemma 4 31B emit a `<|channel>thought` reasoning trace before the final JSON so judges and operators can see how the model resolved conflicts. The trace is part of the artifact, not hidden.
- **(Day 5 stretch) Challenge 4: domain-specific fine-tuning.** We curated 50–100 disaster images with ground-truth labels and ran Unsloth LoRA fine-tuning on Gemma 4 E2B to improve severity calibration. Results compared to zero-shot baseline in the notebook.

### 6. Real-world impact & ethics (~200 words)
- **800M+ people live more than 3 hours from a hospital.** Disaster coordination quality directly determines mortality in the golden hour.
- **Indonesia context:** flood-prone Jakarta, quake-prone Sulawesi, volcanic regions — connectivity in these areas is variable at best. An offline-first tool is not a nice-to-have, it's the only option.
- **Privacy:** images and audio stay on the device unless the user explicitly queues a report for deep analysis. No telemetry, no cloud upload by default.
- **Hoax and misuse:** the synthesis tier flags reports as low-quality, possible-duplicate, or conflicting rather than silently filtering. Decisions about validity are visible to the human coordinator, not hidden behind a confidence threshold.
- **Deployment path:** open APK, runs on any Android with adequate RAM (Snapdragon 7-class or above), no cloud dependency at all.

### 7. What's next (~100 words)
- **Mesh sync** over Wi-Fi Direct / Bluetooth between nearby phones — coordinated triage even when *no* signal exists, not just delayed signal
- **Specialized fine-tunes** for specific disaster types (flood depth estimation, structural damage classification)
- **Integration** with national disaster agency feeds (Indonesia BNPB, Philippine NDRRMC, etc.)
- **Multilingual coverage:** Gemma 4 already handles Bahasa Indonesia natively; we want to validate Tagalog, Vietnamese, Bengali, Swahili for similar use cases.

## Required attachments (per submission rules)

- [ ] Video link (YouTube, public, ≤3 min)
- [ ] Public code repository URL (GitHub)
- [ ] Live Demo URL (Kaggle notebook public link) and/or APK file attached
- [ ] Cover image (Media Gallery — required)
- [ ] Additional gallery images: architecture diagram, sample triage report screenshot, synthesis dashboard screenshot
- [ ] Track selection in writeup: **Global Resilience** (Impact Track)

## Version history

- **v0.1 (2026-05-13):** outline only, no prose yet
- **v0.5 (Day 4):** first full prose draft after notebook + app are functional
- **v1.0 (Day 6):** final polish before submission
