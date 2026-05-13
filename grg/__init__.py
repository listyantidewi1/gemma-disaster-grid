"""Gemma Rescue Grid - shared utilities used by both the Colab/Kaggle notebook
and the local smoke test.

This package was named `grg` (not `notebook` or `utils`) deliberately because
Jupyter's own `notebook` package would shadow it on Colab.
"""

from .schemas import (
    EdgeTriageReport,
    CommandCenterSynthesis,
    Location,
    PeopleVisible,
    PriorityZone,
    RecommendedAction,
    ConsolidatedHazard,
    parse_edge_report,
    parse_synthesis,
    extract_json_from_model_output,
)
from .routing import (
    RoutingContext,
    RoutingDecision,
    decide_routing,
    render_routing_badge,
)

__all__ = [
    "EdgeTriageReport",
    "CommandCenterSynthesis",
    "Location",
    "PeopleVisible",
    "PriorityZone",
    "RecommendedAction",
    "ConsolidatedHazard",
    "parse_edge_report",
    "parse_synthesis",
    "extract_json_from_model_output",
    "RoutingContext",
    "RoutingDecision",
    "decide_routing",
    "render_routing_badge",
]
