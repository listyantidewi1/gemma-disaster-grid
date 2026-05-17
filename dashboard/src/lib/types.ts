/**
 * Gemma Disaster Grid — TypeScript types for the NusaSiaga dashboard.
 *
 * Mirrors the Pydantic schemas in `grg/schemas.py`. Keep these in sync if
 * the Python schemas evolve.
 */

export type DisasterType =
  | "flood"
  | "earthquake"
  | "landslide"
  | "fire"
  | "storm"
  | "building_collapse"
  | "volcanic"
  | "tsunami"
  | "other";

export type EvacuationPriority = "immediate" | "urgent" | "standby" | "none";

export type RoutingRecommendation = "fast_lane" | "deep_lane";

export type ValidityFlag =
  | "low_quality"
  | "possible_duplicate"
  | "conflicting"
  | "verified_by_corroboration";

export interface Location {
  lat: number | null;
  lon: number | null;
  accuracy_m: number | null;
  label: string | null;
}

export interface PeopleVisible {
  adults: number;
  children: number;
  elderly_apparent: number;
  injured_apparent: number;
  trapped_apparent: number;
}

/**
 * One field triage report — what Gemma 4 E2B emits on the responder's phone
 * after analyzing a photo + optional voice/text annotation.
 */
export interface EdgeTriageReport {
  report_id: string;
  timestamp_iso: string;
  location: Location;
  disaster_type: DisasterType;
  disaster_type_confidence: number;
  severity: 1 | 2 | 3 | 4 | 5;
  severity_rationale: string;
  hazards_visible: string[];
  people_visible: PeopleVisible;
  immediate_action: string;
  evacuation_priority: EvacuationPriority;
  routing_recommendation: RoutingRecommendation;
  routing_rationale: string;
}

export interface TimeWindow {
  start_iso: string;
  end_iso: string;
}

export interface PrimaryDisasterClassification {
  type: DisasterType;
  confidence: number;
  secondary_types: DisasterType[];
}

export interface SeverityDistribution {
  "1": number;
  "2": number;
  "3": number;
  "4": number;
  "5": number;
}

export interface EstimatedAffected {
  people_count_min: number;
  people_count_max: number;
  method: string;
}

export interface PriorityZone {
  label: string;
  max_severity: 1 | 2 | 3 | 4 | 5;
  report_ids: string[];
  evacuation_priority: "immediate" | "urgent" | "standby";
  dominant_hazards: string[];
  rationale: string;
}

export interface ConsolidatedHazard {
  hazard: string;
  report_count: number;
  severity_implication: string;
}

export interface RecommendedAction {
  action: string;
  priority: 1 | 2 | 3 | 4 | 5;
  rationale: string;
  responsible_party: string;
}

export interface ReportValidityNote {
  report_id: string;
  flag: ValidityFlag;
  rationale: string;
}

/**
 * The consolidated operational picture — what Gemma 4 31B emits in the
 * command-center notebook over an array of EdgeTriageReports.
 */
export interface CommandCenterSynthesis {
  incident_id: string;
  synthesis_timestamp_iso: string;
  report_count: number;
  time_window: TimeWindow;
  primary_disaster_classification: PrimaryDisasterClassification;
  geographic_scope: string;
  severity_distribution: SeverityDistribution;
  estimated_affected: EstimatedAffected;
  priority_zones: PriorityZone[];
  consolidated_hazards: ConsolidatedHazard[];
  vulnerable_groups_summary: string;
  recommended_actions: RecommendedAction[];
  report_validity_notes: ReportValidityNote[];
  data_confidence_notes: string;
}

/**
 * Helper for the routing decision UI — combines the EdgeTriageReport's
 * model self-assessment with the app-level routing decision (which may
 * override the model's recommendation based on cross-report context).
 */
export interface RoutingDecision {
  decision: RoutingRecommendation;
  rationale: string;
  model_recommendation: RoutingRecommendation;
  overridden: boolean;
  override_reason?: string;
}
