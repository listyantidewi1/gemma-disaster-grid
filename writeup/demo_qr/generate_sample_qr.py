"""Generate a small set of EdgeTriageReport QR codes for testing
the QR-mesh scanner and the Recent reports view on the phone
without needing a fleet of phones.

Each JSON validates against the Kotlin EdgeTriageReport
serializer used in ai.grg.QrCodeScanner.tryParseReport — same
snake_case field names, same enum values, all required fields
present, severity in 1..5, confidence in 0..1.

The set covers four different disaster types, four severities,
and four continents so the dashboard map + IncidentFeed + filter
chips all have something to render.

Run:
    python generate_sample_qr.py

Output (one PNG + one JSON per report):
    sample_qr_1.png  flood     Yogyakarta, Indonesia       sev 4
    sample_qr_2.png  earthquake Antakya, Türkiye           sev 5
    sample_qr_3.png  fire      Riau, Indonesia (peatland)  sev 3
    sample_qr_4.png  storm     Manila, Philippines         sev 4
"""

from __future__ import annotations

import json
from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_M


SAMPLE_REPORTS: list[dict] = [
    {
        "report_id": "edge-qr-sample-001",
        "timestamp_iso": "2026-05-15T16:00:00Z",
        "location": {
            "lat": -7.7956,
            "lon": 110.3695,
            "accuracy_m": 12.5,
            "label": "Tugu, Yogyakarta, Indonesia",
        },
        "disaster_type": "flood",
        "disaster_type_confidence": 0.91,
        "severity": 4,
        "severity_rationale": (
            "Floodwater at mid-thigh on adults; downed traffic-light wiring "
            "at the intersection; one motorcycle partially submerged."
        ),
        "hazards_visible": [
            "rising water",
            "downed traffic light",
            "exposed wiring",
        ],
        "people_visible": {
            "adults": 3,
            "children": 1,
            "elderly_apparent": 1,
            "injured_apparent": 0,
            "trapped_apparent": 0,
        },
        "immediate_action": (
            "Evacuate the elderly resident immediately. Stay clear of the "
            "downed traffic-light wiring. Boat rescue from upwind side."
        ),
        "evacuation_priority": "urgent",
        "routing_recommendation": "deep_lane",
        "routing_rationale": (
            "Severity 4 with compound hazards (water + electrical) and one "
            "vulnerable evacuee."
        ),
    },
    {
        "report_id": "edge-qr-sample-002",
        "timestamp_iso": "2026-05-15T16:05:00Z",
        "location": {
            "lat": 36.2023,
            "lon": 36.1606,
            "accuracy_m": 18.0,
            "label": "Antakya, Hatay, Türkiye",
        },
        "disaster_type": "earthquake",
        "disaster_type_confidence": 0.94,
        "severity": 5,
        "severity_rationale": (
            "Five-storey residential block has pancake-collapsed. Multiple "
            "voices audible from voids. Gas leak smell on the south side."
        ),
        "hazards_visible": [
            "structural collapse",
            "gas leak",
            "unstable debris",
            "people audible in voids",
        ],
        "people_visible": {
            "adults": 6,
            "children": 2,
            "elderly_apparent": 1,
            "injured_apparent": 3,
            "trapped_apparent": 5,
        },
        "immediate_action": (
            "Establish exclusion zone. Request heavy USAR team + structural "
            "engineer. Shut off mains gas before any cutting work begins."
        ),
        "evacuation_priority": "immediate",
        "routing_recommendation": "deep_lane",
        "routing_rationale": (
            "Severity 5, multiple trapped, compound hazard (collapse + gas)."
        ),
    },
    {
        "report_id": "edge-qr-sample-003",
        "timestamp_iso": "2026-05-15T16:10:00Z",
        "location": {
            "lat": 0.5103,
            "lon": 101.4477,
            "accuracy_m": 25.0,
            "label": "Pekanbaru, Riau, Indonesia",
        },
        "disaster_type": "fire",
        "disaster_type_confidence": 0.88,
        "severity": 3,
        "severity_rationale": (
            "Active peatland fire, ~4 m flame front, dense low smoke. No "
            "structures involved yet. Wind pushing plume toward a kampung "
            "~2 km southeast."
        ),
        "hazards_visible": [
            "peatland combustion",
            "low visibility smoke",
            "ember cast",
        ],
        "people_visible": {
            "adults": 2,
            "children": 0,
            "elderly_apparent": 0,
            "injured_apparent": 0,
            "trapped_apparent": 0,
        },
        "immediate_action": (
            "Pre-warn downwind kampung. Stage water tanker access. Monitor "
            "wind shift; peat fires can spread underground beyond the visible "
            "front."
        ),
        "evacuation_priority": "standby",
        "routing_recommendation": "deep_lane",
        "routing_rationale": (
            "Peat-fire downwind exposure risk; deep-lane synthesis can "
            "correlate with FIRMS satellite signal."
        ),
    },
    {
        "report_id": "edge-qr-sample-004",
        "timestamp_iso": "2026-05-15T16:15:00Z",
        "location": {
            "lat": 14.5995,
            "lon": 120.9842,
            "accuracy_m": 14.0,
            "label": "Tondo, Manila, Philippines",
        },
        "disaster_type": "storm",
        "disaster_type_confidence": 0.85,
        "severity": 4,
        "severity_rationale": (
            "Typhoon-driven surface flooding to knee height; corrugated-iron "
            "roof panels airborne; one elderly resident sheltering on a "
            "second-floor balcony signalling for help."
        ),
        "hazards_visible": [
            "wind-borne debris",
            "knee-deep floodwater",
            "downed power line",
        ],
        "people_visible": {
            "adults": 2,
            "children": 0,
            "elderly_apparent": 1,
            "injured_apparent": 0,
            "trapped_apparent": 1,
        },
        "immediate_action": (
            "Coordinate boat rescue for the second-floor elderly resident. "
            "Do not enter water — power line is in it. Establish 30 m "
            "downwind cordon for debris."
        ),
        "evacuation_priority": "immediate",
        "routing_recommendation": "deep_lane",
        "routing_rationale": (
            "One trapped + compound hazards (wind, water, electrical)."
        ),
    },
]


def main() -> None:
    out_dir = Path(__file__).resolve().parent
    print(f"{'#':>2}  {'type':<11} {'sev':<4} {'bytes':<6} {'ver':<3}  label")
    print("-" * 80)
    for i, report in enumerate(SAMPLE_REPORTS, start=1):
        payload = json.dumps(report, separators=(",", ":"))
        json_path = out_dir / f"sample_report_{i}.json"
        png_path = out_dir / f"sample_qr_{i}.png"
        json_path.write_text(payload + "\n", encoding="utf-8")

        qr = qrcode.QRCode(
            version=None,
            error_correction=ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(png_path)

        print(
            f"{i:>2}  {report['disaster_type']:<11} "
            f"{report['severity']:<4} {len(payload):<6} {qr.version:<3}  "
            f"{report['location']['label']}"
        )


if __name__ == "__main__":
    main()
