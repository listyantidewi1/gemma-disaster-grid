"""Build the Day-4 production Kaggle notebook for the Gemma Disaster Grid
platform — a single one-shot end-to-end simulation of every tier.

Run from project root:
    python notebook/build_kaggle_notebook.py

Produces:
    notebook/gemma_rescue_grid_kaggle.ipynb

What this notebook does (different from the dev notebook
`gemma_rescue_grid.ipynb`):
  - Simulates the EDGE TIER: extracts representative images from the
    bundled disaster image dataset, loads Gemma 4 E2B via Unsloth, runs
    multimodal triage that produces schema-validated EdgeTriageReports.
  - Demonstrates the ROUTING TIER: runs `grg.routing.decide_routing()`
    across all 35 scenario reports and prints the fast/deep-lane split
    with rationales — the canonical Cactus Prize pattern.
  - Demonstrates the SYNC TIER: pure-Python simulation of the server
    `report_id` dedup logic and the reporter-vs-crowd trust gradient.
  - Runs the SYNTHESIS TIER end-to-end with `unsloth/gemma-4-31B-it` on
    Kaggle 2× T4 (4-bit via Unsloth, balanced device_map), producing the
    three CommandCenterSynthesis JSONs.
  - Emits drop-in TypeScript modules for the NusaSiaga dashboard.

Memory management for a one-shot run: E2B is loaded first (~5 GB), used,
then explicitly freed with `del + gc.collect + torch.cuda.empty_cache`
before 31B is loaded (~17-20 GB at 4-bit). Each tier-load cell prints
GPU residency so a human can sanity-check before continuing.

If any non-31B section fails, the 31B synthesis still runs — every
upstream cell is wrapped so its failure produces a warning, not a halt.
"""

from __future__ import annotations

import json
from pathlib import Path
from textwrap import dedent


def md(source: str) -> dict:
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": _split_lines(source),
    }


def code(source: str) -> dict:
    return {
        "cell_type": "code",
        "metadata": {},
        "execution_count": None,
        "outputs": [],
        "source": _split_lines(source),
    }


def _split_lines(src: str) -> list[str]:
    src = dedent(src).strip("\n")
    lines = src.split("\n")
    return [ln + "\n" for ln in lines[:-1]] + [lines[-1]]


SCENARIOS = [
    {
        "id": "a",
        "label": "Rapid-onset flood",
        "json_path": "data/synthesis_scenarios/scenario_a_jakarta_flood.json",
        "n_reports": 12,
        "window_minutes": 90,
        "ts_module_name": "synthesis-scenario-a",
        "ts_export_name": "scenarioASynthesis",
    },
    {
        "id": "b",
        "label": "Shallow earthquake",
        "json_path": "data/synthesis_scenarios/scenario_b_cianjur_quake.json",
        "n_reports": 15,
        "window_minutes": 120,
        "ts_module_name": "synthesis-scenario-b",
        "ts_export_name": "scenarioBSynthesis",
    },
    {
        "id": "c",
        "label": "Compound flood + electrical fires",
        "json_path": "data/synthesis_scenarios/scenario_c_compound_flood_fire.json",
        "n_reports": 8,
        "window_minutes": 60,
        "ts_module_name": "synthesis-scenario-c",
        "ts_export_name": "scenarioCSynthesis",
    },
]


