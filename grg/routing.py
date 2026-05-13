"""
The intelligent routing layer for Gemma Rescue Grid.

This is the Cactus Prize hook: the application decides, for each EdgeTriageReport,
whether the on-device E2B output is sufficient (fast_lane) or whether the report
should be queued for cloud-side synthesis by Gemma 4 31B (deep_lane).

The decision combines two signals:
  1. The model's own routing_recommendation (model self-assessment from E2B)
  2. Application heuristics that incorporate context the model cannot see

We deliberately make this function pure and easy to read. The rationale string
returned with every decision is what the UI shows the user and what the demo
video highlights on screen.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from .schemas import EdgeTriageReport, RoutingRecommendation


@dataclass(frozen=True)
class RoutingContext:
    """Application state the on-device model cannot see.

    Populated by the Android app (or by the notebook for the demo) before
    calling decide_routing(). The model's own self-assessment lives on the
    EdgeTriageReport itself.
    """

    connectivity_online: bool
    """Whether the device currently has internet."""

    recent_reports_same_area_60min: int
    """Count of prior reports within ~200m of this report in the past 60 minutes,
    queried from the local SQLite report queue."""

    queue_depth: int
    """Number of reports currently waiting in the deep-lane sync queue."""

    battery_percent: int = 100
    """Device battery percentage. Below 15% we suppress deep-lane queueing to
    preserve power for the next report cycle."""


@dataclass(frozen=True)
class RoutingDecision:
    decision: RoutingRecommendation
    """The final lane this report goes into."""

    rationale: str
    """Short human-readable explanation, suitable for showing on the phone UI
    and reading aloud in the demo video. Max ~140 chars."""

    model_recommendation: RoutingRecommendation
    """What the on-device model itself recommended."""

    overridden: bool
    """True if the application heuristics overruled the model's recommendation."""

    override_reason: str = ""
    """Empty if overridden is False; otherwise a short explanation of what
    application-level context caused the override."""


def decide_routing(report: EdgeTriageReport, context: RoutingContext) -> RoutingDecision:
    """Combine model self-assessment with application heuristics.

    Decision logic, in priority order:
      1. If the model recommends deep_lane, honor that (model knows when it's
         out of its depth). Never override deep_lane down to fast_lane.
      2. If the model recommends fast_lane, check for application-level
         conditions that should escalate to deep_lane:
         a. Severity 4 or 5 (defensive: model should have caught this)
         b. Multiple prior reports in the same area in the last hour
         c. Trapped persons indicated
         d. Disaster type confidence below 0.65
      3. Otherwise honor the model's fast_lane recommendation.

    The battery floor and connectivity state do not change the decision itself
    (the report is still classified) but they do influence how the queue is
    drained, which is the responsibility of the sync layer, not this function.
    """
    model_rec = report.routing_recommendation

    if model_rec == "deep_lane":
        return RoutingDecision(
            decision="deep_lane",
            rationale=f"Model self-assessed: {report.routing_rationale}",
            model_recommendation="deep_lane",
            overridden=False,
        )

    # Model recommended fast_lane; check defensive escalations.
    if report.severity >= 4:
        return RoutingDecision(
            decision="deep_lane",
            rationale=f"Escalated: severity {report.severity} warrants synthesis review",
            model_recommendation="fast_lane",
            overridden=True,
            override_reason=f"severity={report.severity} despite fast_lane recommendation",
        )

    if report.people_visible.trapped_apparent > 0:
        return RoutingDecision(
            decision="deep_lane",
            rationale="Escalated: trapped persons visible",
            model_recommendation="fast_lane",
            overridden=True,
            override_reason="trapped_apparent > 0",
        )

    if context.recent_reports_same_area_60min >= 2:
        return RoutingDecision(
            decision="deep_lane",
            rationale=(
                f"Escalated: {context.recent_reports_same_area_60min} prior reports "
                f"within 200m in the last hour - likely correlated"
            ),
            model_recommendation="fast_lane",
            overridden=True,
            override_reason=(
                f"recent_reports_same_area_60min="
                f"{context.recent_reports_same_area_60min}"
            ),
        )

    if report.disaster_type_confidence < 0.65:
        return RoutingDecision(
            decision="deep_lane",
            rationale=(
                f"Escalated: disaster-type confidence "
                f"{report.disaster_type_confidence:.2f} is low"
            ),
            model_recommendation="fast_lane",
            overridden=True,
            override_reason=(
                f"disaster_type_confidence={report.disaster_type_confidence:.2f}"
            ),
        )

    # Honor the model's fast_lane recommendation.
    return RoutingDecision(
        decision="fast_lane",
        rationale=f"Model self-assessed fast_lane: {report.routing_rationale}",
        model_recommendation="fast_lane",
        overridden=False,
    )


def render_routing_badge(decision: RoutingDecision) -> str:
    """Render a one-line routing badge for notebook output or UI mock.

    Example:
      [DEEP LANE -> sync] Escalated: severity 4 warrants synthesis review
      [FAST LANE | local] Model self-assessed fast_lane: routine localized flooding
    """
    if decision.decision == "deep_lane":
        return f"[DEEP LANE -> sync] {decision.rationale}"
    return f"[FAST LANE | local] {decision.rationale}"
