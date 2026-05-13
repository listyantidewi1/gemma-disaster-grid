"""Build the Gemma Rescue Grid Colab/Kaggle notebook from structured cell definitions.

Run from project root:
    python notebook/build_notebook.py

Produces:
    notebook/gemma_rescue_grid.ipynb

Keeping cells as Python strings makes them easy to edit. Run this script
whenever the cell definitions below change.
"""

from __future__ import annotations

import json
from pathlib import Path
from textwrap import dedent


def md(source: str) -> dict:
    """Markdown cell."""
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": _split_lines(source),
    }


def code(source: str) -> dict:
    """Code cell."""
    return {
        "cell_type": "code",
        "metadata": {},
        "execution_count": None,
        "outputs": [],
        "source": _split_lines(source),
    }


def _split_lines(src: str) -> list[str]:
    """nbformat expects each line as its own string with trailing \\n,
    except the final line which may not end with a newline."""
    src = dedent(src).strip("\n")
    lines = src.split("\n")
    return [ln + "\n" for ln in lines[:-1]] + [lines[-1]]


# ---------------------------------------------------------------------------
# CELLS
# ---------------------------------------------------------------------------

CELLS = [

    # ─── 0. Cover ─────────────────────────────────────────────────────────
    md("""
        # Gemma Rescue Grid — Cloud Synthesis Tier
        ### Offline Disaster Intelligence Agent built on Gemma 4

        **Kaggle Gemma 4 Good Hackathon · Track: Impact / Global Resilience**

        - **Repo:** https://github.com/listyantidewi1/gemma-disaster-grid
        - **Video:** (link added at submission)
        - **Live demo:** this notebook
        - **APK:** attached to the Kaggle Writeup

        This notebook is the **command-center** tier of a two-tier disaster
        response system. The other tier — Gemma 4 E2B running on a responder's
        Android phone via Google AI Edge LiteRT — emits structured field
        reports that flow here for cross-report synthesis using a larger
        Gemma 4 variant (31B on Kaggle, 26B MoE or E4B on Colab for dev).

        Same Gemma 4 family, same JSON contract, top to bottom.
    """),

    # ─── 1. Environment setup ────────────────────────────────────────────
    md("""
        ## 1. Environment setup

        Two environments are supported with **zero code change** besides the
        `MODEL_NAME` variable below:

        | Environment | GPU | Suggested model |
        |---|---|---|
        | Colab Free | 1× T4 (15GB) | `unsloth/gemma-4-E4B-it` (fast dev) or `unsloth/gemma-4-26B-A4B-it` (closer to final quality) |
        | Colab Pro (A100 lucky-draw) | A100 (40GB) | `unsloth/gemma-4-31B-it` |
        | Kaggle (final submission) | 2× T4 (30GB) | `unsloth/gemma-4-31B-it` |

        We install dependencies first so any missing-module errors fail fast
        before the heavier model-loading steps. Then we clone the project
        repo so the notebook can use our schemas, prompts, and demo
        scenarios directly from version control.
    """),

    code("""
        # ── Install dependencies FIRST ─────────────────────────────────────
        # Pinned versions follow the Kaggle starter notebook (gemma4-31b-unsloth)
        # so Colab and Kaggle environments produce comparable outputs.
        # Use %pip (cell magic), not !pip, so installs land in the active kernel.
        %pip install -qqq \\
            unsloth "unsloth_zoo>=2026.4.6" \\
            "transformers==5.5.0" \\
            "torch>=2.8.0" "triton>=3.4.0" \\
            torchvision bitsandbytes torchcodec timm \\
            pydantic
        print("OK — dependencies installed. If Colab warns about restarting the runtime,")
        print("you can ignore it for now; later cells will still find the right versions.")
    """),

    code("""
        # ── Clone the project repo ─────────────────────────────────────────
        # Idempotent: pulls latest if already present. Drops us into the
        # repo root so relative paths in later cells (prompts/, data/, etc.)
        # resolve correctly.
        import os, subprocess
        REPO_URL = "https://github.com/listyantidewi1/gemma-disaster-grid.git"
        REPO_DIR = "gemma-disaster-grid"
        if not os.path.isdir(REPO_DIR):
            subprocess.run(["git", "clone", "--depth", "1", REPO_URL], check=True)
        else:
            subprocess.run(["git", "-C", REPO_DIR, "pull", "--ff-only"], check=False)
        os.chdir(REPO_DIR)
        print("CWD:", os.getcwd())
        print("Files at root:", sorted(os.listdir(".")))
    """),

    # ─── 2. Model selection ──────────────────────────────────────────────
    md("""
        ## 2. Choose a Gemma 4 variant

        The same code below works for any Gemma 4 instruct variant. We
        recommend:

        - **Colab Free dev:** `unsloth/gemma-4-E4B-it` — loads in ~2 min,
          synthesis call in ~10 sec, plenty of T4 headroom.
        - **Better Colab dev (or Kaggle single GPU):** `unsloth/gemma-4-26B-A4B-it` —
          MoE with 4B active per token, similar quality to 31B for our
          reasoning task.
        - **Kaggle final submission:** `unsloth/gemma-4-31B-it` — dense 31B,
          uses both Kaggle T4s via `device_map="balanced"`.

        Just edit `MODEL_NAME` below and re-run from this cell.
    """),

    code("""
        # ── Model configuration ────────────────────────────────────────────
        # MODEL_NAME = "unsloth/gemma-4-E2B-it"        # smallest, on-device tier (1.5 GB Q4)
        MODEL_NAME   = "unsloth/gemma-4-E4B-it"        # ← default for Colab Free dev
        # MODEL_NAME = "unsloth/gemma-4-26B-A4B-it"    # MoE, fits T4 with headroom
        # MODEL_NAME = "unsloth/gemma-4-31B-it"        # ← use this for Kaggle final submission

        # If running on Kaggle with 2 GPUs, set this to "balanced". On Colab
        # single GPU, leave as None.
        DEVICE_MAP = None  # set to "balanced" when running 31B on Kaggle 2x T4

        # max_seq_length needs to hold: system prompt (~2k tokens) + reports
        # array (~5-7k tokens for 15 reports) + thinking trace + output JSON
        # (~3k tokens). 16384 is comfortable for the demo scenarios.
        MAX_SEQ_LENGTH = 16384

        print(f"Model:    {MODEL_NAME}")
        print(f"Device:   {DEVICE_MAP or 'auto'}")
        print(f"Seq len:  {MAX_SEQ_LENGTH}")
    """),

    # ─── 3. Load model ───────────────────────────────────────────────────
    md("""
        ## 3. Load Gemma 4 via Unsloth `FastModel`

        Unsloth handles 4-bit quantization, KV cache optimization, and the
        Gemma 4 chat template patching.
    """),

    code("""
        from unsloth import FastModel
        import torch

        kwargs = dict(
            model_name=MODEL_NAME,
            dtype=None,                 # auto-detect bfloat16/float16
            max_seq_length=MAX_SEQ_LENGTH,
            load_in_4bit=True,
            full_finetuning=False,
        )
        if DEVICE_MAP is not None:
            kwargs["device_map"] = DEVICE_MAP

        model, tokenizer = FastModel.from_pretrained(**kwargs)
        print(f"\\nLoaded {MODEL_NAME}")
        print(f"GPU memory used: {torch.cuda.memory_reserved() / 1024**3:.2f} GB")
    """),

    md("""
        ### Helper: a single inference function we'll reuse below

        Gemma 4 does not have a native system role token, so the convention
        in the official Unsloth/Gemma 4 examples is to put the system text
        at the start of the first user turn. We do the same here.
    """),

    code("""
        from transformers import TextStreamer

        def synthesize(system_prompt: str,
                       user_content: str,
                       max_new_tokens: int = 4096,
                       stream: bool = True) -> str:
            \"\"\"Run one Gemma 4 generation with prepended system context.

            Returns ONLY the model's generated tokens decoded as a string
            (which will include any <|channel>thought reasoning trace and
            the final JSON object). The input prompt is sliced off — without
            this, batch_decode would also include the system prompt and our
            JSON extractor would grab the schema TEMPLATE from the prompt
            instead of the model's actual JSON output.
            \"\"\"
            full_user = f"{system_prompt}\\n\\n---\\n\\n{user_content}"
            messages = [{
                "role": "user",
                "content": [{"type": "text", "text": full_user}],
            }]
            inputs = tokenizer.apply_chat_template(
                messages,
                add_generation_prompt=True,
                return_tensors="pt",
                tokenize=True,
                return_dict=True,
            ).to("cuda")
            input_length = inputs["input_ids"].shape[1]

            gen_kwargs = dict(
                **inputs,
                max_new_tokens=max_new_tokens,
                use_cache=True,
                temperature=1.0,
                top_p=0.95,
                top_k=64,
            )
            if stream:
                gen_kwargs["streamer"] = TextStreamer(tokenizer, skip_prompt=True)
            outputs = model.generate(**gen_kwargs)
            # Slice off the input prompt — return only generated tokens.
            generated = outputs[0, input_length:]
            return tokenizer.decode(generated, skip_special_tokens=False)

        print("synthesize() ready.")
    """),

    # ─── 4. Load prompt + utilities ──────────────────────────────────────
    md("""
        ## 4. Load the synthesis system prompt and our utilities

        The system prompt lives at `prompts/cloud_synthesis_system.md` and
        is extracted from its surrounding documentation. The schema models
        and the routing function live at `notebook/utils/`.
    """),

    code("""
        import sys, re, pathlib
        sys.path.insert(0, str(pathlib.Path.cwd()))

        from grg import (
            EdgeTriageReport, CommandCenterSynthesis,
            parse_edge_report, parse_synthesis,
            extract_json_from_model_output,
            RoutingContext, decide_routing, render_routing_badge,
        )

        def load_system_prompt(md_path: str) -> str:
            \"\"\"Extract the first triple-backtick code block from a prompt .md
            file. The .md files store the canonical prompt inside a code
            fence so they remain readable as documentation while still being
            machine-extractable.\"\"\"
            text = pathlib.Path(md_path).read_text(encoding="utf-8")
            match = re.search(r"```\\s*\\n(.*?)\\n```", text, re.DOTALL)
            if not match:
                raise ValueError(f"No code fence found in {md_path}")
            return match.group(1).strip()

        SYNTHESIS_SYSTEM_PROMPT = load_system_prompt("prompts/cloud_synthesis_system.md")
        print(f"Synthesis system prompt: {len(SYNTHESIS_SYSTEM_PROMPT):,} chars "
              f"(~{len(SYNTHESIS_SYSTEM_PROMPT)//4} tokens)")
        print()
        print("First 400 chars:")
        print("─" * 72)
        print(SYNTHESIS_SYSTEM_PROMPT[:400])
        print("...")
    """),

    # ─── 5. Load Scenario A ──────────────────────────────────────────────
    md("""
        ## 5. Load Scenario A — Rapid-onset Jakarta flood (12 reports)

        Scenario A is a curated set of 12 hand-crafted `EdgeTriageReport`
        objects simulating a 90-minute window of flooding in central Jakarta.
        It exercises mid-difficulty synthesis: multiple priority zones,
        recurring electrical hazards, one elderly evacuation, one possible
        trapped rider, and several reports from the same geographic area
        within minutes of each other (testing duplicate vs. follow-up
        disambiguation).

        All 12 reports validate cleanly against `EdgeTriageReport` — confirmed
        by `notebook/utils/smoke_test.py`.
    """),

    code("""
        import json
        from pathlib import Path

        SCENARIO_PATH = Path("data/synthesis_scenarios/scenario_a_jakarta_flood.json")
        scenario = json.loads(SCENARIO_PATH.read_text(encoding="utf-8"))
        reports_raw = scenario["reports"]

        # Parse and validate every report through the Pydantic schema.
        reports = []
        for r in reports_raw:
            obj, err = parse_edge_report(r)
            if err:
                raise ValueError(f"Report {r.get('report_id')} failed validation: {err}")
            reports.append(obj)

        print(f"Scenario: {scenario['scenario_label']}")
        print(f"Context:  {scenario['context_note'][:120]}...")
        print(f"Reports:  {len(reports)} (all schema-validated)")
    """),

    code("""
        # Compact view of all 12 reports.
        try:
            import pandas as pd
            rows = []
            for r in reports:
                rows.append({
                    "id":   r.report_id[-12:],
                    "time": r.timestamp_iso[11:16],
                    "loc":  (r.location.label or "?")[:34],
                    "sev":  r.severity,
                    "conf": f"{r.disaster_type_confidence:.2f}",
                    "evac": r.evacuation_priority,
                    "route_rec": r.routing_recommendation,
                })
            df = pd.DataFrame(rows)
            display(df)
        except ImportError:
            for r in reports:
                print(f"  [sev {r.severity}] {r.timestamp_iso[11:16]}  "
                      f"{(r.location.label or '?')[:40]}")
    """),

    # ─── 6. Run synthesis ────────────────────────────────────────────────
    md("""
        ## 6. Run the synthesis call

        We construct the user message: a brief framing line followed by the
        full reports array as a fenced JSON code block. The model thinks (with
        an optional `<|channel>thought` reasoning trace) and then emits a
        single JSON object conforming to the `CommandCenterSynthesis` schema.

        Expected latency:
        - **E4B on Colab T4:** ~10-25 sec
        - **26B MoE on Colab T4:** ~30-60 sec
        - **31B dense on Kaggle 2× T4:** ~30-90 sec
    """),

    code("""
        import json, time

        reports_json = json.dumps(scenario["reports"], indent=2)
        user_content = (
            f"Below are {len(reports)} EdgeTriageReport objects submitted "
            f"over the past ~90 minutes from a developing flood incident in "
            f"central Jakarta. Synthesize them into a single "
            f"CommandCenterSynthesis JSON object. Include a "
            f"<|channel>thought reasoning trace before the final JSON.\\n\\n"
            f"```json\\n{reports_json}\\n```"
        )

        print(f"User message: {len(user_content):,} chars "
              f"(~{len(user_content)//4} tokens) — generating...\\n")
        print("─" * 72)

        t0 = time.time()
        raw_output = synthesize(
            SYNTHESIS_SYSTEM_PROMPT,
            user_content,
            max_new_tokens=4096,
            stream=True,
        )
        elapsed = time.time() - t0
        print(f"\\n\\n─── Generated in {elapsed:.1f} sec ───")
    """),

    # ─── 7. Parse + validate ─────────────────────────────────────────────
    md("""
        ## 7. Parse the synthesis output and validate against the schema

        Strip any thinking trace or markdown fences and validate the recovered
        JSON object against the `CommandCenterSynthesis` Pydantic schema.

        Schema validation is enforced — the notebook surfaces errors instead
        of hiding them. If validation fails, we retry once at lower
        temperature (left as an exercise for the next iteration; for now we
        just surface the error).
    """),

    code("""
        json_str = extract_json_from_model_output(raw_output)

        if json_str is None:
            print("FAIL: no balanced JSON object found in model output")
            print("\\nLast 500 chars of raw output:")
            print(raw_output[-500:])
            synthesis = None
        else:
            synthesis, err = parse_synthesis(json_str)
            if err:
                print(f"FAIL: schema validation error\\n{err[:800]}")
                print("\\nFirst 600 chars of extracted JSON:")
                print(json_str[:600])
            else:
                print("OK — CommandCenterSynthesis validated against schema.")
                print(f"  Reports:           {synthesis.report_count}")
                print(f"  Primary type:      {synthesis.primary_disaster_classification.type} "
                      f"(conf {synthesis.primary_disaster_classification.confidence:.2f})")
                print(f"  Priority zones:    {len(synthesis.priority_zones)}")
                print(f"  Hazards:           {len(synthesis.consolidated_hazards)}")
                print(f"  Recommended acts:  {len(synthesis.recommended_actions)}")
                print(f"  Validity flags:    {len(synthesis.report_validity_notes)}")
    """),

    md("""
        ### Render as an operational picture
    """),

    code("""
        def render_synthesis(s: CommandCenterSynthesis) -> None:
            line = "=" * 72
            print(line)
            print(f"INCIDENT  {s.incident_id[:20]}")
            print(f"WINDOW    {s.time_window.start_iso} -> {s.time_window.end_iso}")
            print(f"REPORTS   {s.report_count}")
            cls = s.primary_disaster_classification
            sec = ", ".join(cls.secondary_types) if cls.secondary_types else "—"
            print(f"TYPE      {cls.type} (conf {cls.confidence:.2f})   secondary: {sec}")
            print(f"SCOPE     {s.geographic_scope}")
            print()

            print("SEVERITY DISTRIBUTION")
            sd = s.severity_distribution
            for lvl, n in [(5, sd.count_5), (4, sd.count_4), (3, sd.count_3),
                           (2, sd.count_2), (1, sd.count_1)]:
                bar = "#" * n if n else ""
                print(f"  sev {lvl}: {bar:<15} ({n})")
            print()

            ea = s.estimated_affected
            print(f"AFFECTED  ~{ea.people_count_min}-{ea.people_count_max} people")
            print(f"          method: {ea.method}")
            print()

            print("PRIORITY ZONES")
            for z in s.priority_zones:
                tag = z.evacuation_priority.upper()
                print(f"  [{tag:9s}] sev {z.max_severity}  {z.label}")
                if z.dominant_hazards:
                    print(f"               hazards: {', '.join(z.dominant_hazards[:4])}")
                print(f"               {z.rationale[:96]}")
                print(f"               report_ids: {len(z.report_ids)}")
                print()

            print("CONSOLIDATED HAZARDS")
            for h in s.consolidated_hazards[:6]:
                print(f"  ({h.report_count}x) {h.hazard}")
                print(f"        {h.severity_implication[:80]}")
            print()

            print(f"VULNERABLE GROUPS: {s.vulnerable_groups_summary}")
            print()

            print("RECOMMENDED ACTIONS (in priority order)")
            for a in sorted(s.recommended_actions, key=lambda x: x.priority):
                print(f"  [P{a.priority}] ({a.responsible_party}) {a.action[:75]}")
                print(f"         rationale: {a.rationale[:80]}")
            print()

            if s.report_validity_notes:
                print("REPORT VALIDITY")
                for v in s.report_validity_notes:
                    print(f"  {v.flag:<28s} {v.report_id[-12:]}  {v.rationale[:70]}")
                print()

            print(f"DATA CONFIDENCE: {s.data_confidence_notes}")
            print(line)

        if synthesis:
            render_synthesis(synthesis)
        else:
            print("Synthesis is None — re-run the generation cell.")
    """),

    # ─── 8. Status ────────────────────────────────────────────────────────
    md("""
        ## Status (this notebook — Day 2 milestone)

        - ✅ Loads any Gemma 4 variant via Unsloth (E2B / E4B / 26B MoE / 31B)
        - ✅ Runs the canonical synthesis prompt over Scenario A's 12 reports
        - ✅ Schema-validates the output against `CommandCenterSynthesis`
        - ✅ Renders a coherent operational picture

        **Next iterations (Days 2-3):**

        - Add Scenario B (Cianjur quake) and Scenario C (compound flood+fire),
          and run synthesis on each — demonstrates harder cases.
        - Add the **edge tier** simulation: load `unsloth/gemma-4-E2B-it` and
          run the *same* image-to-triage prompt that the Android app uses.
        - Add the **intelligent routing** section: for each report, show the
          fast-lane / deep-lane decision with rationale.
        - Add a **before/after fine-tune** comparison on Day 5 if Unsloth
          LoRA training completes (stacks the Unsloth $10K Special Tech prize).

        The notebook below is intentionally a static skeleton at this point;
        the cells will be filled in as the code matures.
    """),

]


# ---------------------------------------------------------------------------
# WRITE
# ---------------------------------------------------------------------------

def main() -> None:
    notebook = {
        "cells": CELLS,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3",
            },
            "language_info": {
                "name": "python",
                "version": "3.11",
            },
            "colab": {
                "provenance": [],
                "gpuType": "T4",
            },
            "accelerator": "GPU",
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }

    out_path = Path(__file__).parent / "gemma_rescue_grid.ipynb"
    out_path.write_text(json.dumps(notebook, indent=1), encoding="utf-8")
    print(f"Wrote {out_path} ({len(CELLS)} cells)")


if __name__ == "__main__":
    main()
