"""
routing.py - Computer Networks Integration & Enforcement Dispatch Engine
Implements:
1. Six-zone routing table lookup based on vehicle prefix.
2. Handler availability and daily capacity management.
3. Priority-based dispatch hierarchy (Emergency/Critical > High > Medium > Low).
4. Automated primary and backup handler failover.
5. Waiting Queue management for capacity overflows.
6. Central Correction Queue for unmatched or unknown vehicle prefixes.
7. Duplicate assignment prevention and full SQLite transaction logging.
"""

import sqlite3
from typing import Dict, Any, Optional, Tuple, List

# Priority levels and their numeric rank (lower number = higher priority)
PRIORITY_RANKS = {
    "Emergency / Critical": 1,
    "Critical": 1,
    "Emergency": 1,
    "High": 2,
    "Medium": 3,
    "Low": 4
}

# Configured 6-zone static routing table based on vehicle prefix
ROUTING_TABLE: Dict[str, Dict[str, str]] = {
    "KA01": {
        "zone_code": "Zone 1",
        "team_name": "Team A",
        "description": "Bangalore Central - MG Road, Brigade Rd, CBD"
    },
    "KA02": {
        "zone_code": "Zone 2",
        "team_name": "Team B",
        "description": "Bangalore West - Rajajinagar, Malleshwaram, Yeshwanthpur"
    },
    "KA03": {
        "zone_code": "Zone 3",
        "team_name": "Team C",
        "description": "Bangalore East - Indiranagar, Marathahalli, Domlur"
    },
    "KA04": {
        "zone_code": "Zone 4",
        "team_name": "Team D",
        "description": "Bangalore North - Hebbal, Yelahanka, Jakkur"
    },
    "KA05": {
        "zone_code": "Zone 5",
        "team_name": "Team E",
        "description": "Bangalore South - Jayanagar, JP Nagar, BTM Layout"
    },
    "KA06": {
        "zone_code": "Zone 6",
        "team_name": "Team F",
        "description": "Tech Corridor / Rural - Whitefield, Bellandur, Electronic City"
    }
}


def extract_vehicle_prefix(vehicle_number: str) -> str:
    """Extracts the first 4 characters of the vehicle registration number (e.g. 'KA01')."""
    if not vehicle_number or len(vehicle_number) < 4:
        return ""
    return vehicle_number[:4].upper()


def identify_zone_from_prefix(prefix: str) -> Optional[Dict[str, str]]:
    """Looks up routing table for the given vehicle prefix."""
    return ROUTING_TABLE.get(prefix)


def get_handler_active_assignment_count(conn: sqlite3.Connection, handler_id: int) -> int:
    """Calculates active assignments for a handler from the SQLite database."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COUNT(*) AS count 
        FROM reports 
        WHERE assigned_handler_id = ? 
          AND status IN ('Assigned', 'In Progress')
    """, (handler_id,))
    row = cursor.fetchone()
    return row["count"] if row else 0


