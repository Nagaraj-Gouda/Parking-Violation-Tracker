"""
database.py - SQLite Database Management for Parking Violation Tracker
Manages database schema, initialization, seed data, and connection utilities.
Uses parameterized queries to prevent SQL injection and preserves existing records.
"""

import os
import sqlite3
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "parking_tracker.db")


def get_db_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    """Creates and returns a connection to the SQLite database with Row factory."""
    path = db_path or DB_PATH
    conn = sqlite3.connect(path, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(db_path: Optional[str] = None) -> None:
    """Initializes the database schema if tables do not exist."""
    path = db_path or DB_PATH
    conn = get_db_connection(path)
    cursor = conn.cursor()

    # 1. zones table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            prefix TEXT NOT NULL UNIQUE,
            team_name TEXT NOT NULL,
            description TEXT
        );
    """)

    # 2. handlers table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS handlers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            handler_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            team_name TEXT NOT NULL,
            zone_id INTEGER NOT NULL,
            role TEXT NOT NULL DEFAULT 'Primary',
            is_available INTEGER NOT NULL DEFAULT 1,
            daily_capacity INTEGER NOT NULL DEFAULT 5,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
        );
    """)

    # 3. reports table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id TEXT NOT NULL UNIQUE,
            vehicle_number TEXT NOT NULL,
            violation_code TEXT NOT NULL,
            violation_category TEXT NOT NULL,
            description TEXT,
            location TEXT NOT NULL,
            zone_id INTEGER,
            assigned_zone_name TEXT,
            priority TEXT NOT NULL,
            status TEXT NOT NULL,
            assigned_handler_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (zone_id) REFERENCES zones(id),
            FOREIGN KEY (assigned_handler_id) REFERENCES handlers(id)
        );
    """)

    # 4. assignments table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL,
            handler_id INTEGER,
            zone_id INTEGER,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            assignment_type TEXT,
            routing_notes TEXT,
            FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
            FOREIGN KEY (handler_id) REFERENCES handlers(id),
            FOREIGN KEY (zone_id) REFERENCES zones(id)
        );
    """)

    # 5. status_history table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS status_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL,
            old_status TEXT,
            new_status TEXT NOT NULL,
            changed_by TEXT DEFAULT 'System',
            comment TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
        );
    """)

    conn.commit()
    seed_initial_data(conn)
    conn.close()


def seed_initial_data(conn: sqlite3.Connection) -> None:
    """Seeds the 6 initial enforcement zones and handlers if the tables are empty."""
    cursor = conn.cursor()

    # Check if zones exist
    cursor.execute("SELECT COUNT(*) AS count FROM zones")
    if cursor.fetchone()["count"] == 0:
        zones_data = [
            ("Zone 1", "KA01", "Team A", "Bangalore Central - MG Road, Brigade Rd, CBD"),
            ("Zone 2", "KA02", "Team B", "Bangalore West - Rajajinagar, Malleshwaram, Yeshwanthpur"),
            ("Zone 3", "KA03", "Team C", "Bangalore East - Indiranagar, Marathahalli, Domlur"),
            ("Zone 4", "KA04", "Team D", "Bangalore North - Hebbal, Yelahanka, Jakkur"),
            ("Zone 5", "KA05", "Team E", "Bangalore South - Jayanagar, JP Nagar, BTM Layout"),
            ("Zone 6", "KA06", "Team F", "Tech Corridor / Rural - Whitefield, Bellandur, Electronic City")
        ]
        cursor.executemany(
            "INSERT INTO zones (code, prefix, team_name, description) VALUES (?, ?, ?, ?)",
            zones_data
        )
        conn.commit()

    # Check if handlers exist
    cursor.execute("SELECT COUNT(*) AS count FROM handlers")
    if cursor.fetchone()["count"] == 0:
        # Retrieve zone IDs
        cursor.execute("SELECT id, code, team_name FROM zones ORDER BY id ASC")
        zones = cursor.fetchall()
        zone_map = {z["code"]: z["id"] for z in zones}

        handlers_data = [
            # Zone 1 - Team A
            ("HND-01", "Inspector Rajesh Kumar", "Team A", zone_map["Zone 1"], "Primary", 1, 5),
            ("HND-02", "Officer Sneha Rao", "Team A", zone_map["Zone 1"], "Backup", 1, 4),
            # Zone 2 - Team B
            ("HND-03", "Inspector Vikram Singh", "Team B", zone_map["Zone 2"], "Primary", 1, 5),
            ("HND-04", "Officer Divya Nair", "Team B", zone_map["Zone 2"], "Backup", 1, 4),
            # Zone 3 - Team C
            ("HND-05", "Inspector Amit Sharma", "Team C", zone_map["Zone 3"], "Primary", 1, 5),
            ("HND-06", "Officer Pooja Patel", "Team C", zone_map["Zone 3"], "Backup", 1, 4),
            # Zone 4 - Team D
            ("HND-07", "Inspector Karthik Gowda", "Team D", zone_map["Zone 4"], "Primary", 1, 5),
            ("HND-08", "Officer Meera Joshi", "Team D", zone_map["Zone 4"], "Backup", 1, 4),
            # Zone 5 - Team E
            ("HND-09", "Inspector Sandeep Patil", "Team E", zone_map["Zone 5"], "Primary", 1, 5),
            ("HND-10", "Officer Ananya Reddy", "Team E", zone_map["Zone 5"], "Backup", 1, 4),
            # Zone 6 - Team F
            ("HND-11", "Inspector Manoj Hegde", "Team F", zone_map["Zone 6"], "Primary", 1, 5),
            ("HND-12", "Officer Kavita Menon", "Team F", zone_map["Zone 6"], "Backup", 1, 4)
        ]

        cursor.executemany(
            """INSERT INTO handlers 
               (handler_id, name, team_name, zone_id, role, is_available, daily_capacity) 
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            handlers_data
        )
        conn.commit()

    # Seed realistic sample reports if reports table is empty
    cursor.execute("SELECT COUNT(*) AS count FROM reports")
    if cursor.fetchone()["count"] == 0:
        seed_sample_reports(conn)


