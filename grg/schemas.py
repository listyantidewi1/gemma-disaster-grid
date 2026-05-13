"""
Pydantic models for the Gemma Rescue Grid data contract.

Implements the two JSON schemas documented in prompts/output_schemas.md:
  - EdgeTriageReport: emitted by Gemma 4 E2B on-device for one report
  - CommandCenterSynthesis: emitted by Gemma 4 31B over an array of EdgeTriageReports

Both models forbid extra fields so judges can see schema-strict parsing in the notebook.
"""

from __future__ import annotations

import json
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, ValidationError

DisasterType = Literal[
    "flood",
    "earthquake",
    "landslide",
    "fire",
    "storm",
    "building_collapse",
    "volcanic",
    "tsunami",
    "other",
]

EvacuationPriority = Literal["immediate", "urgent", "standby", "none"]
RoutingRecommendation = Literal["fast_lane", "deep_lane"]
ValidityFlag = Literal[
    "low_quality",
    "possible_duplicate",
    "conflicting",
    "verified_by_corroboration",
]


class Location(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lat: float | None = None
    lon: float | None = None
    accuracy_m: float | None = None
    label: str | None = Field(default=None, max_length=80)


class PeopleVisible(BaseModel):
    model_config = ConfigDict(extra="forbid")
    adults: int = Field(ge=0)
    children: int = Field(ge=0)
    elderly_apparent: int = Field(ge=0)
    injured_apparent: int = Field(ge=0)
    trapped_apparent: int = Field(ge=0)

    @property
    def total(self) -> int:
        return (
            self.adults
            + self.children
            + self.elderly_apparent
            + self.injured_apparent
            + self.trapped_apparent
        )


class EdgeTriageReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    report_id: str
    timestamp_iso: str
    location: Location
    disaster_type: DisasterType
    disaster_type_confidence: float = Field(ge=0.0, le=1.0)
    severity: int = Field(ge=1, le=5)
    severity_rationale: str = Field(max_length=200)
    hazards_visible: list[str] = Field(max_length=8)
    people_visible: PeopleVisible
    immediate_action: str = Field(max_length=200)
    evacuation_priority: EvacuationPriority
    routing_recommendation: RoutingRecommendation
    routing_rationale: str = Field(max_length=100)


class TimeWindow(BaseModel):
    model_config = ConfigDict(extra="forbid")
    start_iso: str
    end_iso: str


class PrimaryDisasterClassification(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: DisasterType
    confidence: float = Field(ge=0.0, le=1.0)
    secondary_types: list[DisasterType] = Field(default_factory=list)


class SeverityDistribution(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    count_1: int = Field(default=0, ge=0, alias="1")
    count_2: int = Field(default=0, ge=0, alias="2")
    count_3: int = Field(default=0, ge=0, alias="3")
    count_4: int = Field(default=0, ge=0, alias="4")
    count_5: int = Field(default=0, ge=0, alias="5")


class EstimatedAffected(BaseModel):
    model_config = ConfigDict(extra="forbid")
    people_count_min: int = Field(ge=0)
    people_count_max: int = Field(ge=0)
    method: str = Field(max_length=120)


class PriorityZone(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: str = Field(max_length=80)
    max_severity: int = Field(ge=1, le=5)
    report_ids: list[str]
    evacuation_priority: Literal["immediate", "urgent", "standby"]
    dominant_hazards: list[str] = Field(max_length=5)
    rationale: str = Field(max_length=300)


class ConsolidatedHazard(BaseModel):
    model_config = ConfigDict(extra="forbid")
    hazard: str = Field(max_length=80)
    report_count: int = Field(ge=1)
    severity_implication: str = Field(max_length=200)


class RecommendedAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: str = Field(max_length=200)
    priority: int = Field(ge=1, le=5)
    rationale: str = Field(max_length=200)
    responsible_party: str = Field(max_length=80)


class ReportValidityNote(BaseModel):
    model_config = ConfigDict(extra="forbid")
    report_id: str
    flag: ValidityFlag
    rationale: str = Field(max_length=200)


class CommandCenterSynthesis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    incident_id: str
    synthesis_timestamp_iso: str
    report_count: int = Field(ge=1)
    time_window: TimeWindow
    primary_disaster_classification: PrimaryDisasterClassification
    geographic_scope: str = Field(max_length=300)
    severity_distribution: SeverityDistribution
    estimated_affected: EstimatedAffected
    priority_zones: list[PriorityZone]
    consolidated_hazards: list[ConsolidatedHazard]
    vulnerable_groups_summary: str = Field(max_length=400)
    recommended_actions: list[RecommendedAction]
    report_validity_notes: list[ReportValidityNote]
    data_confidence_notes: str = Field(max_length=600)


def parse_edge_report(raw: str | dict) -> tuple[EdgeTriageReport | None, str | None]:
    """Parse a raw JSON string or dict into an EdgeTriageReport.

    Returns (report, None) on success, (None, error_message) on failure.
    Used in the notebook to gracefully handle malformed model output.
    """
    try:
        data = json.loads(raw) if isinstance(raw, str) else raw
        return EdgeTriageReport.model_validate(data), None
    except (json.JSONDecodeError, ValidationError) as e:
        return None, str(e)


def parse_synthesis(raw: str | dict) -> tuple[CommandCenterSynthesis | None, str | None]:
    """Parse a raw JSON string or dict into a CommandCenterSynthesis."""
    try:
        data = json.loads(raw) if isinstance(raw, str) else raw
        return CommandCenterSynthesis.model_validate(data), None
    except (json.JSONDecodeError, ValidationError) as e:
        return None, str(e)


def extract_json_from_model_output(text: str) -> str | None:
    """Strip a thinking trace and code fences to return just the final JSON object.

    Gemma 4's `gemma-4-thinking` template can emit:
      <|channel>thought
      ...reasoning text...
      <channel|>{"actual": "json"}

    or sometimes wrap output in ```json fences. Returns the substring from the
    first balanced top-level `{...}` that parses as JSON. If no candidate parses,
    returns the first balanced object as a fallback so the caller's validator
    can report a more informative error.

    This iterates over every `{` in the text so that template placeholders like
    `{"incident_id": <uuid>}` in the system prompt (where the angle-bracket
    placeholders make the substring non-parseable JSON) are skipped in favor of
    the model's actual emission later in the string.
    """
    candidates: list[str] = []
    i = 0
    while i < len(text):
        if text[i] != "{":
            i += 1
            continue
        depth = 0
        in_string = False
        escape = False
        for j in range(i, len(text)):
            ch = text[j]
            if escape:
                escape = False
                continue
            if ch == "\\":
                escape = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    candidate = text[i : j + 1]
                    candidates.append(candidate)
                    try:
                        json.loads(candidate)
                        return candidate
                    except json.JSONDecodeError:
                        pass
                    i = j + 1
                    break
        else:
            # Reached end of text without closing the brace.
            break
    return candidates[0] if candidates else None
