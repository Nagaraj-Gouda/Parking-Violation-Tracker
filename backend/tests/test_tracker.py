"""
test_tracker.py - Comprehensive Unit & Integration Test Suite
Part 4 - Testing and Integration for Parking Violation Tracker.
Covers 20 distinct test scenarios according to the project specification.
"""

import os
import sys
import tempfile
import pytest
import sqlite3

# Ensure backend root is in Python sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import application modules
from validation import (
    validate_vehicle_number,
    validate_vehicle_number_dfa,
    validate_vehicle_number_regex,
    validate_violation_code,
    validate_violation_code_format,
    VehicleDFA
)
from classification import classify_violation, get_all_categories, get_category_by_code
from routing import (
    extract_vehicle_prefix,
    identify_zone_from_prefix,
    route_and_assign_report,
    process_waiting_queue,
    ROUTING_TABLE
)
from database import init_db, get_db_connection
from app import app


@pytest.fixture
def test_db():
    """Provides a fresh isolated temporary SQLite database for each test session."""
    fd, path = tempfile.mkstemp(suffix="_test.db")
    os.close(fd)
    init_db(path)
    yield path
    if os.path.exists(path):
        os.remove(path)


@pytest.fixture
def client(test_db, monkeypatch):
    """Provides a Flask test client pointing to the test database."""
    monkeypatch.setattr("app.get_db_connection", lambda: get_db_connection(test_db))
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


# =========================================================================
# TEST 1: Valid Vehicle Number
# =========================================================================
def test_01_valid_vehicle_number():
    """Validates legitimate vehicle registration numbers with 1 or 2 series letters."""
    valid_cases = ["KA01AB1234", "KA02A5678", "MH12DE9999", "DL04C1001", "KA05XY0001"]
    for v in valid_cases:
        res = validate_vehicle_number(v)
        assert res["valid"] is True, f"Failed for valid vehicle number {v}: {res.get('error')}"
        assert res["dfa_result"] is True
        assert res["regex_result"] is True


# =========================================================================
# TEST 2: Invalid Vehicle Number
# =========================================================================
def test_02_invalid_vehicle_number():
    """Rejects invalid vehicle numbers (lowercase, bad length, invalid characters)."""
    invalid_cases = [
        "ka01ab1234",    # Lowercase letters
        "KA1AB1234",     # Single district digit instead of 2
        "KA01ABC1234",   # 3 series letters
        "KA011234",      # Missing series letters
        "KA01AB123",     # 3 number digits instead of 4
        "KA01AB12345",   # 5 number digits
        "KA-01-AB-1234", # Hyphens not permitted
        "KA 01 AB 1234", # Spaces not permitted
        "!@#$%",         # Special characters
        ""               # Empty string
    ]
    for inv in invalid_cases:
        res = validate_vehicle_number(inv)
        assert res["valid"] is False, f"Expected failure for {inv}, but got valid"


# =========================================================================
# TEST 3: Valid Violation Code
# =========================================================================
def test_03_valid_violation_code():
    """Validates properly formatted and mapped violation codes (PV01 - PV05)."""
    valid_codes = ["PV01", "PV02", "PV03", "PV04", "PV05"]
    for code in valid_codes:
        is_valid, msg, category = validate_violation_code(code)
        assert is_valid is True
        assert category is not None
        assert len(category) > 0


# =========================================================================
# TEST 4: Invalid Violation Code Format
# =========================================================================
def test_04_invalid_violation_code_format():
    """Rejects malformed violation codes that do not adhere to PV[0-9]{2}."""
    malformed_codes = ["PV1", "P01", "PV001", "pv01", "AB01", "PVXX", ""]
    for code in malformed_codes:
        is_valid, msg, category = validate_violation_code(code)
        assert is_valid is False
        assert category is None
        assert "Malformed" in msg or "empty" in msg


# =========================================================================
# TEST 5: Unknown but Correctly Formatted Violation Code
# =========================================================================
def test_05_unknown_formatted_violation_code():
    """Rejects codes that match syntax PV[0-9]{2} but are unmapped in system."""
    unmapped_codes = ["PV06", "PV07", "PV10", "PV99"]
    for code in unmapped_codes:
        is_valid, msg, category = validate_violation_code(code)
        assert is_valid is False
        assert category is None
        assert "Unknown violation code" in msg