def seed_sample_reports(conn: sqlite3.Connection) -> None:
    """Inserts realistic demonstration reports with past timestamps to demonstrate charts and tables."""
    cursor = conn.cursor()
    cursor.execute("SELECT id, code FROM zones")
    zones = {z["code"]: z["id"] for z in cursor.fetchall()}

    cursor.execute("SELECT id, handler_id FROM handlers")
    handlers = {h["handler_id"]: h["id"] for h in cursor.fetchall()}

    now = datetime.now()
    d1 = (now - timedelta(days=3)).strftime("%Y-%m-%d 09:30:00")
    d2 = (now - timedelta(days=2)).strftime("%Y-%m-%d 11:15:00")
    d3 = (now - timedelta(days=1)).strftime("%Y-%m-%d 14:00:00")
    d4 = now.strftime("%Y-%m-%d 10:20:00")
    d5 = now.strftime("%Y-%m-%d 12:45:00")

    sample_reports = [
        ("PVR-20261110-1001", "KA01AB1234", "PV01", "No-Permit", "Parked in commercial permit bay without valid pass.", "MG Road, Near Metro Pillar 42", zones["Zone 1"], "Zone 1", "Medium", "Resolved", handlers["HND-01"], d1, d1),
        ("PVR-20261111-1002", "KA02CD5678", "PV04", "Obstruction", "Blocking fire hydrant and building delivery entrance.", "Rajajinagar 1st Block Main Rd", zones["Zone 2"], "Zone 2", "Emergency / Critical", "Resolved", handlers["HND-03"], d2, d2),
        ("PVR-20261112-1003", "KA03EF9012", "PV02", "Overstay", "Exceeded 2-hour parking limit by over 3 hours.", "100 Feet Road, Indiranagar", zones["Zone 3"], "Zone 3", "Low", "In Progress", handlers["HND-05"], d3, d3),
        ("PVR-20261113-1004", "KA04GH3456", "PV05", "Disabled-Bay", "Unauthorized car in hospital accessible parking spot.", "Hebbal Baptist Hospital bay #2", zones["Zone 4"], "Zone 4", "High", "Assigned", handlers["HND-07"], d4, d4),
        ("PVR-20261113-1005", "KA05JK7890", "PV03", "Wrong-Zone", "Commercial vehicle parked in Zone 5 resident sector.", "Jayanagar 4th Block 9th Main", zones["Zone 5"], "Zone 5", "Medium", "Assigned", handlers["HND-09"], d4, d4),
        ("PVR-20261113-1006", "KA06MN1122", "PV01", "No-Permit", "Unregistered vehicle in IT park visitor zone.", "Whitefield Main Rd ITPL Gate 3", zones["Zone 6"], "Zone 6", "Low", "Pending", None, d5, d5),
        ("PVR-20261113-1007", "MH02XY9999", "PV04", "Obstruction", "Out-of-state vehicle double parked on narrow street.", "Outer Ring Road junction", None, "Unknown Zone", "High", "Central Correction Queue", None, d5, d5)
    ]

    for r in sample_reports:
        cursor.execute("""
            INSERT INTO reports 
            (report_id, vehicle_number, violation_code, violation_category, description, location, 
             zone_id, assigned_zone_name, priority, status, assigned_handler_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, r)
        rep_id = cursor.lastrowid

        # Insert status history
        cursor.execute("""
            INSERT INTO status_history (report_id, old_status, new_status, changed_by, comment, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (rep_id, None, r[9], "System Dispatcher", "Initial report ingestion and routing", r[11]))

        # Insert assignment if handler was assigned
        if r[10] is not None:
            cursor.execute("""
                INSERT INTO assignments (report_id, handler_id, zone_id, assigned_at, assignment_type, routing_notes)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (rep_id, r[10], r[6], r[11], "Primary", "Initial automated assignment"))

    conn.commit()


def dict_from_row(row: sqlite3.Row) -> Dict[str, Any]:
    """Helper to convert sqlite3.Row to dictionary."""
    return dict(row) if row else {}
