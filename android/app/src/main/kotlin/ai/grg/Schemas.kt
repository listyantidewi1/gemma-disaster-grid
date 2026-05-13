package ai.grg

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Kotlin mirrors of the Pydantic schemas in `grg/schemas.py` of the
 * gemma-disaster-grid repo. Keep in sync if the Python schemas evolve.
 *
 * All JSON property names use snake_case to match the model output and
 * the wire format consumed by the NusaSiaga dashboard and the Kaggle
 * notebook synthesis tier.
 */

@Serializable
enum class DisasterType {
    @SerialName("flood") FLOOD,
    @SerialName("earthquake") EARTHQUAKE,
    @SerialName("landslide") LANDSLIDE,
    @SerialName("fire") FIRE,
    @SerialName("storm") STORM,
    @SerialName("building_collapse") BUILDING_COLLAPSE,
    @SerialName("volcanic") VOLCANIC,
    @SerialName("tsunami") TSUNAMI,
    @SerialName("other") OTHER,
}

@Serializable
enum class EvacuationPriority {
    @SerialName("immediate") IMMEDIATE,
    @SerialName("urgent") URGENT,
    @SerialName("standby") STANDBY,
    @SerialName("none") NONE,
}

@Serializable
enum class RoutingRecommendation {
    @SerialName("fast_lane") FAST_LANE,
    @SerialName("deep_lane") DEEP_LANE,
}

@Serializable
enum class ValidityFlag {
    @SerialName("low_quality") LOW_QUALITY,
    @SerialName("possible_duplicate") POSSIBLE_DUPLICATE,
    @SerialName("conflicting") CONFLICTING,
    @SerialName("verified_by_corroboration") VERIFIED_BY_CORROBORATION,
}

@Serializable
data class GrgLocation(
    val lat: Double? = null,
    val lon: Double? = null,
    @SerialName("accuracy_m") val accuracyM: Double? = null,
    val label: String? = null,
)

@Serializable
data class PeopleVisible(
    val adults: Int,
    val children: Int,
    @SerialName("elderly_apparent") val elderlyApparent: Int,
    @SerialName("injured_apparent") val injuredApparent: Int,
    @SerialName("trapped_apparent") val trappedApparent: Int,
) {
    val total: Int get() = adults + children + elderlyApparent + injuredApparent + trappedApparent
}

/**
 * One field triage report — what Gemma 4 E2B emits on the responder's phone
 * after analyzing a photo plus optional voice/text annotation.
 *
 * report_id, timestamp_iso, and location are envelope fields the app
 * generates around the model output (the on-device model doesn't see the
 * UUID, system clock, or GPS), so they default here. The synthesis tier
 * receives them filled in by the app before queue upload.
 */
@Serializable
data class EdgeTriageReport(
    @SerialName("report_id") val reportId: String = "",
    @SerialName("timestamp_iso") val timestampIso: String = "",
    val location: GrgLocation = GrgLocation(),
    @SerialName("disaster_type") val disasterType: DisasterType,
    @SerialName("disaster_type_confidence") val disasterTypeConfidence: Double,
    val severity: Int,
    @SerialName("severity_rationale") val severityRationale: String,
    @SerialName("hazards_visible") val hazardsVisible: List<String>,
    @SerialName("people_visible") val peopleVisible: PeopleVisible,
    @SerialName("immediate_action") val immediateAction: String,
    @SerialName("evacuation_priority") val evacuationPriority: EvacuationPriority,
    @SerialName("routing_recommendation") val routingRecommendation: RoutingRecommendation,
    @SerialName("routing_rationale") val routingRationale: String,
) {
    init {
        require(severity in 1..5) { "severity must be 1..5, was $severity" }
        require(disasterTypeConfidence in 0.0..1.0) {
            "disaster_type_confidence must be 0.0..1.0, was $disasterTypeConfidence"
        }
    }
}

// ─── Synthesis-tier types (consumed by the dashboard / Kaggle notebook) ─────

@Serializable
data class TimeWindow(
    @SerialName("start_iso") val startIso: String,
    @SerialName("end_iso") val endIso: String,
)

@Serializable
data class PrimaryDisasterClassification(
    val type: DisasterType,
    val confidence: Double,
    @SerialName("secondary_types") val secondaryTypes: List<DisasterType> = emptyList(),
)

@Serializable
data class SeverityDistribution(
    @SerialName("1") val sev1: Int = 0,
    @SerialName("2") val sev2: Int = 0,
    @SerialName("3") val sev3: Int = 0,
    @SerialName("4") val sev4: Int = 0,
    @SerialName("5") val sev5: Int = 0,
)

@Serializable
data class EstimatedAffected(
    @SerialName("people_count_min") val peopleCountMin: Int,
    @SerialName("people_count_max") val peopleCountMax: Int,
    val method: String,
)

@Serializable
data class PriorityZone(
    val label: String,
    @SerialName("max_severity") val maxSeverity: Int,
    @SerialName("report_ids") val reportIds: List<String>,
    @SerialName("evacuation_priority") val evacuationPriority: String,
    @SerialName("dominant_hazards") val dominantHazards: List<String>,
    val rationale: String,
)

@Serializable
data class ConsolidatedHazard(
    val hazard: String,
    @SerialName("report_count") val reportCount: Int,
    @SerialName("severity_implication") val severityImplication: String,
)

@Serializable
data class RecommendedAction(
    val action: String,
    val priority: Int,
    val rationale: String,
    @SerialName("responsible_party") val responsibleParty: String,
)

@Serializable
data class ReportValidityNote(
    @SerialName("report_id") val reportId: String,
    val flag: ValidityFlag,
    val rationale: String,
)

@Serializable
data class CommandCenterSynthesis(
    @SerialName("incident_id") val incidentId: String,
    @SerialName("synthesis_timestamp_iso") val synthesisTimestampIso: String,
    @SerialName("report_count") val reportCount: Int,
    @SerialName("time_window") val timeWindow: TimeWindow,
    @SerialName("primary_disaster_classification") val primaryDisasterClassification: PrimaryDisasterClassification,
    @SerialName("geographic_scope") val geographicScope: String,
    @SerialName("severity_distribution") val severityDistribution: SeverityDistribution,
    @SerialName("estimated_affected") val estimatedAffected: EstimatedAffected,
    @SerialName("priority_zones") val priorityZones: List<PriorityZone>,
    @SerialName("consolidated_hazards") val consolidatedHazards: List<ConsolidatedHazard>,
    @SerialName("vulnerable_groups_summary") val vulnerableGroupsSummary: String,
    @SerialName("recommended_actions") val recommendedActions: List<RecommendedAction>,
    @SerialName("report_validity_notes") val reportValidityNotes: List<ReportValidityNote>,
    @SerialName("data_confidence_notes") val dataConfidenceNotes: String,
)