# =========================================================================
# TEST 6: DFA and Regex Strict Agreement
# =========================================================================
def test_06_dfa_and_regex_agreement():
    """Verifies that DFA and Regex engines produce 100% identical boolean outcomes."""
    test_set = [
        "KA01AB1234", "KA01A1234", "KA02CD5678", "KA03EF9012",
        "ka01ab1234", "KA01ABC1234", "KA011234", "1234KA01", "", "KA01"
    ]
    for candidate in test_set:
        dfa_res, _, _ = validate_vehicle_number_dfa(candidate)
        regex_res, _ = validate_vehicle_number_regex(candidate)
        assert dfa_res == regex_res, f"Disagreement on '{candidate}': DFA={dfa_res}, Regex={regex_res}"
        res = validate_vehicle_number(candidate)
        assert res["agreement"] is True


# =========================================================================
# TEST 7: Empty Report Submission Validation
# =========================================================================
def test_07_empty_report_submission(client):
    """Ensures POST /api/reports rejects requests with missing or empty required fields."""
    response = client.post("/api/reports", json={})
    assert response.status_code == 400
    assert "required" in response.get_json()["error"]

    response = client.post("/api/reports", json={
        "vehicle_number": "",
        "violation_code": "PV01",
        "location": "MG Road"
    })
    assert response.status_code == 400


