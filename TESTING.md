# PART 4 – TESTING AND INTEGRATION REPORT

**Project:** P14 – Parking Violation Tracker  
**Validation Engine:** Character-by-character DFA + Python `re.fullmatch()`  
**Dispatch Engine:** 6-Zone Vehicle-Prefix Routing Engine  
**Database:** SQLite 3  
**Test Harness:** `pytest 8.3.4` on Python 3.13.17  
**Test Suite File:** [`backend/tests/test_tracker.py`](file:///c:/Users/nagar/OneDrive/Desktop/Parking-Violation-Tracker/backend/tests/test_tracker.py)  
**Overall Execution Result:** 20 Passed / 0 Failed (100% Pass Rate)

---

## 1. Test Summary Overview

| Category | Total Tests | Passed | Failed | Success Rate |
| :--- | :---: | :---: | :---: | :---: |
| **Part A: Automata Theory Validation** | 6 | 6 | 0 | 100% |
| **Part B: Computer Networks & Routing** | 6 | 6 | 0 | 100% |
| **Part C: Database & Workflow Persistence** | 4 | 4 | 0 | 100% |
| **Part D: REST API & Integration Health** | 4 | 4 | 0 | 100% |
| **Total** | **20** | **20** | **0** | **100%** |

---

## 2. Detailed Test Cases and Execution Results

### Test Case 1: Valid Vehicle Number
* **Objective:** Ensure legitimate Indian registration numbers pass DFA and Regex validation.
* **Input Data:** `KA01AB1234`, `KA02A5678`, `MH12DE9999`, `DL04C1001`, `KA05XY0001`
* **Expected Result:** `valid: True`, `dfa_result: True`, `regex_result: True`
* **Actual Result:** All 5 valid strings transitioned into DFA accept state $q_{10}$ and matched `[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}`.
* **Status:** **PASS**

### Test Case 2: Invalid Vehicle Number
* **Objective:** Ensure malformed inputs (lowercase, improper lengths, invalid symbols) are rejected without silent auto-correction.
* **Input Data:** `ka01ab1234`, `KA1AB1234`, `KA01ABC1234`, `KA011234`, `KA01AB123`, `KA01AB12345`, `KA-01-AB-1234`, `""`
* **Expected Result:** `valid: False`, transition trapped in `STATE_DEAD (-1)` or stopped before $q_{10}$.
* **Actual Result:** Every malformed candidate was trapped in dead state with descriptive transition diagnostic.
* **Status:** **PASS**

### Test Case 3: Valid Violation Code
* **Objective:** Validate official parking violation codes (`PV01` through `PV05`).
* **Input Data:** `PV01`, `PV02`, `PV03`, `PV04`, `PV05`
* **Expected Result:** `is_valid: True`, mapped category name returned.
* **Actual Result:** Correctly mapped:
  - `PV01` $\to$ `No-Permit`
  - `PV02` $\to$ `Overstay`
  - `PV03` $\to$ `Wrong-Zone`
  - `PV04` $\to$ `Obstruction`
  - `PV05` $\to$ `Disabled-Bay`
* **Status:** **PASS**

### Test Case 4: Invalid Violation Code Format
* **Objective:** Reject violation codes violating the `^PV[0-9]{2}$` syntax.
* **Input Data:** `PV1`, `P01`, `PV001`, `pv01`, `AB01`, `PVXX`, `""`
* **Expected Result:** `is_valid: False`, category `None`, descriptive syntax error.
* **Actual Result:** Rejected with `Malformed violation code: expected 'PV' followed by two digits`.
* **Status:** **PASS**

### Test Case 5: Unknown but Correctly Formatted Violation Code
* **Objective:** Reject correctly formatted codes that have no mapping in the classification table.
* **Input Data:** `PV06`, `PV07`, `PV10`, `PV99`
* **Expected Result:** Syntax valid but rejected with error `Unknown violation code`.
* **Actual Result:** Returned `(False, "Unknown violation code 'PV06': syntax is valid but code is not mapped to any known category.", None)`.
* **Status:** **PASS**

### Test Case 6: DFA and Regex Strict Agreement
* **Objective:** Confirm mathematical equivalence between character-by-character DFA evaluation and `re.fullmatch()`.
* **Input Data:** Comprehensive test vector with 10 boundary and edge-case strings.
* **Expected Result:** `dfa_result == regex_result` and `agreement == True` across all test strings.
* **Actual Result:** 100% agreement across all test inputs.
* **Status:** **PASS**

### Test Case 7: Empty Report Submission Validation
* **Objective:** Verify backend API rejects payloads with missing or whitespace-only mandatory fields.
* **Input Data:** `POST /api/reports` with `{}` and `{"vehicle_number": ""}`.
* **Expected Result:** HTTP 400 Bad Request with field validation error message.
* **Actual Result:** HTTP 400 returned with `{"error": "Vehicle registration number is required."}`.
* **Status:** **PASS**

### Test Case 8: Successful Report Submission
* **Objective:** Verify end-to-end report creation via REST API.
* **Input Data:** `vehicle_number: "KA01MN4567"`, `violation_code: "PV01"`, `location: "MG Road"`, `priority: "High"`
* **Expected Result:** HTTP 201 Created, assigned unique report ID starting with `PVR-`, status `Assigned`.
* **Actual Result:** Report created, assigned ID `PVR-YYYYMMDD-XXXX`, correctly mapped to Zone 1 (Team A).
* **Status:** **PASS**

### Test Case 9: Correct Violation Classification
* **Objective:** Verify all 5 categories return proper titles, fine amounts, and default severity levels.
* **Input Data:** Function call `classify_violation()` across all 5 codes.
* **Expected Result:** Metadata dictionaries populated accurately.
* **Actual Result:** All 5 categories returned exact expected dictionary attributes.
* **Status:** **PASS**

### Test Case 10: Correct Zone Identification
* **Objective:** Verify 4-character vehicle prefix extraction and zone identification.
* **Input Data:** `KA01` to `KA06` prefixes.
* **Expected Result:**
  - `KA01` $\to$ Zone 1 (Team A)
  - `KA02` $\to$ Zone 2 (Team B)
  - `KA03` $\to$ Zone 3 (Team C)
  - `KA04` $\to$ Zone 4 (Team D)
  - `KA05` $\to$ Zone 5 (Team E)
  - `KA06` $\to$ Zone 6 (Team F)
* **Actual Result:** Exact zone code and team name resolved for all 6 prefixes.
* **Status:** **PASS**

### Test Case 11: Handler Availability Toggle
* **Objective:** Verify setting `is_available` to 0 (off-duty) and 1 (on-duty) updates the database.
* **Input Data:** `PUT /api/handlers/<id>/availability`
* **Expected Result:** HTTP 200 with updated availability flag reflected in database.
* **Actual Result:** Successfully toggled between on-duty and off-duty states.
* **Status:** **PASS**

### Test Case 12: Handler Daily Capacity Enforcement
* **Objective:** Ensure active assignments cannot exceed a handler's `daily_capacity`.
* **Input Data:** Populate 5 active assignments for handler with capacity 5.
* **Expected Result:** Handler active count equals 5, `is_at_capacity: True`.
* **Actual Result:** Active count measured directly from database matches capacity limit; prevent overload confirmed.
* **Status:** **PASS**

### Test Case 13: Priority-Based Assignment
* **Objective:** Verify reports in the Waiting Queue are processed in strict priority order.
* **Input Data:** Two queued reports: Report A (`Low`), Report B (`Emergency / Critical`).
* **Expected Result:** Report B is dispatched first when capacity becomes available.
* **Actual Result:** `process_waiting_queue()` prioritized `Emergency / Critical` report first.
* **Status:** **PASS**

### Test Case 14: Backup Handler Assignment Failover
* **Objective:** If Primary handler in a zone is unavailable, automatically assign Backup handler.
* **Input Data:** Set Zone 2 Primary handler `is_available = 0`, submit report for `KA02XY1234`.
* **Expected Result:** Report assigned to Zone 2 Backup handler with role logged as `Backup`.
* **Actual Result:** Assigned to `Officer Divya Nair (HND-04) - Backup`.
* **Status:** **PASS**

### Test Case 15: Report Status Update Workflow
* **Objective:** Verify report status transition through `Assigned` $\to$ `In Progress` $\to$ `Resolved`.
* **Input Data:** `PUT /api/reports/<id>/status`
* **Expected Result:** HTTP 200, status updated, entry appended to `status_history`.
* **Actual Result:** Status successfully advanced; status history audit trail recorded with timestamp.
* **Status:** **PASS**

### Test Case 16: Duplicate Assignment Prevention
* **Objective:** Prevent an already assigned active report from being routed twice.
* **Input Data:** Call `route_and_assign_report()` on report already in `Assigned` status.
* **Expected Result:** Rejection with `success: False`, warning that report is already assigned.
* **Actual Result:** Duplicate dispatch prevented cleanly.
* **Status:** **PASS**

### Test Case 17: Unknown Zone Central Correction Queue
* **Objective:** Out-of-state or unmapped vehicle prefixes must route to Central Correction Queue.
* **Input Data:** Vehicle numbers `DL01AB9999`, `MH02XY1234`.
* **Expected Result:** Status set to `Central Correction Queue`, `assigned_handler_id = NULL`.
* **Actual Result:** Successfully placed in Central Correction Queue with escalation notes for manual review.
* **Status:** **PASS**

### Test Case 18: Database Persistence
* **Objective:** Ensure SQLite transactions persist across fresh connection handles.
* **Input Data:** Insert report on connection 1, read back on connection 2.
* **Expected Result:** Record retrieved intact.
* **Actual Result:** Row retrieved with all columns intact.
* **Status:** **PASS**

### Test Case 19: Analytics API
* **Objective:** Validate calculation of live statistics from SQLite.
* **Input Data:** `GET /api/analytics`
* **Expected Result:** JSON object containing `totals`, `category_distribution`, `zone_distribution`, `daily_trends`.
* **Actual Result:** Returns calculated counts directly from SQLite tables.
* **Status:** **PASS**

### Test Case 20: Frontend-Backend Integration Health
* **Objective:** Verify health check and metadata APIs required by the React application.
* **Input Data:** `GET /api/health`, `GET /api/zones`, `GET /api/categories`.
* **Expected Result:** HTTP 200 with operational statuses and 6 zones.
* **Actual Result:** All endpoints healthy and responding with correct JSON schemas.
* **Status:** **PASS**

---

## 3. How to Run the Automated Tests

To execute the test suite independently:

```powershell
# Set environment flag to disable external plugins and execute pytest
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD = "1"
python -m pytest "c:\Users\nagar\OneDrive\Desktop\Parking-Violation-Tracker\backend\tests\test_tracker.py" -v
```
