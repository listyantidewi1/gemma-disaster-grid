"""Quick smoke test: validate the scenario JSONs against the schemas,
exercise the routing function on every parsed report.

Run from the project root:
    python grg/smoke_test.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Add project root to path so this script works when run directly.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from grg import (  # noqa: E402
    EdgeTriageReport,
    RoutingContext,
    decide_routing,
    parse_edge_report,
    render_routing_badge,
)


SCENARIO_DIR = PROJECT_ROOT / "data" / "synthesis_scenarios"


def smoke_test_scenario(path: Path) -> tuple[int, int]:
    """Return (parsed_count, total_count) for one scenario file."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    reports_raw = raw.get("reports", [])
    parsed: list[EdgeTriageReport] = []
    for r in reports_raw:
        report, err = parse_edge_report(r)
        if err:
            print(f"  FAIL {r.get('report_id', '?'):<50}  {err.splitlines()[0][:120]}")
        else:
            assert report is not None
            parsed.append(report)
    return len(parsed), len(reports_raw)


def main() -> int:
    print("=" * 72)
    print("Gemma Rescue Grid - schema + routing smoke test")
    print("=" * 72)

    scenarios = sorted(SCENARIO_DIR.glob("scenario_*.json"))
    if not scenarios:
        print("ERROR: no scenarios found in", SCENARIO_DIR)
        return 1

    total_ok = 0
    total_all = 0
    for s in scenarios:
        print(f"\n[{s.name}]")
        ok, n = smoke_test_scenario(s)
        print(f"  parsed: {ok}/{n}")
        total_ok += ok
        total_all += n

    print(f"\nOVERALL: {total_ok}/{total_all} reports parsed.")

    if total_ok != total_all:
        print("FAIL - schema and scenario JSON are out of sync.")
        return 1

    # Exercise routing on every parsed report from scenario A.
    print("\n" + "=" * 72)
    print("Routing demo - scenario A (Jakarta flood)")
    print("=" * 72)
    scenario_a = json.loads(
        (SCENARIO_DIR / "scenario_a_jakarta_flood.json").read_text(encoding="utf-8")
    )

    # Simulate cross-report context by counting same-area neighbors as we iterate.
    area_counts: dict[str, int] = {}
    for raw in scenario_a["reports"]:
        report, _ = parse_edge_report(raw)
        assert report is not None
        label = report.location.label or "unknown"
        ctx = RoutingContext(
            connectivity_online=False,
            recent_reports_same_area_60min=area_counts.get(label, 0),
            queue_depth=0,
        )
        decision = decide_routing(report, ctx)
        marker = "OVERRIDDEN" if decision.overridden else "          "
        print(f"  [sev {report.severity}] {marker} {render_routing_badge(decision)[:100]}")
        area_counts[label] = area_counts.get(label, 0) + 1

    print("\nOK - schemas and routing both healthy. Day 2 can build on this.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
