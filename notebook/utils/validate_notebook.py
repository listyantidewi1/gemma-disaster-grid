"""Quick local validation of the generated notebook and prompt extraction.

Doesn't require Gemma 4 to run — just verifies the file structure,
JSON validity, and that our regex-based system-prompt extraction recovers
the actual prompt from the .md files.

Run from project root:
    python notebook/utils/validate_notebook.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def check_notebook() -> bool:
    nb_path = ROOT / "notebook" / "gemma_rescue_grid.ipynb"
    if not nb_path.exists():
        print(f"FAIL: notebook not found at {nb_path}")
        return False
    nb = json.loads(nb_path.read_text(encoding="utf-8"))
    cells = nb["cells"]
    n_md = sum(1 for c in cells if c["cell_type"] == "markdown")
    n_code = sum(1 for c in cells if c["cell_type"] == "code")
    print(
        f"Notebook OK: {len(cells)} cells "
        f"(markdown={n_md}, code={n_code}), "
        f"nbformat {nb['nbformat']}.{nb['nbformat_minor']}"
    )
    return True


def check_prompt_extraction() -> bool:
    """Replicate the load_system_prompt regex from the notebook and confirm
    it extracts non-empty prompts from both .md files."""
    paths = [
        ROOT / "prompts" / "cloud_synthesis_system.md",
        ROOT / "prompts" / "edge_triage_system.md",
    ]
    all_ok = True
    for p in paths:
        text = p.read_text(encoding="utf-8")
        match = re.search(r"```\s*\n(.*?)\n```", text, re.DOTALL)
        if not match:
            print(f"FAIL: no fenced code block in {p.name}")
            all_ok = False
            continue
        prompt = match.group(1).strip()
        print(
            f"{p.name}: extracted {len(prompt):,} chars "
            f"(~{len(prompt) // 4} tokens)"
        )
        print(f"  first 80 chars: {prompt[:80]!r}")
        if len(prompt) < 200:
            print(f"  WARN: prompt seems short for {p.name}")
            all_ok = False
    return all_ok


def check_scenario_loadable() -> bool:
    """Make sure the scenario file the notebook reads is valid JSON."""
    scenario_path = (
        ROOT / "data" / "synthesis_scenarios" / "scenario_a_jakarta_flood.json"
    )
    scenario = json.loads(scenario_path.read_text(encoding="utf-8"))
    n = len(scenario["reports"])
    print(f"Scenario A: {n} reports, label = {scenario['scenario_label'][:60]}...")
    return n == 12


def main() -> int:
    print("=" * 72)
    print("Notebook + prompt validation")
    print("=" * 72)
    ok1 = check_notebook()
    print()
    ok2 = check_prompt_extraction()
    print()
    ok3 = check_scenario_loadable()
    print()
    all_ok = ok1 and ok2 and ok3
    print("ALL OK" if all_ok else "SOME CHECKS FAILED")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
