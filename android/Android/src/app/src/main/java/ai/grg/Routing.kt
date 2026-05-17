package ai.grg

/**
 * The intelligent routing layer — the Cactus Prize hook.
 *
 * Mirrors `grg/routing.py` from the gemma-disaster-grid repo. The decision
 * combines two signals:
 *
 *   1. The model's own routing_recommendation (E2B self-assessment)
 *   2. Application heuristics (cross-report context, connectivity state,
 *      vulnerable persons) that the on-device model cannot see
 *
 * The rationale string returned with every decision is what the UI shows
 * the user and what the demo video highlights on screen.
 */

/**
 * Application state the on-device model cannot see at inference time.
 * Populated by the host app before calling [decideRouting]. The model's
 * own self-assessment lives on the [EdgeTriageReport] itself.
 */
data class RoutingContext(
    /** Whether the device currently has internet. */
    val connectivityOnline: Boolean,
    /** Count of prior reports within ~200m of this report in the past 60
     *  minutes, queried from the local SQLite queue. */
    val recentReportsSameArea60min: Int,
    /** Number of reports currently waiting in the deep-lane sync queue. */
    val queueDepth: Int,
    /** Device battery percentage. Below 15% we suppress deep-lane queueing
     *  to preserve power for the next report cycle (caller's policy). */
    val batteryPercent: Int = 100,
)

data class RoutingDecision(
    val decision: RoutingRecommendation,
    val rationale: String,
    val modelRecommendation: RoutingRecommendation,
    val overridden: Boolean,
    val overrideReason: String = "",
)

/**
 * Combine model self-assessment with application heuristics.
 *
 * Priority order:
 *   1. If model says deep_lane, honor it. Never override deep → fast.
 *   2. If model says fast_lane, escalate to deep_lane when any of:
 *      - severity is 4 or 5 (defensive: model should have caught this)
 *      - trapped persons visible
 *      - 2+ prior reports in the same area within 60 minutes
 *      - disaster_type_confidence below 0.65
 *   3. Otherwise honor fast_lane.
 *
 * Battery and connectivity influence the sync layer's drain policy, not
 * this classification.
 */
fun decideRouting(report: EdgeTriageReport, context: RoutingContext): RoutingDecision {
    val modelRec = report.routingRecommendation

    if (modelRec == RoutingRecommendation.DEEP_LANE) {
        return RoutingDecision(
            decision = RoutingRecommendation.DEEP_LANE,
            rationale = "Model self-assessed: ${report.routingRationale}",
            modelRecommendation = RoutingRecommendation.DEEP_LANE,
            overridden = false,
        )
    }

    // Model recommended fast_lane; check defensive escalations.
    if (report.severity >= 4) {
        return RoutingDecision(
            decision = RoutingRecommendation.DEEP_LANE,
            rationale = "Escalated: severity ${report.severity} warrants synthesis review",
            modelRecommendation = RoutingRecommendation.FAST_LANE,
            overridden = true,
            overrideReason = "severity=${report.severity} despite fast_lane recommendation",
        )
    }

    if (report.peopleVisible.trappedApparent > 0) {
        return RoutingDecision(
            decision = RoutingRecommendation.DEEP_LANE,
            rationale = "Escalated: trapped persons visible",
            modelRecommendation = RoutingRecommendation.FAST_LANE,
            overridden = true,
            overrideReason = "trapped_apparent > 0",
        )
    }

    if (context.recentReportsSameArea60min >= 2) {
        return RoutingDecision(
            decision = RoutingRecommendation.DEEP_LANE,
            rationale = "Escalated: ${context.recentReportsSameArea60min} prior reports within 200m in the last hour - likely correlated",
            modelRecommendation = RoutingRecommendation.FAST_LANE,
            overridden = true,
            overrideReason = "recent_reports_same_area_60min=${context.recentReportsSameArea60min}",
        )
    }

    if (report.disasterTypeConfidence < 0.65) {
        return RoutingDecision(
            decision = RoutingRecommendation.DEEP_LANE,
            rationale = "Escalated: disaster-type confidence ${"%.2f".format(report.disasterTypeConfidence)} is low",
            modelRecommendation = RoutingRecommendation.FAST_LANE,
            overridden = true,
            overrideReason = "disaster_type_confidence=${"%.2f".format(report.disasterTypeConfidence)}",
        )
    }

    return RoutingDecision(
        decision = RoutingRecommendation.FAST_LANE,
        rationale = "Model self-assessed fast_lane: ${report.routingRationale}",
        modelRecommendation = RoutingRecommendation.FAST_LANE,
        overridden = false,
    )
}

/** Single-line UI badge rendering for the result screen and the demo video. */
fun renderRoutingBadge(decision: RoutingDecision): String =
    when (decision.decision) {
        RoutingRecommendation.DEEP_LANE -> "[DEEP LANE -> sync] ${decision.rationale}"
        RoutingRecommendation.FAST_LANE -> "[FAST LANE | local] ${decision.rationale}"
    }
