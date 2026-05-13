# JSON Output Schemas

This is the **data contract** between every component: the E2B edge model, the Android app, the sync layer, and the 31B command center.

Two schemas:
1. **`EdgeTriageReport`** — emitted by Gemma 4 E2B on the phone for a single field report.
2. **`CommandCenterSynthesis`** — emitted by Gemma 4 31B in the notebook over an array of `EdgeTriageReport`s.

Both are pure JSON, no XML or markdown wrapping. Both are designed to be small enough to embed in voiceover ("severity four, two children visible, immediate evacuation") and structured enough to drive UI.

---

## Schema 1 — `EdgeTriageReport`

Emitted by E2B for one field report. The whole object is ≤ ~400 tokens to keep on-device latency low.

```json
{
  "report_id": "string (uuid v4, generated client-side)",
  "timestamp_iso": "string (ISO 8601, UTC)",
  "location": {
    "lat": "number | null",
    "lon": "number | null",
    "accuracy_m": "number | null",
    "label": "string (≤80 chars, extracted from voice/text if present, else null)"
  },
  "disaster_type": "one of: flood | earthquake | landslide | fire | storm | building_collapse | volcanic | tsunami | other",
  "disaster_type_confidence": "number in [0.0, 1.0]",
  "severity": "integer in [1, 5]",
  "severity_rationale": "string (≤200 chars, what in the image/audio justified this score)",
  "hazards_visible": [
    "string (each entry ≤60 chars, e.g. 'live electrical wires', 'unstable wall', 'rising water')"
  ],
  "people_visible": {
    "adults": "integer ≥ 0",
    "children": "integer ≥ 0",
    "elderly_apparent": "integer ≥ 0",
    "injured_apparent": "integer ≥ 0",
    "trapped_apparent": "integer ≥ 0"
  },
  "immediate_action": "string (≤200 chars, the single most important action for someone arriving in the next 10 minutes)",
  "evacuation_priority": "one of: immediate | urgent | standby | none",
  "routing_recommendation": "one of: fast_lane | deep_lane",
  "routing_rationale": "string (≤100 chars, the model's own reasoning for the routing decision)"
}
```

### Severity definitions

- **1 — Minor:** isolated damage, no apparent injuries, infrastructure largely intact
- **2 — Localized:** damage to a few structures, possible minor injuries, partial service loss
- **3 — Significant:** substantial structural damage visible, evident injuries possible, area unsafe
- **4 — Severe:** widespread damage, likely trapped/injured persons, immediate hazards
- **5 — Catastrophic:** complete destruction visible, mass-casualty potential, active life-threatening hazards (rising water, fire, collapse in progress)

### Evacuation priority definitions

- **immediate** — within minutes; people in active life threat
- **urgent** — within the hour; hazards likely to worsen
- **standby** — monitor; conditions could change
- **none** — no evacuation needed

### Routing recommendation guidance

The model should recommend `deep_lane` when **any** of:
- Severity is 4 or 5
- `disaster_type_confidence` is below 0.7
- Hazards include uncommon or conflicting cues (e.g. mixed flood + fire)
- The image quality is poor enough that the model is uncertain
- Trapped persons indicated

Otherwise `fast_lane` is acceptable. The application layer may override `fast_lane` to `deep_lane` based on cross-report context the model cannot see.

---

## Schema 2 — `CommandCenterSynthesis`

Emitted by Gemma 4 31B after ingesting an array of edge reports. Designed to fit on one ops-dashboard screen (~800 tokens).