def route_and_assign_report(
    conn: sqlite3.Connection,
    report_db_id: int,
    vehicle_number: str,
    priority: str
) -> Dict[str, Any]:
    """
    Main routing algorithm:
    1. Extract prefix.
    2. Check routing table:
       - If unmapped: send to Central Correction Queue.
       - If mapped: find zone in DB.
    3. Check primary handler in that zone:
       - If available and active assignments < daily_capacity -> assign Primary.
    4. If primary not available / at capacity:
       - Check backup handler in that zone.
       - If available and active assignments < capacity -> assign Backup.
    5. If both unavailable / at capacity:
       - Route to Waiting Queue (Escalated status).
    6. Prevents duplicate assignment and logs into assignments and status_history tables.
    """
    cursor = conn.cursor()

    # 1. Prevent duplicate active assignment
    cursor.execute("SELECT id, status, assigned_handler_id FROM reports WHERE id = ?", (report_db_id,))
    current_report = cursor.fetchone()
    if not current_report:
        raise ValueError(f"Report with id {report_db_id} does not exist.")

    if current_report["assigned_handler_id"] is not None and current_report["status"] in ('Assigned', 'In Progress'):
        return {
            "success": False,
            "message": "Report is already assigned to an active enforcement handler.",
            "status": current_report["status"],
            "handler_id": current_report["assigned_handler_id"]
        }

    # 2. Extract prefix and identify zone
    prefix = extract_vehicle_prefix(vehicle_number)
    route_info = identify_zone_from_prefix(prefix)

    # UNKNOWN ZONE HANDLING -> Central Correction Queue
    if not route_info:
        new_status = "Central Correction Queue"
        routing_notes = (
            f"Vehicle prefix '{prefix}' does not match any configured enforcement zone (KA01-KA06). "
            f"Escalated to Central Correction Queue for manual operator dispatch."
        )

        cursor.execute("""
            UPDATE reports 
            SET status = ?, assigned_zone_name = ?, zone_id = NULL, assigned_handler_id = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (new_status, "Unknown Zone", report_db_id))

        cursor.execute("""
            INSERT INTO status_history (report_id, old_status, new_status, changed_by, comment)
            VALUES (?, ?, ?, ?, ?)
        """, (report_db_id, current_report["status"], new_status, "Routing Engine", routing_notes))

        conn.commit()

        return {
            "success": True,
            "status": new_status,
            "assigned": False,
            "zone": "Unknown Zone",
            "team": "Unassigned",
            "handler": None,
            "message": routing_notes
        }

    # 3. Known zone found
    zone_code = route_info["zone_code"]
    cursor.execute("SELECT id, code, team_name FROM zones WHERE code = ?", (zone_code,))
    zone_row = cursor.fetchone()
    if not zone_row:
        raise ValueError(f"Zone record for '{zone_code}' not found in database.")

    zone_id = zone_row["id"]
    team_name = zone_row["team_name"]

    # Retrieve all handlers in this zone ordered by role ('Primary' first, then 'Backup')
    cursor.execute("""
        SELECT id, handler_id, name, team_name, role, is_available, daily_capacity
        FROM handlers
        WHERE zone_id = ?
        ORDER BY CASE role WHEN 'Primary' THEN 1 WHEN 'Backup' THEN 2 ELSE 3 END
    """, (zone_id,))
    handlers = cursor.fetchall()

    selected_handler = None
    assignment_type = None
    routing_notes = ""

    # Evaluate primary handler first, then backup
    for handler in handlers:
        handler_pk = handler["id"]
        handler_name = handler["name"]
        role = handler["role"]
        is_avail = bool(handler["is_available"])
        capacity = handler["daily_capacity"]

        active_count = get_handler_active_assignment_count(conn, handler_pk)

        if not is_avail:
            continue

        if active_count < capacity:
            selected_handler = handler
            assignment_type = role
            if role == "Primary":
                routing_notes = (
                    f"Assigned to Primary Handler {handler_name} ({handler['handler_id']}). "
                    f"Current load: {active_count + 1}/{capacity}."
                )
            else:
                routing_notes = (
                    f"Primary handler unavailable/at capacity. Assigned to Backup Handler "
                    f"{handler_name} ({handler['handler_id']}). Current load: {active_count + 1}/{capacity}."
                )
            break

    # 4. Check assignment outcome
    if selected_handler:
        # Successful assignment
        new_status = "Assigned"
        handler_pk = selected_handler["id"]

        cursor.execute("""
            UPDATE reports 
            SET status = ?, zone_id = ?, assigned_zone_name = ?, assigned_handler_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (new_status, zone_id, zone_code, handler_pk, report_db_id))

        cursor.execute("""
            INSERT INTO assignments (report_id, handler_id, zone_id, assignment_type, routing_notes)
            VALUES (?, ?, ?, ?, ?)
        """, (report_db_id, handler_pk, zone_id, assignment_type, routing_notes))

        cursor.execute("""
            INSERT INTO status_history (report_id, old_status, new_status, changed_by, comment)
            VALUES (?, ?, ?, ?, ?)
        """, (report_db_id, current_report["status"], new_status, "Automated Dispatcher", routing_notes))

        conn.commit()

        return {
            "success": True,
            "status": new_status,
            "assigned": True,
            "zone": zone_code,
            "team": team_name,
            "handler": {
                "id": selected_handler["id"],
                "handler_id": selected_handler["handler_id"],
                "name": selected_handler["name"],
                "role": assignment_type
            },
            "message": routing_notes
        }

    else:
        # All handlers unavailable or full -> Waiting Queue
        new_status = "Waiting Queue"
        routing_notes = (
            f"All enforcement handlers in {zone_code} ({team_name}) are currently unavailable or have "
            f"reached maximum daily capacity. Report placed in Waiting Queue with priority '{priority}'."
        )

        cursor.execute("""
            UPDATE reports 
            SET status = ?, zone_id = ?, assigned_zone_name = ?, assigned_handler_id = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (new_status, zone_id, zone_code, report_db_id))

        cursor.execute("""
            INSERT INTO status_history (report_id, old_status, new_status, changed_by, comment)
            VALUES (?, ?, ?, ?, ?)
        """, (report_db_id, current_report["status"], new_status, "Routing Engine", routing_notes))

        conn.commit()

        return {
            "success": True,
            "status": new_status,
            "assigned": False,
            "zone": zone_code,
            "team": team_name,
            "handler": None,
            "message": routing_notes
        }


def process_waiting_queue(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    """
    Evaluates waiting queue reports in order of priority:
    1. Emergency / Critical
    2. High
    3. Medium
    4. Low
    Then by oldest created_at.
    Attempts to assign waiting reports if capacity has opened up.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, vehicle_number, priority, assigned_zone_name
        FROM reports
        WHERE status = 'Waiting Queue'
        ORDER BY 
            CASE priority 
                WHEN 'Emergency / Critical' THEN 1 
                WHEN 'Critical' THEN 1
                WHEN 'Emergency' THEN 1
                WHEN 'High' THEN 2 
                WHEN 'Medium' THEN 3 
                WHEN 'Low' THEN 4 
                ELSE 5 
            END ASC,
            created_at ASC
    """)
    waiting_reports = cursor.fetchall()
    dispatched = []

    for report in waiting_reports:
        res = route_and_assign_report(
            conn,
            report["id"],
            report["vehicle_number"],
            report["priority"]
        )
        if res.get("assigned"):
            dispatched.append({
                "report_id": report["id"],
                "result": res
            })

    return dispatched
