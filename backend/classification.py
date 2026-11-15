"""
classification.py - Violation Classification Module
Defines the five official violation categories, their codes, fine amounts,
default severity, and descriptions for the Parking Violation Tracker.
"""

from typing import Dict, Any, Optional

CATEGORIES = {
    "PV01": {
        "code": "PV01",
        "name": "No-Permit",
        "title": "Parking Without Valid Permit",
        "description": "Vehicle parked in a regulated or reserved bay without a valid parking permit or authorization.",
        "fine_amount": 500,
        "default_priority": "Medium"
    },
    "PV02": {
        "code": "PV02",
        "name": "Overstay",
        "title": "Exceeding Maximum Parking Duration",
        "description": "Vehicle remained parked beyond the maximum permitted time limit or metered duration.",
        "fine_amount": 300,
        "default_priority": "Low"
    },
    "PV03": {
        "code": "PV03",
        "name": "Wrong-Zone",
        "title": "Unauthorized Zone Infraction",
        "description": "Vehicle parked in a residential, commercial, or restricted zone outside its registered permit sector.",
        "fine_amount": 750,
        "default_priority": "Medium"
    },
    "PV04": {
        "code": "PV04",
        "name": "Obstruction",
        "title": "Obstructing Traffic or Emergency Access",
        "description": "Vehicle blocking entrance, exit, emergency access lane, pedestrian walkway, or another vehicle.",
        "fine_amount": 1000,
        "default_priority": "High"
    },
    "PV05": {
        "code": "PV05",
        "name": "Disabled-Bay",
        "title": "Unauthorized Disabled Bay Parking",
        "description": "Vehicle parked in a designated accessible/disabled bay without valid disability badge or certification.",
        "fine_amount": 1500,
        "default_priority": "Emergency / Critical"
    }
}


def get_all_categories() -> Dict[str, Dict[str, Any]]:
    """Returns all 5 predefined violation categories."""
    return CATEGORIES


def get_category_by_code(code: str) -> Optional[Dict[str, Any]]:
    """Retrieves metadata for a specific violation code."""
    return CATEGORIES.get(code)


def classify_violation(code: str) -> Dict[str, Any]:
    """
    Classifies a violation code into its designated category.
    Returns category metadata or raises ValueError if code is unmapped.
    """
    if code not in CATEGORIES:
        raise ValueError(f"Unknown violation code '{code}'. Expected one of: {list(CATEGORIES.keys())}")
    return CATEGORIES[code]