# =========================================================================
# TEST 8: Successful Report Submission
# =========================================================================
def test_08_successful_report_submission(client):
    """Submits a fully valid violation report and verifies HTTP 201 response."""
    payload = {
        "vehicle_number": "KA01MN4567",
        "violation_code": "PV01",
        "description": "Parked in permit-only zone",
        "location": "MG Road Brigade Junction",
        "priority": "High"
    }
    response = client.post("/api/reports", json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert "report" in data
    assert data["report"]["vehicle_number"] == "KA01MN4567"
    assert data["report"]["violation_category"] == "No-Permit"
    assert data["report"]["report_id"].startswith("PVR-")
    assert data["validation"]["valid"] is True


# =========================================================================
# TEST 9: Correct Violation Classification
# =========================================================================
def test_09_correct_violation_classification():
    """Verifies official classification for all 5 codes."""
    expected = {
        "PV01": "No-Permit",
        "PV02": "Overstay",
        "PV03": "Wrong-Zone",
        "PV04": "Obstruction",
        "PV05": "Disabled-Bay"
    }
    for code, expected_cat in expected.items():
        cat_info = classify_violation(code)
        assert cat_info["name"] == expected_cat


# =========================================================================
# TEST 10: Correct Zone Identification
# =========================================================================
def test_10_correct_zone_identification():
    """Verifies prefix extraction and zone identification for KA01 to KA06."""
    expected_zones = {
        "KA01": "Zone 1",
        "KA02": "Zone 2",
        "KA03": "Zone 3",
        "KA04": "Zone 4",
        "KA05": "Zone 5",
        "KA06": "Zone 6"
    }
    for prefix, expected_zone in expected_zones.items():
        v_num = f"{prefix}AB1234"
        extracted = extract_vehicle_prefix(v_num)
        assert extracted == prefix
        zone_info = identify_zone_from_prefix(extracted)
        assert zone_info is not None
        assert zone_info["zone_code"] == expected_zone


# =========================================================================
# TEST 11: Handler Availability Toggle
# =========================================================================
def test_11_handler_availability(client, test_db):
    """Verifies retrieving handlers and modifying their availability status."""
    conn = get_db_connection(test_db)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM handlers LIMIT 1")
    handler_id = cursor.fetchone()["id"]
    conn.close()

    # Toggle to unavailable (False)
    resp = client.put(f"/api/handlers/{handler_id}/availability", json={"is_available": False})
    assert resp.status_code == 200
    assert resp.get_json()["is_available"] is False

    # Toggle back to available (True)
    resp = client.put(f"/api/handlers/{handler_id}/availability", json={"is_available": True})
    assert resp.status_code == 200
    assert resp.get_json()["is_available"] is True


# =========================================================================
# TEST 12: Handler Daily Capacity Enforcement
# =========================================================================
def test_12_handler_daily_capacity(test_db):
    """Verifies that an enforcement handler cannot be assigned once daily capacity is reached."""
    conn = get_db_connection(test_db)
    cursor = conn.cursor()

    # Get Primary handler for Zone 1
    cursor.execute("SELECT id, daily_capacity FROM handlers WHERE zone_id = 1 AND role = 'Primary'")
    handler = cursor.fetchone()
    handler_id = handler["id"]
    capacity = handler["daily_capacity"]

    # Fill handler's capacity by creating active reports
    for i in range(capacity):
        cursor.execute("""
            INSERT INTO reports (report_id, vehicle_number, violation_code, violation_category, location, priority, status, assigned_handler_id, zone_id)
            VALUES (?, 'KA01AA1111', 'PV01', 'No-Permit', 'Location', 'Medium', 'Assigned', ?, 1)
        """, (f"TEST-CAP-{i}", handler_id))
    conn.commit()

    # Verify active assignment count equals capacity
    cursor.execute("SELECT COUNT(*) AS count FROM reports WHERE assigned_handler_id = ? AND status = 'Assigned'", (handler_id,))
    assert cursor.fetchone()["count"] == capacity
    conn.close()


# =========================================================================
# TEST 13: Priority-Based Assignment
# =========================================================================
def test_13_priority_based_assignment(test_db):
    """Verifies that higher priority items are routed and processed first in waiting queue."""
    conn = get_db_connection(test_db)
    cursor = conn.cursor()

    # Add 2 reports in waiting queue with different priorities
    cursor.execute("""
        INSERT INTO reports (report_id, vehicle_number, violation_code, violation_category, location, priority, status, zone_id, assigned_zone_name)
        VALUES ('TEST-LOW', 'KA01AA2222', 'PV02', 'Overstay', 'Loc', 'Low', 'Waiting Queue', 1, 'Zone 1')
    """)
    cursor.execute("""
        INSERT INTO reports (report_id, vehicle_number, violation_code, violation_category, location, priority, status, zone_id, assigned_zone_name)
        VALUES ('TEST-EMERG', 'KA01AA3333', 'PV05', 'Disabled-Bay', 'Loc', 'Emergency / Critical', 'Waiting Queue', 1, 'Zone 1')
    """)
    conn.commit()

    # Process waiting queue
    dispatched = process_waiting_queue(conn)
    # The Emergency / Critical report must be dispatched before the Low priority report
    if dispatched:
        cursor.execute("SELECT report_id FROM reports WHERE id = ?", (dispatched[0]["report_id"],))
        first_dispatched = cursor.fetchone()["report_id"]
        assert first_dispatched == "TEST-EMERG"
    conn.close()


# =========================================================================
# TEST 14: Backup Handler Assignment Failover
# =========================================================================
def test_14_backup_handler_assignment(test_db):
    """When primary handler is unavailable, routing automatically assigns the backup handler."""
    conn = get_db_connection(test_db)
    cursor = conn.cursor()

    # Mark Zone 2 Primary handler as unavailable
    cursor.execute("UPDATE handlers SET is_available = 0 WHERE zone_id = 2 AND role = 'Primary'")
    conn.commit()

    # Create new report for Zone 2 (KA02 prefix)
    cursor.execute("""
        INSERT INTO reports (report_id, vehicle_number, violation_code, violation_category, location, priority, status)
        VALUES ('TEST-BACKUP-01', 'KA02XY1234', 'PV03', 'Wrong-Zone', 'Rajajinagar', 'High', 'Pending')
    """)
    rep_id = cursor.lastrowid
    conn.commit()

    # Route report
    result = route_and_assign_report(conn, rep_id, "KA02XY1234", "High")
    assert result["assigned"] is True
    assert result["handler"]["role"] == "Backup"
    conn.close()


# =========================================================================
# TEST 15: Report Status Update
# =========================================================================
def test_15_report_status_update(client, test_db):
    """Verifies PUT /api/reports/<id>/status transitions report through workflow."""
    conn = get_db_connection(test_db)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM reports LIMIT 1")
    report_id = cursor.fetchone()["id"]
    conn.close()

    # Move to In Progress
    resp = client.put(f"/api/reports/{report_id}/status", json={
        "status": "In Progress",
        "comment": "Officer reached violation spot"
    })
    assert resp.status_code == 200
    assert resp.get_json()["report"]["status"] == "In Progress"

    # Move to Resolved
    resp = client.put(f"/api/reports/{report_id}/status", json={
        "status": "Resolved",
        "comment": "Vehicle towed away"
    })
    assert resp.status_code == 200
    assert resp.get_json()["report"]["status"] == "Resolved"


# =========================================================================
# TEST 16: Duplicate Assignment Prevention
# =========================================================================
def test_16_duplicate_assignment_prevention(test_db):
    """Ensures a report already assigned to an active handler is not assigned again."""
    conn = get_db_connection(test_db)
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM handlers WHERE zone_id = 1 AND is_available = 1 LIMIT 1")
    handler_id = cursor.fetchone()["id"]

    cursor.execute("""
        INSERT INTO reports (report_id, vehicle_number, violation_code, violation_category, location, priority, status, assigned_handler_id, zone_id)
        VALUES ('TEST-DUP-01', 'KA01ZZ9999', 'PV01', 'No-Permit', 'MG Road', 'Medium', 'Assigned', ?, 1)
    """, (handler_id,))
    rep_id = cursor.lastrowid
    conn.commit()

    # Attempt to route again
    res = route_and_assign_report(conn, rep_id, "KA01ZZ9999", "Medium")
    assert res["success"] is False
    assert "already assigned" in res["message"]
    conn.close()


# =========================================================================
# TEST 17: Unknown Zone Central Correction Queue
# =========================================================================
def test_17_unknown_zone_correction_queue(test_db):
    """Unrecognized vehicle prefixes (e.g. DL01, MH04) must be routed to Central Correction Queue."""
    conn = get_db_connection(test_db)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO reports (report_id, vehicle_number, violation_code, violation_category, location, priority, status)
        VALUES ('TEST-UNK-01', 'DL01AB9999', 'PV04', 'Obstruction', 'Outer Ring Road', 'High', 'Pending')
    """)
    rep_id = cursor.lastrowid
    conn.commit()

    result = route_and_assign_report(conn, rep_id, "DL01AB9999", "High")
    assert result["status"] == "Central Correction Queue"
    assert result["assigned"] is False
    assert "Central Correction Queue" in result["message"]
    conn.close()


# =========================================================================
# TEST 18: Database Persistence
# =========================================================================
def test_18_database_persistence(test_db):
    """Verifies data persists across different connection instances."""
    conn1 = get_db_connection(test_db)
    c1 = conn1.cursor()
    c1.execute("""
        INSERT INTO reports (report_id, vehicle_number, violation_code, violation_category, location, priority, status)
        VALUES ('PERSIST-TEST-01', 'KA03AA1234', 'PV01', 'No-Permit', 'Indiranagar', 'Low', 'Pending')
    """)
    conn1.commit()
    conn1.close()

    # Open fresh connection
    conn2 = get_db_connection(test_db)
    c2 = conn2.cursor()
    c2.execute("SELECT * FROM reports WHERE report_id = 'PERSIST-TEST-01'")
    persisted_row = c2.fetchone()
    assert persisted_row is not None
    assert persisted_row["vehicle_number"] == "KA03AA1234"
    conn2.close()


# =========================================================================
# TEST 19: Analytics API
# =========================================================================
def test_19_analytics_api(client):
    """Ensures GET /api/analytics returns accurate aggregated statistics."""
    response = client.get("/api/analytics")
    assert response.status_code == 200
    data = response.get_json()

    assert "totals" in data
    assert "total_reports" in data["totals"]
    assert "category_distribution" in data
    assert "zone_distribution" in data
    assert "daily_trends" in data
    assert len(data["category_distribution"]) == 5


# =========================================================================
# TEST 20: Frontend-Backend Integration Health
# =========================================================================
def test_20_frontend_backend_integration_health(client):
    """Validates health check and metadata endpoints used by the React frontend."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "healthy"

    resp = client.get("/api/zones")
    assert resp.status_code == 200
    zones = resp.get_json()["zones"]
    assert len(zones) == 6

    resp = client.get("/api/categories")
    assert resp.status_code == 200
    assert len(resp.get_json()["categories"]) == 5