```json
{
  "incident_id": "string (uuid v4)",
  "synthesis_timestamp_iso": "string (ISO 8601, UTC)",
  "report_count": "integer ≥ 1",
  "time_window": {
    "start_iso": "string",
    "end_iso": "string"
  },
  "primary_disaster_classification": {
    "type": "same enum as EdgeTriageReport.disaster_type",
    "confidence": "number in [0.0, 1.0]",
    "secondary_types": ["array of disaster_type values that also appear in reports"]
  },
  "geographic_scope": "string (≤300 chars, human-readable description of affected area)",
  "severity_distribution": {
    "5": "integer count",
    "4": "integer count",
    "3": "integer count",
    "2": "integer count",
    "1": "integer count"
  },
  "estimated_affected": {
    "people_count_min": "integer ≥ 0",
    "people_count_max": "integer ≥ 0",
    "method": "string (≤120 chars, explaining how the estimate was derived)"
  },
  "priority_zones": [
    {
      "label": "string (≤80 chars, geographic label or report cluster id)",
      "max_severity": "integer in [1, 5]",
      "report_ids": ["array of report_id strings"],
      "evacuation_priority": "immediate | urgent | standby",
      "dominant_hazards": ["array of strings, ≤5 entries"],
      "rationale": "string (≤300 chars)"
    }
  ],
  "consolidated_hazards": [
    {
      "hazard": "string (≤80 chars)",
      "report_count": "integer",
      "severity_implication": "string (≤200 chars)"
    }
  ],
  "vulnerable_groups_summary": "string (≤400 chars, aggregated across reports: children, elderly, injured, trapped totals and where concentrated)",
  "recommended_actions": [
    {
      "action": "string (≤200 chars)",
      "priority": "integer in [1, 5] where 1 is highest",
      "rationale": "string (≤200 chars)",
      "responsible_party": "string (≤80 chars, e.g. 'medical team', 'evacuation logistics', 'utilities')"
    }
  ],
  "report_validity_notes": [
    {
      "report_id": "string",
      "flag": "one of: low_quality | possible_duplicate | conflicting | verified_by_corroboration",
      "rationale": "string (≤200 chars)"
    }
  ],
  "data_confidence_notes": "string (≤600 chars, where the synthesis is uncertain, where reports are thin, what would improve confidence)"
}
```

---

## Function-calling tool definition (alternative path)

For deployments that prefer Gemma 4's native function-calling protocol over structured output, the equivalent tool signature is:

```json
{
  "name": "submit_triage_report",
  "description": "Submit a single-image disaster field triage report after analyzing the photograph, optional voice note, and optional text annotation provided by the responder. Always populate every required field; use null only where indicated.",
  "parameters": {
    "type": "object",
    "properties": {
      "disaster_type": {"type": "string", "enum": ["flood", "earthquake", "landslide", "fire", "storm", "building_collapse", "volcanic", "tsunami", "other"]},
      "disaster_type_confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0},
      "severity": {"type": "integer", "minimum": 1, "maximum": 5},
      "severity_rationale": {"type": "string", "maxLength": 200},
      "hazards_visible": {"type": "array", "items": {"type": "string", "maxLength": 60}, "maxItems": 8},
      "people_visible": {
        "type": "object",
        "properties": {
          "adults": {"type": "integer", "minimum": 0},
          "children": {"type": "integer", "minimum": 0},
          "elderly_apparent": {"type": "integer", "minimum": 0},
          "injured_apparent": {"type": "integer", "minimum": 0},
          "trapped_apparent": {"type": "integer", "minimum": 0}
        },
        "required": ["adults", "children", "elderly_apparent", "injured_apparent", "trapped_apparent"]
      },
      "immediate_action": {"type": "string", "maxLength": 200},
      "evacuation_priority": {"type": "string", "enum": ["immediate", "urgent", "standby", "none"]},
      "routing_recommendation": {"type": "string", "enum": ["fast_lane", "deep_lane"]},
      "routing_rationale": {"type": "string", "maxLength": 100}
    },
    "required": [
      "disaster_type", "disaster_type_confidence", "severity", "severity_rationale",
      "hazards_visible", "people_visible", "immediate_action", "evacuation_priority",
      "routing_recommendation", "routing_rationale"
    ]
  }
}
```

We use the structured-output path for the demo (more reliable on edge), but the tool-call path is documented for production extensibility.

---

## Validation strategy

- Notebook ships a JSON Schema validator that runs against every E2B output and every 31B output.
- Validation failures are visible in the demo — judges see we don't paper over errors.
- A retry-with-correction prompt is invoked once if the first generation fails validation. If retry also fails, the report is flagged `low_quality` and surfaced to the user.
