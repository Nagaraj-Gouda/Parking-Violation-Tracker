"""
app.py - Flask REST API for Parking Violation Tracker
Integrates Automata validation, violation classification, dynamic network routing,
SQLite persistence, and real-time dashboard analytics.
"""

import os
import random
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from database import get_db_connection, init_db, dict_from_row
from validation import (
    validate_vehicle_number,
    validate_violation_code,
    validate_vehicle_number_dfa,
    validate_vehicle_number_regex
)
from classification import get_all_categories, get_category_by_code
from routing import (
    ROUTING_TABLE,
    route_and_assign_report,
    process_waiting_queue,
    extract_vehicle_prefix,
    get_handler_active_assignment_count
)

app = Flask(__name__)
# Enable CORS for all routes to communicate seamlessly with React Vite frontend
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Ensure database is initialized automatically at startup
with app.app_context():
    init_db()


def generate_unique_report_id(conn) -> str:
    """Generates a collision-free unique report identifier: PVR-YYYYMMDD-XXXX."""
    date_str = datetime.now().strftime("%Y%m%d")
    cursor = conn.cursor()
    while True:
        rand_num = random.randint(1000, 9999)
        candidate = f"PVR-{date_str}-{rand_num}"
        cursor.execute("SELECT id FROM reports WHERE report_id = ?", (candidate,))
        if not cursor.fetchone():
            return candidate