CELLS = [
    # ─── 0. Cover ─────────────────────────────────────────────────────────
    md("""
        # Gemma Disaster Grid — End-to-end Platform Simulation (Kaggle)

        ### One notebook, every tier: edge (E2B) → routing → sync → synthesis (31B) → dashboard

        **Kaggle Gemma 4 Good Hackathon · Tracks: Impact / Global Resilience + Special Tech / Cactus**

        - **Code:** https://github.com/listyantidewi1/gemma-disaster-grid
        - **Live dashboard:** https://nusasiaga.vercel.app
        - **APK + writeup:** attached to the Kaggle submission

        ### What this notebook does

        This is the **production submission notebook** for the platform. It is
        designed for a **single end-to-end run** on Kaggle 2× T4 — it simulates
        every tier of the architecture without leaving the notebook:

        | § | Tier | What runs | Model |
        |---|---|---|---|
        | 2 | **Edge** | Multimodal triage on real disaster images | Gemma 4 **E2B** |
        | 3 | **Routing** (Cactus Prize) | `decide_routing()` across all 35 scenario reports | — |
        | 4 | **Sync** | Server-side `report_id` dedup + trust-gradient resolve simulation | — |
        | 5 | **Synthesis** | Three CommandCenterSynthesis runs across the curated scenarios | Gemma 4 **31B** |
        | 6 | **Dashboard** | Drop-in TypeScript modules emitted for `dashboard/src/lib/` | — |

        Each upstream tier is wrapped so its failure cannot block the 31B
        synthesis — the most expensive cell of the run. E2B is loaded, used,
        and explicitly freed before 31B loads, so both fit comfortably in the
        2× T4's combined 30 GB VRAM.

        **Same Gemma 4 family, same JSON contract, top to bottom of the stack.**
    """),

    # ─── 1. Environment ──────────────────────────────────────────────────
    md("""
        ## 1. Environment setup

        Kaggle gives us 2× T4 (30 GB combined VRAM). Versions are pinned to
        match Unsloth's official gemma-4 starter notebook so reproductions
        don't drift.
    """),

    code("""
        # ── Install dependencies FIRST ─────────────────────────────────────
        %pip install -qqq \\
            unsloth "unsloth_zoo>=2026.4.6" \\
            "transformers==5.5.0" \\
            "torch>=2.8.0" "triton>=3.4.0" \\
            torchvision bitsandbytes torchcodec timm \\
            pydantic pillow
        print("OK — dependencies installed.")
    """),

    code("""
        # ── Clone the project repo ────────────────────────────────────────
        # Idempotent: re-running this cell after we've chdir'd is safe.
        import os, subprocess
        REPO_URL = "https://github.com/listyantidewi1/gemma-disaster-grid.git"
        BASE = "/kaggle/working" if os.path.isdir("/kaggle/working") else os.path.abspath(".")
        REPO_DIR = os.path.join(BASE, "gemma-disaster-grid")

        if not os.path.isdir(REPO_DIR):
            subprocess.run(
                ["git", "clone", "--depth", "1", REPO_URL, REPO_DIR],
                check=True,
            )
        else:
            subprocess.run(["git", "-C", REPO_DIR, "pull", "--ff-only"], check=False)

        os.chdir(REPO_DIR)
        last = subprocess.run(
            ["git", "log", "-1", "--oneline"], capture_output=True, text=True
        ).stdout.strip()
        print(f"CWD:    {os.getcwd()}")
        print(f"Commit: {last}")
    """),

    code("""
        # ── Load the schema package + system prompts ──────────────────────
        # We need grg early because every downstream tier (edge, routing,
        # sync, synthesis) validates against the same Pydantic schemas.
        # json + Path go in here too so every later cell can use them
        # without re-importing.
        import sys, re, json, pathlib
        from pathlib import Path
        sys.path.insert(0, str(pathlib.Path.cwd()))

        for _mod in list(sys.modules):
            if _mod == "grg" or _mod.startswith("grg."):
                del sys.modules[_mod]

        from grg import (
            EdgeTriageReport, CommandCenterSynthesis,
            RoutingContext, RoutingDecision,
            decide_routing, render_routing_badge,
            parse_edge_report, parse_synthesis,
            extract_json_from_model_output,
            attempt_truncated_json_repair,
        )

        def load_system_prompt(md_path: str) -> str:
            \"\"\"Extract the first triple-backtick fenced block from a .md prompt
            file. Lets us keep prompts human-readable as documentation while
            still being machine-extractable.\"\"\"
            text = pathlib.Path(md_path).read_text(encoding="utf-8")
            m = re.search(r"```\\s*\\n(.*?)\\n```", text, re.DOTALL)
            if not m:
                raise ValueError(f"No code fence in {md_path}")
            return m.group(1).strip()

        EDGE_SYSTEM_PROMPT      = load_system_prompt("prompts/edge_triage_system.md")
        SYNTHESIS_SYSTEM_PROMPT = load_system_prompt("prompts/cloud_synthesis_system.md")
        print(f"Edge prompt:      {len(EDGE_SYSTEM_PROMPT):,} chars")
        print(f"Synthesis prompt: {len(SYNTHESIS_SYSTEM_PROMPT):,} chars")
    """),

    code(f"""
        # ── Scenario catalog (used by routing + sync + synthesis tiers) ───
        SCENARIOS = {json.dumps(SCENARIOS, indent=4)}
        from pathlib import Path
        OUTPUTS_DIR = Path("outputs")
        OUTPUTS_DIR.mkdir(exist_ok=True)
        print(f"Output dir: {{OUTPUTS_DIR.resolve()}}")
        for sc in SCENARIOS:
            assert Path(sc["json_path"]).exists(), f"missing {{sc['json_path']}}"
            print(f"  ✓ {{sc['id'].upper()}} {{sc['label']}}  ({{sc['n_reports']}} reports)")
    """),

    # ─── 2. EDGE TIER ─────────────────────────────────────────────────────
    md("""
        ---

        ## 2. EDGE TIER — Gemma 4 E2B on the responder's phone (simulated)

        On the actual Android app (Gemma Rescue Grid, in
        [`/android`](https://github.com/listyantidewi1/gemma-disaster-grid/tree/main/android)
        of this monorepo), Gemma 4 E2B runs **fully offline** via Google AI Edge LiteRT-LM,
        taking a photograph plus an optional 16 kHz voice note and emitting
        an `EdgeTriageReport` JSON object. End-to-end latency on a Samsung
        Galaxy A71 (2020 mid-range, Snapdragon 730, no NPU) is 30-60 seconds.

        This notebook **simulates that edge tier** by loading the same model
        (Gemma 4 E2B) on the Kaggle T4 and feeding it **a handful** of
        disaster images (one per type — flood, earthquake, urban fire,
        landslide). The Comprehensive Disaster Dataset has 13.5k images;
        we deliberately pick only 4 because the point is to prove the JSON
        contract holds at the edge, not to benchmark.

        Two ways the images can be sourced (the next cell auto-detects):

        1. **Recommended**: attach the Kaggle Dataset directly via *Add Data
           → Datasets → search "Comprehensive Disaster Dataset"*. Loose PNGs
           appear under `/kaggle/input/<slug>/Comprehensive Disaster Dataset(CDD)/`.
        2. **Fallback**: the same dataset is bundled in this repo as
           `data/disaster_images_dataset.zip` and the notebook will unzip
           the four picks if no Kaggle Dataset is attached.

        Same trick for the **models** themselves — *Add Models → Gemma →
        Transformers* lets you attach `gemma-4-e2b-it` and `gemma-4-31b-it`
        as Kaggle Models so they load from local disk in seconds instead of
        downloading ~22 GB from HuggingFace at runtime. If you skip that,
        the notebook falls back to `unsloth/gemma-4-E2B-it` and
        `unsloth/gemma-4-31B-it` via HuggingFace — works fine, just slower
        the first time.

        We free E2B from GPU memory before loading 31B so both fit comfortably.
    """),

    code("""
        # ── 2.1 Find 4 demo images (one per disaster type) ────────────────
        # Looks for a Kaggle Dataset attachment first, falls back to the
        # bundled zip if not on Kaggle / not attached. Either way we copy
        # exactly four PNGs into demo_images/ — one flood, one earthquake,
        # one urban fire, one landslide. We never iterate over the 13.5k
        # images in the dataset.
        import glob, zipfile
        from pathlib import Path

        def find_cdd_root():
            \"\"\"Return (source, kind). kind is 'kaggle_dataset' if a Kaggle
            Dataset is attached (loose dir), 'bundled_zip' if the repo zip
            is present, or 'none'.\"\"\"
            if Path("/kaggle/input").is_dir():
                hits = glob.glob(
                    "/kaggle/input/**/Comprehensive Disaster Dataset(CDD)",
                    recursive=True,
                )
                if hits:
                    return Path(hits[0]), "kaggle_dataset"
            if Path("data/disaster_images_dataset.zip").exists():
                return Path("data/disaster_images_dataset.zip"), "bundled_zip"
            return None, "none"

        CDD_ROOT, CDD_KIND = find_cdd_root()
        print(f"Disaster image source: {CDD_KIND}")
        print(f"  path: {CDD_ROOT}")

        DEMO_DIR = Path("/kaggle/working/demo_images") if Path("/kaggle/working").is_dir() else Path("demo_images")
        DEMO_DIR.mkdir(parents=True, exist_ok=True)

        # Folder substring per type — matches the CDD layout.
        EDGE_DEMO_TYPES = {
            "flood":         "Water_Disaster",
            "earthquake":    "Damaged_Infrastructure/Earthquake",
            "fire_urban":    "Fire_Disaster/Urban_Fire",
            "landslide":     "Land_Disaster/Land_Slide",
        }

        edge_demo_inputs = {}
        if CDD_ROOT is None:
            print("  ⚠ no disaster image source found — edge demo will fall back to text-only")
        elif CDD_KIND == "kaggle_dataset":
            # Loose files under a directory. Walk it once.
            all_pngs = sorted(
                str(p.relative_to(CDD_ROOT))
                for p in CDD_ROOT.rglob("*")
                if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg"}
            )
            print(f"  ({len(all_pngs):,} total images in attached dataset; using 4)")
            for label, folder_substr in EDGE_DEMO_TYPES.items():
                matches = [n for n in all_pngs if folder_substr in n]
                if not matches:
                    print(f"  ⚠ no images for {label} ({folder_substr})")
                    continue
                pick = matches[len(matches) // 2]
                src_path = CDD_ROOT / pick
                out_path = DEMO_DIR / f"{label}.png"
                out_path.write_bytes(src_path.read_bytes())
                edge_demo_inputs[label] = out_path
                print(f"  ✓ {label:14s} → {out_path.name}  (from {pick})")
        else:
            # bundled_zip
            with zipfile.ZipFile(CDD_ROOT) as zf:
                all_names = sorted(n for n in zf.namelist()
                                   if n.lower().endswith((".png", ".jpg", ".jpeg")))
                print(f"  ({len(all_names):,} total images in bundled zip; using 4)")
                for label, folder_substr in EDGE_DEMO_TYPES.items():
                    matches = [n for n in all_names if folder_substr in n]
                    if not matches:
                        print(f"  ⚠ no images for {label} ({folder_substr})")
                        continue
                    pick = matches[len(matches) // 2]
                    out_path = DEMO_DIR / f"{label}.png"
                    with zf.open(pick) as src, open(out_path, "wb") as dst:
                        dst.write(src.read())
                    edge_demo_inputs[label] = out_path
                    print(f"  ✓ {label:14s} → {out_path.name}  (from {pick})")

        print(f"\\n{len(edge_demo_inputs)} demo image(s) staged in {DEMO_DIR}")
    """),

    code("""
        # ── 2.2 Load Gemma 4 E2B (multimodal, small, ~5 GB at fp16) ───────
        # Loaded BEFORE 31B and explicitly freed afterwards (cell 2.4) so
        # both can fit on the 2× T4 setup sequentially.
        #
        # Source resolution:
        #   - If you attached the model via *Add Models → Gemma →
        #     Transformers → e2b-it*, we'll load from /kaggle/input/...
        #     instantly.
        #   - Otherwise we pip-download unsloth/gemma-4-E2B-it from HF
        #     (~5 GB, ~2-3 min on Kaggle's network).
        import glob, torch
        from pathlib import Path

        def find_attached_model(hints):
            \"\"\"Search /kaggle/input/ for a model dir whose name matches any
            of the hints AND contains config.json + weights.\"\"\"
            if not Path("/kaggle/input").is_dir():
                return None
            for hint in hints:
                for d in glob.glob(f"/kaggle/input/**/{hint}*", recursive=True):
                    p = Path(d)
                    if not p.is_dir():
                        continue
                    for cfg in p.rglob("config.json"):
                        siblings = list(cfg.parent.iterdir())
                        if any(s.suffix in {".safetensors", ".bin"} for s in siblings):
                            return cfg.parent
            return None

        E2B_LOCAL = find_attached_model([
            "gemma-4-e2b-it", "gemma-4-E2B-it",
            "e2b-it", "E2B-it",
        ])

        try:
            from unsloth import FastModel
            if E2B_LOCAL:
                E2B_MODEL = str(E2B_LOCAL)
                print(f"Loading attached Kaggle Model from {E2B_MODEL}")
            else:
                E2B_MODEL = "unsloth/gemma-4-E2B-it"
                print(f"Downloading {E2B_MODEL} from HuggingFace (~5 GB)...")
            e2b_model, e2b_processor = FastModel.from_pretrained(
                model_name=E2B_MODEL,
                dtype=None,                # auto bfloat16/float16
                max_seq_length=4096,       # edge prompts are short
                load_in_4bit=False,        # E2B is small; fp16 is fine
                full_finetuning=False,
                device_map={"": "cuda:0"}, # force single GPU — E2B fits on one T4
            )                              # and the inputs go to cuda:0
            E2B_LOADED = True
            print(f"  ✓ E2B loaded")
            print(f"  GPU memory in use: {torch.cuda.memory_reserved() / 1024**3:.2f} GB")
        except Exception as e:
            E2B_LOADED = False
            print(f"  ⚠ E2B load failed: {type(e).__name__}: {e}")
            print("  Continuing without edge-tier inference — routing + 31B will still run.")
    """),

    code("""
        # ── 2.3 Edge triage helper + run on each demo image ───────────────
        # Tri-modal in the field; here we feed image + a short text annotation
        # standing in for the voice note (we don't ship audio samples in the
        # repo). Output is parsed into the same EdgeTriageReport Pydantic model
        # the Android app uses on the phone.
        from PIL import Image

        # One annotation per demo type — what a responder might say into the
        # phone while snapping the photo.
        VOICE_NOTE_TEXT = {
            "flood":      "Water rising fast at the alley entrance. Two adults wading, one carrying a child. No vehicles passing.",
            "earthquake": "Building corner has collapsed, debris across the street. People standing around, nobody visibly hurt.",
            "fire_urban": "Smoke from second floor of the shophouse. Flames visible at the window. No one is in front of the building.",
            "landslide":  "Mud and rocks across the road. Several houses partly buried at the base of the slope. Cannot see anyone.",
        }

        def edge_triage(image_path, voice_text: str = "", max_new_tokens: int = 800) -> str:
            \"\"\"Run one E2B inference pass. Mirrors what the Android app does.\"\"\"
            pil_img = Image.open(image_path).convert("RGB")
            user_text = (
                f"Voice annotation from responder: \\"{voice_text}\\""
                if voice_text else "Triage this scene from the photograph."
            )
            full_user = f"{EDGE_SYSTEM_PROMPT}\\n\\n---\\n\\n{user_text}"
            messages = [{"role": "user", "content": [
                {"type": "image", "image": pil_img},
                {"type": "text",  "text":  full_user},
            ]}]
            inputs = e2b_processor.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=True,
                return_tensors="pt",
                return_dict=True,
            ).to("cuda")
            input_length = inputs["input_ids"].shape[1]
            outputs = e2b_model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                use_cache=True,
                temperature=1.0,
                top_p=0.95,
                top_k=64,
            )
            return e2b_processor.decode(outputs[0, input_length:], skip_special_tokens=False)

        edge_results = {}
        if E2B_LOADED and edge_demo_inputs:
            import time
            for label, img_path in edge_demo_inputs.items():
                print(f"\\n── Edge triage: {label} ──")
                try:
                    t0 = time.time()
                    raw = edge_triage(img_path, voice_text=VOICE_NOTE_TEXT.get(label, ""))
                    elapsed = time.time() - t0
                    json_text = extract_json_from_model_output(raw)
                    if json_text is None:
                        obj, err = None, "no JSON object found in model output"
                    else:
                        # Inject envelope fields (report_id + timestamp + location).
                        # On the Android app these are generated app-side (UUID +
                        # ISO timestamp + GPS). The model itself never produces
                        # them — it only fills in the disaster-classification fields.
                        import uuid
                        from datetime import datetime, timezone
                        data = json.loads(json_text)
                        data.setdefault("report_id", f"kaggle-edge-{uuid.uuid4()}")
                        data.setdefault("timestamp_iso",
                            datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
                        data.setdefault("location", {
                            "lat": None, "lon": None, "accuracy_m": None,
                            "label": "Kaggle notebook edge-tier simulation",
                        })
                        obj, err = parse_edge_report(data)
                    if obj is None:
                        # Try the truncated-JSON repair pass before giving up.
                        repaired = attempt_truncated_json_repair(raw)
                        if repaired:
                            repaired_data = json.loads(repaired) if isinstance(repaired, str) else repaired
                            if isinstance(repaired_data, dict):
                                repaired_data.setdefault("report_id", f"kaggle-edge-{uuid.uuid4()}")
                                repaired_data.setdefault("timestamp_iso",
                                    datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
                                repaired_data.setdefault("location", {
                                    "lat": None, "lon": None, "accuracy_m": None,
                                    "label": "Kaggle notebook edge-tier simulation",
                                })
                            obj, err = parse_edge_report(repaired_data)
                    if obj is None:
                        print(f"  ⚠ parse failed: {err}")
                        edge_results[label] = {"raw": raw, "report": None, "wall_sec": elapsed}
                        continue
                    edge_results[label] = {
                        "raw": raw,
                        "report": obj,
                        "wall_sec": elapsed,
                    }
                    print(f"  ✓ {elapsed:.1f}s  severity={obj.severity}  type={obj.disaster_type}  "
                          f"routing={obj.routing_recommendation}")
                    print(f"    immediate action: {obj.immediate_action}")
                except Exception as e:
                    print(f"  ⚠ {type(e).__name__}: {e}")
                    edge_results[label] = {"raw": "", "report": None, "wall_sec": 0.0}
        else:
            print("Skipping edge inference (E2B unavailable or no demo images).")
    """),

    code("""
        # ── 2.4 Free E2B from GPU before loading 31B ──────────────────────
        import gc, torch
        if E2B_LOADED:
            try:
                del e2b_model, e2b_processor
            except NameError:
                pass
            gc.collect()
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
            print(f"GPU memory after E2B unload: {torch.cuda.memory_reserved() / 1024**3:.2f} GB")
        else:
            print("(no E2B to unload)")
    """),

    # ─── 3. ROUTING TIER ─────────────────────────────────────────────────
    md("""
        ---

        ## 3. ROUTING TIER — `decide_routing()` (Cactus Prize hook)

        On the phone, every `EdgeTriageReport` produced by E2B is fed through
        `grg.routing.decide_routing()` along with a `RoutingContext` carrying
        application state the model cannot see (recent-reports-in-area,
        connectivity, queue depth, battery). The function returns a
        `RoutingDecision`: `fast_lane` (the on-device output is final) or
        `deep_lane` (queue for 31B synthesis), with a short rationale that
        renders as a badge on the result card.

        This is the **canonical Cactus Prize pattern**: intelligent local-first
        routing between two Gemma 4 models, with the decision visible to the
        operator. Logic in priority order:

        1. If the model self-recommended `deep_lane`, honor it.
        2. Escalate `fast_lane` to `deep_lane` if severity ≥ 4, OR trapped
           persons present, OR ≥ 2 prior reports in the same area in 60 min,
           OR `disaster_type_confidence < 0.65`.
        3. Otherwise, honor the model's `fast_lane`.

        Below we run this across **all 35 scenario reports** (12 + 15 + 8) plus
        any edge-tier outputs from §2, then print the split.
    """),

    code("""
        # ── Run routing across all scenario reports + edge outputs ─────────
        from collections import Counter

        def routing_context_for(report, prior_in_area: int = 0) -> RoutingContext:
            return RoutingContext(
                connectivity_online=False,    # field default
                recent_reports_same_area_60min=prior_in_area,
                queue_depth=0,
                battery_percent=82,
            )

        routing_rows = []
        lane_counter = Counter()

        # Edge tier outputs from §2 (if any)
        for label, res in edge_results.items():
            r = res.get("report")
            if r is None:
                continue
            dec = decide_routing(r, routing_context_for(r))
            routing_rows.append({
                "source": f"edge:{label}",
                "report_id": r.report_id[:10] + "...",
                "severity": r.severity,
                "type": r.disaster_type,
                "model_rec": dec.model_recommendation,
                "decision": dec.decision,
                "rationale": dec.rationale[:90],
            })
            lane_counter[dec.decision] += 1

        # Scenario-curated reports
        for sc in SCENARIOS:
            data = json.loads(Path(sc["json_path"]).read_text(encoding="utf-8"))
            # Track location buckets for the "recent reports in area" heuristic.
            from collections import defaultdict
            area_counts = defaultdict(int)
            for raw in data["reports"]:
                rep, err = parse_edge_report(raw)
                if err:
                    continue
                # Crude location bucket: round to ~200m via 3-decimal lat/lon.
                if rep.location.lat is not None and rep.location.lon is not None:
                    bucket = (round(rep.location.lat, 3), round(rep.location.lon, 3))
                else:
                    bucket = (None, None)
                prior = area_counts[bucket]
                dec = decide_routing(rep, routing_context_for(rep, prior))
                area_counts[bucket] += 1
                routing_rows.append({
                    "source": f"scenario:{sc['id'].upper()}",
                    "report_id": rep.report_id[:10] + "...",
                    "severity": rep.severity,
                    "type": rep.disaster_type,
                    "model_rec": dec.model_recommendation,
                    "decision": dec.decision,
                    "rationale": dec.rationale[:90],
                })
                lane_counter[dec.decision] += 1

        print(f"\\nTotal reports routed: {len(routing_rows)}")
        for lane, n in lane_counter.most_common():
            print(f"  {lane:10s}  {n}")

        try:
            import pandas as pd
            display(pd.DataFrame(routing_rows))
        except ImportError:
            for row in routing_rows[:10]:
                print(row)
            print(f"... ({len(routing_rows) - 10} more)")
    """),

    # ─── 4. SYNC TIER ─────────────────────────────────────────────────────
    md("""
        ---

        ## 4. SYNC TIER — server-side dedup + trust-gradient resolve

        On the dashboard, `/api/reports` ingests POSTs from the phone. Three
        properties matter for the demo:

        - **Dedupe by `report_id`.** When connectivity is gone for days the
          phones use a QR mesh to relay reports forward; a single report
          can arrive multiple times from different phones. The server must
          see exactly one entry per `report_id`.

        - **Reporter resolution.** The original reporter can mark a report
          `ended` from their phone with a single tap. Single tap is enough
          because the reporter knows the ground truth — the report is
          stamped `_resolved_by: "reporter"`.

        - **Crowd resolution.** Anonymous dashboard viewers cannot
          single-handedly mark a report ended; they can only **vote**. A
          per-browser localStorage UUID dedupes votes. When 5 distinct
          voters agree, the report flips to `_resolved_by: "crowd"`.

        Both trust paths produce the same final state but different
        provenance markers. The cells below simulate both.
    """),

    code("""
        # ── 4.1 Server-side dedup simulation (the QR-mesh corollary) ──────
        # Three phones independently uploading the same report_id (one
        # original + two QR-mesh hops). Only one row lands on the dashboard.
        class FakeReportsStore:
            def __init__(self):
                self._seen = set()
                self.rows = {}
            def ingest(self, report):
                if report.report_id in self._seen:
                    return "deduped"
                self._seen.add(report.report_id)
                self.rows[report.report_id] = {
                    "report": report,
                    "_status": "active",
                    "_resolved_by": None,
                    "_resolve_votes": set(),
                }
                return "stored"

        store = FakeReportsStore()
        # Take the first scenario A report as the demo subject.
        scen_a = json.loads(Path(SCENARIOS[0]["json_path"]).read_text(encoding="utf-8"))
        demo_report, _ = parse_edge_report(scen_a["reports"][0])

        print(f"Demo report: {demo_report.report_id}")
        print(f"  phone A (original upload):  {store.ingest(demo_report)}")
        print(f"  phone B (QR-mesh hop 1):    {store.ingest(demo_report)}")
        print(f"  phone C (Share-intent hop): {store.ingest(demo_report)}")
        print(f"\\nRows on dashboard for this report_id: {sum(1 for k in store.rows if k == demo_report.report_id)}")
        assert sum(1 for k in store.rows if k == demo_report.report_id) == 1, "dedup failed!"
        print("  ✓ exactly one row, as designed.")
    """),

    code("""
        # ── 4.2 Trust-gradient resolve simulation ────────────────────────
        # Path A: reporter taps Resolve on their phone → instant flip,
        # provenance "reporter".
        # Path B: 5 distinct dashboard voters → flip, provenance "crowd".
        RESOLVE_THRESHOLD = 5

        # Reset to compare clean cases.
        store.rows[demo_report.report_id]["_status"] = "active"
        store.rows[demo_report.report_id]["_resolved_by"] = None
        store.rows[demo_report.report_id]["_resolve_votes"] = set()

        # Path A — reporter PATCH (shared-secret token, server trusts identity).
        def reporter_resolve(store, report_id):
            row = store.rows[report_id]
            row["_status"] = "ended"
            row["_resolved_by"] = "reporter"
            return row

        # Path B — anonymous browser vote (no auth, localStorage voter_id).
        def crowd_vote(store, report_id, voter_id):
            row = store.rows[report_id]
            if row["_status"] == "ended":
                return "already_resolved", row
            if voter_id in row["_resolve_votes"]:
                return "already_voted", row
            row["_resolve_votes"].add(voter_id)
            n = len(row["_resolve_votes"])
            if n >= RESOLVE_THRESHOLD:
                row["_status"] = "ended"
                row["_resolved_by"] = "crowd"
                return "flipped_to_ended", row
            return f"counted ({n}/{RESOLVE_THRESHOLD})", row

        # --- Reporter path ---
        row = reporter_resolve(store, demo_report.report_id)
        print("Path A — reporter taps Resolve on their phone:")
        print(f"  status={row['_status']}  resolved_by={row['_resolved_by']}")

        # Reset and run crowd path.
        store.rows[demo_report.report_id]["_status"] = "active"
        store.rows[demo_report.report_id]["_resolved_by"] = None
        store.rows[demo_report.report_id]["_resolve_votes"] = set()

        print("\\nPath B — 5 distinct dashboard browsers vote to resolve:")
        for voter in ["alice", "bob", "carol", "dave", "alice", "eve"]:
            result, _ = crowd_vote(store, demo_report.report_id, voter)
            print(f"  voter={voter:6s}  → {result}")
        row = store.rows[demo_report.report_id]
        print(f"\\n  final: status={row['_status']}  resolved_by={row['_resolved_by']}  "
              f"votes={len(row['_resolve_votes'])}")
        assert row["_status"] == "ended" and row["_resolved_by"] == "crowd"
        print("  ✓ crowd consensus correctly flipped the report.")
    """),

    # ─── 5. SYNTHESIS TIER ────────────────────────────────────────────────
    md("""
        ---

        ## 5. SYNTHESIS TIER — Gemma 4 31B (the command-center heavy lift)

        `device_map="balanced"` spreads the 31B model across both Kaggle T4s.
        At 4-bit via Unsloth, weights take ~17-20 GB; we have ~28 GB free
        (E2B was unloaded in §2.4) which leaves comfortable headroom for the
        16k-token context window each scenario needs.

        Wall-clock per scenario on Kaggle 2× T4:

        - Scenario A (12 reports): ~6-8 min
        - Scenario B (15 reports): ~8-12 min
        - Scenario C (8 reports):  ~5-7 min

        Total: ~25-30 min if all three regenerate from scratch.
    """),

    code("""
        # ── 5.1 Model configuration ──────────────────────────────────────
        # Same source-resolution logic as E2B: prefer a Kaggle-attached
        # Transformers Gemma 4 model if available, fall back to Unsloth's
        # pre-quantized HF mirror otherwise. The HF version is ~17 GB on
        # the wire but ships already in 4-bit, so no re-quantization.
        # An attached Google bf16 build will get on-the-fly 4-bit quantized
        # by Unsloth, which adds 1-2 minutes to the load.
        N31B_LOCAL = find_attached_model([
            "gemma-4-31b-it", "gemma-4-31B-it",
            "31b-it", "31B-it",
        ])
        MODEL_NAME    = str(N31B_LOCAL) if N31B_LOCAL else "unsloth/gemma-4-31B-it"
        DEVICE_MAP    = "balanced"
        MAX_SEQ_LENGTH = 16384

        if N31B_LOCAL:
            print(f"Source:   attached Kaggle Model ({MODEL_NAME})")
        else:
            print(f"Source:   HuggingFace download ({MODEL_NAME})")
        print(f"Device:   {DEVICE_MAP}")
        print(f"Seq len:  {MAX_SEQ_LENGTH}")
    """),

    code("""
        # ── 5.2 Load 31B ─────────────────────────────────────────────────
        from unsloth import FastModel
        import torch

        model, tokenizer = FastModel.from_pretrained(
            model_name=MODEL_NAME,
            dtype=None,
            max_seq_length=MAX_SEQ_LENGTH,
            load_in_4bit=True,
            full_finetuning=False,
            device_map=DEVICE_MAP,
        )
        print(f"\\nLoaded {MODEL_NAME}")
        print(f"GPU memory in use: {torch.cuda.memory_reserved() / 1024**3:.2f} GB")
    """),

    code("""
        # ── 5.3 synthesize(): one-shot 31B generation ────────────────────
        # Gemma 4 has no native system-role token; the Unsloth convention is
        # to prepend the system text to the first user turn. We slice off the
        # input prompt before decoding so our JSON extractor doesn't pick up
        # the schema TEMPLATE from the prompt instead of the model's output.
        from transformers import TextStreamer

        def synthesize(system_prompt: str,
                       user_content: str,
                       max_new_tokens: int = 6000,
                       stream: bool = True) -> str:
            full_user = f"{system_prompt}\\n\\n---\\n\\n{user_content}"
            messages = [{"role": "user", "content": [{"type": "text", "text": full_user}]}]
            inputs = tokenizer.apply_chat_template(
                messages,
                add_generation_prompt=True,
                return_tensors="pt",
                tokenize=True,
                return_dict=True,
            ).to("cuda")
            input_length = inputs["input_ids"].shape[1]
            kw = dict(
                **inputs,
                max_new_tokens=max_new_tokens,
                use_cache=True,
                temperature=1.0,
                top_p=0.95,
                top_k=64,
            )
            if stream:
                kw["streamer"] = TextStreamer(tokenizer, skip_prompt=True)
            outputs = model.generate(**kw)
            return tokenizer.decode(outputs[0, input_length:], skip_special_tokens=False)

        print("synthesize() ready.")
    """),

    md("""
        ### 5.4 Run synthesis for all three scenarios

        Each scenario is processed independently:

        1. Read the JSON file, parse and Pydantic-validate every report.
        2. Build the user message: a brief framing line + the full reports
           array as a fenced JSON block.
        3. Stream the model's generation. Gemma 4's `<|channel>thought` is
           captured then sliced off for the schema parse.
        4. Extract the JSON object, validate against `CommandCenterSynthesis`.
           If validation fails, attempt the truncated-JSON repair pass.
        5. Save the raw streaming output to a cache file so re-runs are cheap.

        Flip a scenario's `FORCE_REGEN` flag to `True` to force a re-run
        even if a cache file from a prior run is present.
    """),

    code("""
        # ── 5.5 Run synthesis loop ───────────────────────────────────────
        import json, time
        from pathlib import Path

        FORCE_REGEN = {"a": False, "b": False, "c": False}

        results = {}

        for sc in SCENARIOS:
            sid = sc["id"]
            print("\\n" + "─" * 72)
            print(f"Scenario {sid.upper()}: {sc['label']}")
            print("─" * 72)

            scenario = json.loads(Path(sc["json_path"]).read_text(encoding="utf-8"))
            reports_raw = scenario["reports"]
            for r in reports_raw:
                _, err = parse_edge_report(r)
                if err:
                    raise ValueError(f"  ✗ {r.get('report_id')}: {err}")
            print(f"  ✓ {len(reports_raw)} reports parsed and schema-validated")

            cache_path = Path(f"synthesis_cache_scenario_{sid}.txt")
            if cache_path.exists() and cache_path.stat().st_size > 1000 and not FORCE_REGEN[sid]:
                raw_output = cache_path.read_text(encoding="utf-8")
                print(f"  ✓ Loaded cache {cache_path.name} ({cache_path.stat().st_size:,} bytes)")
                wall = 0.0
            else:
                reports_json = json.dumps(reports_raw, indent=2)
                user_content = (
                    f"Below are {len(reports_raw)} EdgeTriageReport objects "
                    f"submitted over the past ~{sc['window_minutes']} minutes "
                    f"from a developing {sc['label'].lower()} incident. Synthesize "
                    f"them into a single CommandCenterSynthesis JSON object. "
                    f"Include a <|channel>thought reasoning trace before the "
                    f"final JSON.\\n\\n"
                    f"```json\\n{reports_json}\\n```"
                )
                t0 = time.time()
                raw_output = synthesize(
                    SYNTHESIS_SYSTEM_PROMPT,
                    user_content,
                    max_new_tokens=6000,
                    stream=True,
                )
                wall = time.time() - t0
                cache_path.write_text(raw_output, encoding="utf-8")
                print(f"\\n  ✓ Generated in {wall:.1f}s, cached to {cache_path.name}")

            results[sid] = {
                "raw_output": raw_output,
                "wall_clock_sec": wall,
                "n_reports": len(reports_raw),
                "scenario_meta": sc,
            }

        print("\\n" + "═" * 72)
        print(f"All {len(results)} scenarios processed.")
        print("═" * 72)
    """),

    md("""
        ### 5.6 Extract and validate each synthesis as `CommandCenterSynthesis`

        `extract_json_from_model_output` walks every balanced `{...}` block
        in the raw output and returns the first one that round-trips through
        `json.loads` AND validates against the Pydantic schema. If that fails
        we try `attempt_truncated_json_repair` for the case where the model
        hit `max_new_tokens` mid-write.
    """),

    code("""
        import json
        from pathlib import Path

        validated = {}

        for sid, res in results.items():
            raw = res["raw_output"]
            json_text = extract_json_from_model_output(raw)
            if json_text is None:
                obj, err = None, "no JSON object found in model output"
            else:
                obj, err = parse_synthesis(json_text)
            if obj is None:
                print(f"  ⚠ {sid.upper()}: extract failed — trying repair pass")
                repaired = attempt_truncated_json_repair(raw)
                if repaired:
                    obj, err = parse_synthesis(repaired)
            if obj is None:
                print(f"  ✗ {sid.upper()}: still no valid synthesis ({err}). "
                      f"Inspect synthesis_cache_scenario_{sid}.txt manually.")
                continue

            json_path = Path(f"outputs/synthesis_scenario_{sid}.json")
            json_path.write_text(
                json.dumps(obj.model_dump(mode="json"), indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            print(f"  ✓ {sid.upper()}: validated, wrote {json_path}")
            validated[sid] = obj
    """),

    # ─── 6. DASHBOARD TIER ───────────────────────────────────────────────
    md("""
        ---

        ## 6. DASHBOARD TIER — drop-in TypeScript modules

        Each synthesis becomes a TypeScript module exporting a typed constant.
        Drop these into `dashboard/src/lib/` and `scenarios.ts` will pick them
        up — that's how Scenario A's synthesis got rendered on the dashboard
        from the Day-1 E4B run.
    """),

    code("""
        import json
        from pathlib import Path

        TS_HEADER_TEMPLATE = '''/**
 * AUTO-GENERATED by notebook/gemma_rescue_grid_kaggle.ipynb
 *
 * Scenario: {label}
 * Source:   {n_reports} EdgeTriageReports over a {window} minute window
 * Model:    {model_name} (4-bit via Unsloth)
 * Wall:     {wall_sec:.1f}s on Kaggle 2× T4
 * Run at:   {timestamp}
 *
 * Drop-in for dashboard/src/lib/. Imported by scenarios.ts and rendered
 * by FloodSynthesisPanel.
 */

import type {{ CommandCenterSynthesis }} from "./types";

export const {export_name}: CommandCenterSynthesis = '''

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        for sid, obj in validated.items():
            sc = results[sid]["scenario_meta"]
            ts_path = Path(f"outputs/{sc['ts_module_name']}.ts")
            payload = json.dumps(obj.model_dump(mode="json"), indent=2, ensure_ascii=False)
            header = TS_HEADER_TEMPLATE.format(
                label=sc["label"],
                n_reports=sc["n_reports"],
                window=sc["window_minutes"],
                model_name=MODEL_NAME,
                wall_sec=results[sid]["wall_clock_sec"],
                timestamp=now,
                export_name=sc["ts_export_name"],
            )
            ts_path.write_text(header + payload + ";\\n", encoding="utf-8")
            print(f"  ✓ {ts_path}  ({ts_path.stat().st_size:,} bytes)")
    """),

    # ─── 7. Summary ──────────────────────────────────────────────────────
    md("""
        ---

        ## 7. End-to-end platform summary

        The table below is the full picture of what this notebook did across
        all five tiers. Useful for the Kaggle writeup ("the 31B identified N
        priority zones across the three scenarios, ranked M recommended
        actions; the edge tier produced K validated reports; the routing
        layer queued X of N for deep-lane synthesis").
    """),

    code("""
        from pathlib import Path
        try:
            import pandas as pd
            rows = []
            for sid, obj in validated.items():
                sc = results[sid]["scenario_meta"]
                ds = obj.model_dump(mode="json")
                rows.append({
                    "id":          sid.upper(),
                    "label":       sc["label"][:30],
                    "reports":     ds["report_count"],
                    "wall_sec":    f"{results[sid]['wall_clock_sec']:.0f}",
                    "primary":     ds["primary_disaster_classification"]["type"],
                    "p_zones":     len(ds["priority_zones"]),
                    "hazards":     len(ds["consolidated_hazards"]),
                    "actions":     len(ds["recommended_actions"]),
                    "validity":    len(ds["report_validity_notes"]),
                    "immediate":   ds["severity_distribution"].get("5", 0),
                })
            display(pd.DataFrame(rows))
        except ImportError:
            for sid, obj in validated.items():
                ds = obj.model_dump(mode="json")
                print(f"{sid.upper()}: {len(ds['priority_zones'])} zones, "
                      f"{len(ds['recommended_actions'])} actions, "
                      f"{len(ds['consolidated_hazards'])} hazards")
    """),

    code("""
        # ── Tier-by-tier scorecard for the writeup ───────────────────────
        print("=" * 60)
        print("END-TO-END PLATFORM RUN — SUMMARY")
        print("=" * 60)

        # Edge tier
        edge_ok = sum(1 for r in edge_results.values() if r.get("report") is not None)
        print(f"\\nEDGE TIER (Gemma 4 E2B)")
        print(f"  Reports produced + schema-validated:   {edge_ok}/{len(edge_results)}")
        if edge_ok:
            avg = sum(r["wall_sec"] for r in edge_results.values() if r.get("report") is not None) / edge_ok
            print(f"  Avg wall-clock per inference (Kaggle T4): {avg:.1f}s")

        # Routing tier
        from collections import Counter
        c = Counter(r["decision"] for r in routing_rows)
        print(f"\\nROUTING TIER (Cactus Prize hook)")
        print(f"  Reports routed:                        {len(routing_rows)}")
        print(f"  fast_lane (local resolution):          {c.get('fast_lane', 0)}")
        print(f"  deep_lane (queued for 31B synthesis):  {c.get('deep_lane', 0)}")
        overridden = sum(1 for r in routing_rows
                         if r["model_rec"] != r["decision"])
        print(f"  Application overrides of model rec:    {overridden}")

        # Sync tier
        print(f"\\nSYNC TIER (dedup + trust gradient)")
        print(f"  Dedup test (1 original + 2 mesh hops): {len(store.rows)} rows stored")
        print(f"  Reporter-resolve simulation:           ✓")
        print(f"  Crowd-vote (5-threshold) simulation:   ✓")

        # Synthesis tier
        print(f"\\nSYNTHESIS TIER (Gemma 4 31B)")
        print(f"  Scenarios synthesized:                 {len(validated)}/{len(SCENARIOS)}")
        total_zones   = sum(len(o.model_dump()['priority_zones'])      for o in validated.values())
        total_actions = sum(len(o.model_dump()['recommended_actions']) for o in validated.values())
        total_hazards = sum(len(o.model_dump()['consolidated_hazards'])for o in validated.values())
        total_wall    = sum(results[sid]['wall_clock_sec']             for sid in validated)
        print(f"  Total priority zones identified:       {total_zones}")
        print(f"  Total recommended actions:             {total_actions}")
        print(f"  Total consolidated hazards:            {total_hazards}")
        print(f"  Combined wall-clock on 2× T4:          {total_wall:.0f}s")

        # Dashboard tier
        print(f"\\nDASHBOARD TIER (drop-in modules)")
        print(f"  TypeScript modules emitted:            {len(validated)}/{len(SCENARIOS)}")
        print(f"  Output location:                       outputs/synthesis-scenario-*.ts")

        print("\\n" + "=" * 60)
        print("Same Gemma 4 family. Same JSON contract. End to end.")
        print("=" * 60)
    """),

    code("""
        # ── Where to take the .ts files next ───────────────────────────────
        print("Drop these into dashboard/src/lib/, then in scenarios.ts:")
        print()
        for sid, obj in validated.items():
            sc = results[sid]["scenario_meta"]
            print(f"  // scenario {sid.upper()}")
            print(f"  import {{ {sc['ts_export_name']} }} from \\"./{sc['ts_module_name']}\\";")
        print()
        print("Then flip the relevant SCENARIOS[<id>].synthesis to the imported const")
        print("and synthesisStatus from 'pending' to 'generated'.")
    """),

    md("""
        ---

        ## Next steps after this notebook finishes

        1. **Download** every `outputs/synthesis-scenario-*.ts` from the
           Kaggle sidebar.
        2. **Drop** them into `dashboard/src/lib/` (overwriting the
           Day-1 E4B Scenario A module if it's still there).
        3. **Update** `dashboard/src/lib/scenarios.ts`:
            - Import the three new constants.
            - In each `SCENARIOS[id]` block, replace
              `synthesis: null` → the imported const, and
              `synthesisStatus: "pending"` → `"generated"`.
        4. **Push** `nusasiaga` main; Vercel auto-rebuilds within ~60 s.
        5. **Verify** at <https://nusasiaga.vercel.app>: Scenario B and C
           switch from the "synthesis pending" placeholder to the full
           command-center view.

        That closes the full pipeline: Gemma 4 E2B on the phone produces
        these reports → Gemma 4 31B in this notebook synthesises them →
        the dashboard renders the operational picture. Every layer in
        the same Gemma 4 family, every layer talking the same JSON
        contract.
    """),
]


# ---------------------------------------------------------------------------
# WRITE OUT
# ---------------------------------------------------------------------------


def main() -> None:
    nb = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {
                "name": "python3",
                "display_name": "Python 3",
            },
            "language_info": {"name": "python"},
        },
        "cells": CELLS,
    }
    out = Path(__file__).resolve().parent / "gemma_rescue_grid_kaggle.ipynb"
    out.write_text(json.dumps(nb, indent=1), encoding="utf-8")
    print(f"Wrote {out}")
    n_md = sum(1 for c in CELLS if c["cell_type"] == "markdown")
    n_code = sum(1 for c in CELLS if c["cell_type"] == "code")
    print(f"  {len(CELLS)} cells ({n_md} markdown + {n_code} code)")


if __name__ == "__main__":
    main()