# -------------------------------------------------------------
# 1. Health & Meta Endpoints
# -------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint to verify backend operational status."""
    return jsonify({
        "status": "healthy",
        "service": "Parking Violation Tracker API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }), 200


@app.route("/api/categories", methods=["GET"])
def get_categories():
    """Returns the 5 official violation categories and metadata."""
    return jsonify({
        "categories": get_all_categories()
    }), 200


@app.route("/api/validate/vehicle", methods=["POST"])
def validate_vehicle():
    """
    Dedicated endpoint for real-time visual inspection of DFA states,
    regex matching, and automata verification.
    """
    data = request.get_json() or {}
    vehicle_number = data.get("vehicle_number", "")
    report = validate_vehicle_number(vehicle_number)
    return jsonify(report), 200


# -------------------------------------------------------------
# 2. Reports Endpoints
# -------------------------------------------------------------
@app.route("/api/reports", methods=["GET"])
def get_reports():
    """
    Retrieves reports with optional filters:
    - status
    - zone
    - priority
    - category
    - search (vehicle number, report ID, location)
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT r.*, 
               z.code AS zone_code, z.team_name AS zone_team,
               h.name AS handler_name, h.handler_id AS handler_code, h.role AS handler_role
        FROM reports r
        LEFT JOIN zones z ON r.zone_id = z.id
        LEFT JOIN handlers h ON r.assigned_handler_id = h.id
        WHERE 1=1
    """
    params = []

    status = request.args.get("status")
    if status:
        query += " AND r.status = ?"
        params.append(status)

    zone = request.args.get("zone")
    if zone:
        query += " AND (r.assigned_zone_name = ? OR z.code = ?)"
        params.extend([zone, zone])

    priority = request.args.get("priority")
    if priority:
        query += " AND r.priority = ?"
        params.append(priority)

    category = request.args.get("category")
    if category:
        query += " AND r.violation_category = ?"
        params.append(category)

    search = request.args.get("search")
    if search:
        search_param = f"%{search.strip()}%"
        query += " AND (r.vehicle_number LIKE ? OR r.report_id LIKE ? OR r.location LIKE ?)"
        params.extend([search_param, search_param, search_param])

    query += " ORDER BY r.created_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    reports = [dict_from_row(row) for row in rows]
    conn.close()

    return jsonify({"reports": reports, "count": len(reports)}), 200


@app.route("/api/reports/<int:report_id>", methods=["GET"])
def get_report_detail(report_id):
    """Retrieves full details for a report, including its assignments and status history."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT r.*, 
               z.code AS zone_code, z.team_name AS zone_team, z.description AS zone_description,
               h.name AS handler_name, h.handler_id AS handler_code, h.role AS handler_role
        FROM reports r
        LEFT JOIN zones z ON r.zone_id = z.id
        LEFT JOIN handlers h ON r.assigned_handler_id = h.id
        WHERE r.id = ?
    """, (report_id,))
    report_row = cursor.fetchone()

    if not report_row:
        conn.close()
        return jsonify({"error": f"Report with id {report_id} not found."}), 404

    report = dict_from_row(report_row)

    # Fetch status history
    cursor.execute("""
        SELECT * FROM status_history 
        WHERE report_id = ? 
        ORDER BY timestamp ASC, id ASC
    """, (report_id,))
    history = [dict_from_row(row) for row in cursor.fetchall()]

    # Fetch assignments
    cursor.execute("""
        SELECT a.*, h.name AS handler_name, h.handler_id AS handler_code, z.code AS zone_code
        FROM assignments a
        LEFT JOIN handlers h ON a.handler_id = h.id
        LEFT JOIN zones z ON a.zone_id = z.id
        WHERE a.report_id = ?
        ORDER BY a.assigned_at ASC
    """, (report_id,))
    assignments = [dict_from_row(row) for row in cursor.fetchall()]

    conn.close()

    report["status_history"] = history
    report["assignments"] = assignments

    return jsonify({"report": report}), 200


@app.route("/api/reports", methods=["POST"])
def submit_report():
    """
    Submits and processes a parking violation report:
    1. Validates inputs.
    2. Runs DFA and Regex vehicle validation and confirms agreement.
    3. Validates and classifies violation code.
    4. Automatically routes the report to enforcement zone and handler.
    5. Saves all records to SQLite database.
    """
    data = request.get_json() or {}

    vehicle_number = data.get("vehicle_number")
    violation_code = data.get("violation_code")
    description = data.get("description", "").strip()
    location = data.get("location", "").strip()
    priority = data.get("priority", "Medium").strip()
    custom_timestamp = data.get("date_time")

    # 1. Check required fields
    if not vehicle_number or not str(vehicle_number).strip():
        return jsonify({"error": "Vehicle registration number is required."}), 400

    if not violation_code or not str(violation_code).strip():
        return jsonify({"error": "Violation code is required."}), 400

    if not location:
        return jsonify({"error": "Violation location is required."}), 400

    # 2. Automata Theory Validation
    vehicle_validation = validate_vehicle_number(vehicle_number)
    if not vehicle_validation["valid"]:
        return jsonify({
            "error": vehicle_validation["error"],
            "validation_details": vehicle_validation
        }), 400

    # 3. Violation Code & Category Validation
    code_valid, code_msg, category = validate_violation_code(violation_code)
    if not code_valid:
        return jsonify({"error": code_msg}), 400

    # Validate priority option
    valid_priorities = ["Emergency / Critical", "Critical", "Emergency", "High", "Medium", "Low"]
    if priority not in valid_priorities:
        priority = "Medium"

    conn = get_db_connection()
    cursor = conn.cursor()

    report_code = generate_unique_report_id(conn)
    created_at = custom_timestamp if custom_timestamp else datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Insert preliminary report record
    cursor.execute("""
        INSERT INTO reports 
        (report_id, vehicle_number, violation_code, violation_category, description, location,
         priority, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
    """, (report_code, vehicle_number, violation_code, category, description, location, priority, created_at, created_at))
    report_db_id = cursor.lastrowid
    conn.commit()

    # 4. Computer Networks Routing & Handler Assignment
    routing_result = route_and_assign_report(conn, report_db_id, vehicle_number, priority)

    # Fetch complete saved report
    cursor.execute("""
        SELECT r.*, 
               z.code AS zone_code, z.team_name AS zone_team,
               h.name AS handler_name, h.handler_id AS handler_code
        FROM reports r
        LEFT JOIN zones z ON r.zone_id = z.id
        LEFT JOIN handlers h ON r.assigned_handler_id = h.id
        WHERE r.id = ?
    """, (report_db_id,))
    saved_report = dict_from_row(cursor.fetchone())
    conn.close()

    return jsonify({
        "message": "Violation report submitted and routed successfully.",
        "report": saved_report,
        "validation": vehicle_validation,
        "routing": routing_result
    }), 201


@app.route("/api/reports/<int:report_id>/status", methods=["PUT"])
def update_report_status(report_id):
    """
    Updates the status of a report (e.g., Pending -> Assigned -> In Progress -> Resolved).
    If marked 'Resolved', triggers waiting queue dispatch so newly freed capacity is utilized.
    """
    data = request.get_json() or {}
    new_status = data.get("status")
    comment = data.get("comment", f"Status changed to {new_status}")
    changed_by = data.get("changed_by", "Enforcement Operator")

    allowed_statuses = ["Pending", "Assigned", "In Progress", "Resolved", "Waiting Queue", "Central Correction Queue"]
    if new_status not in allowed_statuses:
        return jsonify({"error": f"Invalid status '{new_status}'. Allowed: {allowed_statuses}"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, status, assigned_handler_id, zone_id FROM reports WHERE id = ?", (report_id,))
    report = cursor.fetchone()
    if not report:
        conn.close()
        return jsonify({"error": f"Report with id {report_id} not found."}), 404

    old_status = report["status"]

    cursor.execute("""
        UPDATE reports 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (new_status, report_id))

    cursor.execute("""
        INSERT INTO status_history (report_id, old_status, new_status, changed_by, comment)
        VALUES (?, ?, ?, ?, ?)
    """, (report_id, old_status, new_status, changed_by, comment))

    conn.commit()

    # If the report is now resolved, free capacity may allow waiting queue reports to be assigned!
    dispatched_waiting = []
    if new_status == "Resolved":
        dispatched_waiting = process_waiting_queue(conn)

    cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
    updated_report = dict_from_row(cursor.fetchone())
    conn.close()

    return jsonify({
        "message": f"Report status successfully updated from '{old_status}' to '{new_status}'.",
        "report": updated_report,
        "dispatched_from_waiting_queue": dispatched_waiting
    }), 200


@app.route("/api/reports/<int:report_id>/reassign", methods=["POST"])
def manual_reassign_report(report_id):
    """
    Allows manual operator routing/reassignment (e.g. from Central Correction Queue or Waiting Queue).
    Can reassign to a specified handler or re-trigger automated routing.
    """
    data = request.get_json() or {}
    handler_id = data.get("handler_id")
    zone_code = data.get("zone_code")
    notes = data.get("notes", "Manual reassignment by supervisor")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM reports WHERE id = ?", (report_id,))
    report = cursor.fetchone()
    if not report:
        conn.close()
        return jsonify({"error": f"Report with id {report_id} not found."}), 404

    if handler_id:
        cursor.execute("SELECT id, name, handler_id, zone_id, daily_capacity, is_available FROM handlers WHERE id = ?", (handler_id,))
        handler = cursor.fetchone()
        if not handler:
            conn.close()
            return jsonify({"error": "Selected handler does not exist."}), 400

        # Check capacity
        active_count = get_handler_active_assignment_count(conn, handler["id"])
        if active_count >= handler["daily_capacity"]:
            conn.close()
            return jsonify({"error": f"Handler {handler['name']} has reached maximum daily capacity ({active_count}/{handler['daily_capacity']})."}), 400

        cursor.execute("SELECT id, code FROM zones WHERE id = ?", (handler["zone_id"],))
        zone_row = cursor.fetchone()
        target_zone_name = zone_row["code"] if zone_row else "Unknown Zone"

        cursor.execute("""
            UPDATE reports 
            SET status = 'Assigned', zone_id = ?, assigned_zone_name = ?, assigned_handler_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (handler["zone_id"], target_zone_name, handler["id"], report_id))

        cursor.execute("""
            INSERT INTO assignments (report_id, handler_id, zone_id, assignment_type, routing_notes)
            VALUES (?, ?, ?, 'Manual', ?)
        """, (report_id, handler["id"], handler["zone_id"], notes))

        cursor.execute("""
            INSERT INTO status_history (report_id, old_status, new_status, changed_by, comment)
            VALUES (?, ?, 'Assigned', 'Supervisor', ?)
        """, (report_id, report["status"], notes))

        conn.commit()
        conn.close()

        return jsonify({
            "message": f"Report successfully assigned to {handler['name']} ({handler['handler_id']})."
        }), 200

    else:
        # Re-trigger automated routing
        routing_res = route_and_assign_report(conn, report_id, report["vehicle_number"], report["priority"])
        conn.close()
        return jsonify({
            "message": "Report evaluated through routing engine.",
            "routing": routing_res
        }), 200


# -------------------------------------------------------------
# 3. Handlers Endpoints
# -------------------------------------------------------------
@app.route("/api/handlers", methods=["GET"])
def get_handlers():
    """Retrieves all enforcement handlers with live capacity and assignment statistics."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT h.*, z.code AS zone_code, z.team_name AS zone_team, z.prefix AS zone_prefix
        FROM handlers h
        JOIN zones z ON h.zone_id = z.id
        ORDER BY h.zone_id ASC, h.role DESC, h.id ASC
    """)
    rows = cursor.fetchall()

    handlers = []
    for row in rows:
        h = dict_from_row(row)
        active_count = get_handler_active_assignment_count(conn, h["id"])
        
        # Pending reports in handler's zone
        cursor.execute("""
            SELECT COUNT(*) AS pending_count 
            FROM reports 
            WHERE assigned_handler_id = ? AND status = 'Assigned'
        """, (h["id"],))
        pending_count = cursor.fetchone()["pending_count"]

        h["current_assignments"] = active_count
        h["pending_assignments"] = pending_count
        h["capacity_remaining"] = max(0, h["daily_capacity"] - active_count)
        h["is_at_capacity"] = active_count >= h["daily_capacity"]
        handlers.append(h)

    conn.close()
    return jsonify({"handlers": handlers, "count": len(handlers)}), 200


@app.route("/api/handlers/<int:handler_id>/availability", methods=["PUT"])
def toggle_handler_availability(handler_id):
    """Toggles or sets handler availability."""
    data = request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, name, is_available FROM handlers WHERE id = ?", (handler_id,))
    handler = cursor.fetchone()
    if not handler:
        conn.close()
        return jsonify({"error": f"Handler {handler_id} not found."}), 404

    # If is_available passed explicitly, use it; otherwise toggle
    if "is_available" in data:
        new_avail = 1 if data["is_available"] else 0
    else:
        new_avail = 0 if handler["is_available"] else 1

    cursor.execute("UPDATE handlers SET is_available = ? WHERE id = ?", (new_avail, handler_id))
    conn.commit()

    # If made available, evaluate waiting queue
    dispatched = []
    if new_avail == 1:
        dispatched = process_waiting_queue(conn)

    conn.close()
    return jsonify({
        "message": f"Handler '{handler['name']}' availability set to {bool(new_avail)}.",
        "is_available": bool(new_avail),
        "dispatched_from_waiting_queue": dispatched
    }), 200


# -------------------------------------------------------------
# 4. Zones & Routing Table Endpoints
# -------------------------------------------------------------
@app.route("/api/zones", methods=["GET"])
def get_zones():
    """Retrieves all 6 enforcement zones with prefix mappings and report statistics."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT z.*, 
               (SELECT COUNT(*) FROM handlers WHERE zone_id = z.id) AS total_handlers,
               (SELECT COUNT(*) FROM handlers WHERE zone_id = z.id AND is_available = 1) AS available_handlers,
               (SELECT COUNT(*) FROM reports WHERE zone_id = z.id) AS total_reports,
               (SELECT COUNT(*) FROM reports WHERE zone_id = z.id AND status IN ('Assigned', 'In Progress')) AS active_reports
        FROM zones z
        ORDER BY z.id ASC
    """)
    zones = [dict_from_row(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({
        "zones": zones,
        "routing_table": ROUTING_TABLE
    }), 200


# -------------------------------------------------------------
# 5. Live Analytics Endpoint
# -------------------------------------------------------------
@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    """
    Computes comprehensive, real-time analytics directly from SQLite database.
    - Total, pending, assigned, in progress, resolved, waiting queue, central correction counts.
    - Handler capacities and availability.
    - Category distribution (5 categories).
    - Zone-wise violation counts.
    - Daily violation trends.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Overview counters
    cursor.execute("SELECT COUNT(*) AS count FROM reports")
    total_reports = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) AS count FROM reports WHERE status = 'Pending'")
    pending_reports = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) AS count FROM reports WHERE status = 'Assigned'")
    assigned_reports = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) AS count FROM reports WHERE status = 'In Progress'")
    in_progress_reports = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) AS count FROM reports WHERE status = 'Resolved'")
    resolved_reports = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) AS count FROM reports WHERE status = 'Waiting Queue'")
    waiting_queue_reports = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) AS count FROM reports WHERE status = 'Central Correction Queue'")
    central_correction_reports = cursor.fetchone()["count"]

    # Handler statistics
    cursor.execute("SELECT COUNT(*) AS count FROM handlers")
    total_handlers = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) AS count FROM handlers WHERE is_available = 1")
    available_handlers = cursor.fetchone()["count"]

    # Category distribution across 5 predefined categories
    category_counts = {
        "No-Permit": 0,
        "Overstay": 0,
        "Wrong-Zone": 0,
        "Obstruction": 0,
        "Disabled-Bay": 0
    }
    cursor.execute("""
        SELECT violation_category, COUNT(*) AS count 
        FROM reports 
        GROUP BY violation_category
    """)
    for row in cursor.fetchall():
        cat = row["violation_category"]
        if cat in category_counts:
            category_counts[cat] = row["count"]
        else:
            category_counts[cat] = row["count"]

    # Zone-wise report distribution
    cursor.execute("""
        SELECT z.code AS zone, z.team_name AS team, COUNT(r.id) AS count
        FROM zones z
        LEFT JOIN reports r ON z.id = r.zone_id
        GROUP BY z.id
        ORDER BY z.id ASC
    """)
    zone_distribution = [dict_from_row(row) for row in cursor.fetchall()]

    # Daily violation trends (last 7 days or recorded dates)
    cursor.execute("""
        SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS count
        FROM reports
        GROUP BY substr(created_at, 1, 10)
        ORDER BY date ASC
    """)
    daily_trends = [dict_from_row(row) for row in cursor.fetchall()]

    # Priority distribution
    cursor.execute("""
        SELECT priority, COUNT(*) AS count
        FROM reports
        GROUP BY priority
    """)
    priority_distribution = {row["priority"]: row["count"] for row in cursor.fetchall()}

    # Recent violation reports (last 5)
    cursor.execute("""
        SELECT r.*, z.code AS zone_code, h.name AS handler_name
        FROM reports r
        LEFT JOIN zones z ON r.zone_id = z.id
        LEFT JOIN handlers h ON r.assigned_handler_id = h.id
        ORDER BY r.created_at DESC
        LIMIT 6
    """)
    recent_reports = [dict_from_row(row) for row in cursor.fetchall()]

    conn.close()

    resolution_rate = round((resolved_reports / total_reports * 100), 1) if total_reports > 0 else 0.0

    return jsonify({
        "totals": {
            "total_reports": total_reports,
            "pending_reports": pending_reports,
            "assigned_reports": assigned_reports,
            "in_progress_reports": in_progress_reports,
            "resolved_reports": resolved_reports,
            "waiting_queue_reports": waiting_queue_reports,
            "central_correction_reports": central_correction_reports,
            "total_handlers": total_handlers,
            "available_handlers": available_handlers,
            "resolution_rate": resolution_rate
        },
        "category_distribution": category_counts,
        "zone_distribution": zone_distribution,
        "daily_trends": daily_trends,
        "priority_distribution": priority_distribution,
        "recent_reports": recent_reports
    }), 200


# -------------------------------------------------------------
# 6. Static Frontend Delivery (for unified single-port hosting)
# -------------------------------------------------------------
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """Serves compiled React frontend or falls back to index.html for client-side routing."""
    if path.startswith("api/"):
        return jsonify({"error": f"API endpoint '/{path}' not found"}), 404
    if os.path.exists(os.path.join(FRONTEND_DIST, path)) and path != "":
        return send_from_directory(FRONTEND_DIST, path)
    if os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
        return send_from_directory(FRONTEND_DIST, "index.html")
    return jsonify({
        "message": "Parking Violation Tracker API is active. Frontend build not detected. Run 'npm run dev' at http://localhost:5173"
    }), 200


if __name__ == "__main__":
    # Standard Flask development server execution
    app.run(host="127.0.0.1", port=5000, debug=True)
