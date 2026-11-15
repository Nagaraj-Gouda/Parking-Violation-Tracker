# PARKING VIOLATION TRACKER (PROJECT P14)

A professional, responsive, full-stack Parking Violation Tracker web application integrating **Automata Theory (DFA + Regular Expressions)** for vehicle registration validation, **Computer Networks (Prefix-Based Routing & Queueing)** for enforcement dispatch, **Flask REST APIs with SQLite persistence**, and a **React + Vite dashboard with Chart.js analytics**.

Designed and implemented to satisfy **Part 3 (Frontend & Web Application Development)** and **Part 4 (Testing & Integration)** of the Academic P14 Assignment.

---

## 1. Key Features & Academic Highlights

### A. Part A – Automata Theory Integration (`validation.py`)
* **Vehicle Registration DFA:** Implements a formal Deterministic Finite Automaton $M = (Q, \Sigma, \delta, q_0, F)$ that validates Indian registration plates character-by-character.
  * States: $q_0$ (Start) through $q_{10}$ (Accept) and $q_{dead}$ (Trap).
  * Formal Alphabet: $\Sigma = \{A\text{-}Z, 0\text{-}9\}$.
  * Pattern: `[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}`.
* **Regular Expression Engine:** Evaluates inputs using Python's `re.fullmatch()`.
* **Automata Agreement Verification:** Automatically compares DFA and Regex outcomes. Submissions are rejected if either engine fails or if they disagree.
* **Violation Code Validation:** Strict verification of syntax `PV[0-9]{2}`.
* **Strict Malformed Input Handling:** Rejects lowercase letters, empty strings, invalid lengths, and unmapped violation codes without silent conversion.

### B. Part B – Computer Networks Integration (`routing.py`)
* **6-Zone Prefix Routing Table:**
  | Prefix | Enforcement Zone | Assigned Team | Coverage Area |
  | :--- | :--- | :--- | :--- |
  | **KA01** | Zone 1 | Team A | Bangalore Central - MG Road, Brigade Rd, CBD |
  | **KA02** | Zone 2 | Team B | Bangalore West - Rajajinagar, Malleshwaram |
  | **KA03** | Zone 3 | Team C | Bangalore East - Indiranagar, Marathahalli |
  | **KA04** | Zone 4 | Team D | Bangalore North - Hebbal, Yelahanka |
  | **KA05** | Zone 5 | Team E | Bangalore South - Jayanagar, JP Nagar |
  | **KA06** | Zone 6 | Team F | Tech Corridor - Whitefield, Bellandur |
* **Priority Dispatch Hierarchy:**
  1. `Emergency / Critical`
  2. `High`
  3. `Medium`
  4. `Low`
* **Automated Handler Failover:** Evaluates Primary handler first. If offline or at daily capacity, automatically re-routes to Backup handler.
* **Capacity Throttling:** Enforces daily workload limits per officer directly calculated from active database records.
* **Waiting Queue:** Buffers reports when all handlers in a zone are at maximum capacity, auto-dispatching the highest-priority reports once capacity frees up.
* **Central Correction Queue:** Isolates unrecognized or out-of-state vehicle prefixes (e.g. `DL`, `MH`, `KA07`) for manual administrative dispatch.
* **Duplicate Prevention:** Prevents re-assignment of active incidents.

### C. Frontend Web Application (React + Vite + Bootstrap 5)
* **Overview Dashboard (`/`):** Summary KPI cards, live resolution rate, Chart.js zone bar chart, category doughnut chart, daily trend line chart, and recent violations table.
* **Report Submission (`/submit`):** Form with live DFA character-by-character trace inspector, real-time regex feedback, category auto-classification, and instant routing preview.
* **User Dashboard (`/reports`):** Search by vehicle, report ID, or location; filter by status, zone, category, and priority.
* **Handler Dashboard (`/handlers`):** Officer roster with daily load capacity bars (e.g., 3/5), on-duty/off-duty switches, and action buttons to accept assignments, mark in progress, or resolve violations.
* **Routing Management (`/routing`):** Visual 6-zone routing table, real-time Waiting Queue, and Central Correction Queue with modal reassignment controls.
* **Analytics Dashboard (`/analytics`):** Interactive Chart.js charts backed directly by SQLite queries.

---

## 2. Project Directory Structure

```
Parking-Violation-Tracker/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatisticsCard.jsx
│   │   │   ├── ReportTable.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   ├── LoadingIndicator.jsx
│   │   │   └── ReportDetailModal.jsx
│   │   ├── pages/
│   │   │   ├── OverviewDashboard.jsx
│   │   │   ├── SubmitReportPage.jsx
│   │   │   ├── UserDashboard.jsx
│   │   │   ├── HandlerDashboard.jsx
│   │   │   ├── RoutingDashboard.jsx
│   │   │   └── AnalyticsDashboard.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── validation.py
│   ├── classification.py
│   ├── routing.py
│   ├── parking_tracker.db
│   ├── requirements.txt
│   └── tests/
│       └── test_tracker.py
│
├── README.md
├── TESTING.md
└── .gitignore
```

---

## 3. Technology Stack

* **Frontend:** React 18, Vite 6, Bootstrap 5.3, Bootstrap Icons, React Router DOM 6, Chart.js 4, react-chartjs-2.
* **Backend:** Python 3.13, Flask 3.1, Flask-CORS 5.0, SQLite3.
* **Testing:** Pytest 8.3.4 (20 comprehensive automated test scenarios).

---

## 4. Installation & Setup Instructions

### Prerequisites
* **Python 3.10+** (Python 3.13 verified)
* **Node.js 18+** & **npm 9+** (Node v26.12 & npm 11.20 verified)

### Step 1: Install Backend Dependencies
Open PowerShell or Terminal and navigate to the project root:

```powershell
cd c:\Users\nagar\OneDrive\Desktop\Parking-Violation-Tracker\backend
python -m pip install -r requirements.txt
```

### Step 2: Install Frontend Dependencies
Navigate to the frontend folder and install npm packages:

```powershell
cd c:\Users\nagar\OneDrive\Desktop\Parking-Violation-Tracker\frontend
npm install
```

---

## 5. Running the Application

### Option A: Independent Dev Servers (Recommended for Development)

#### 1. Start the Flask Backend Server
In the first terminal:
```powershell
cd c:\Users\nagar\OneDrive\Desktop\Parking-Violation-Tracker\backend
python app.py
```
* Backend starts at: **`http://127.0.0.1:5000`**
* Health check: `http://127.0.0.1:5000/api/health`

#### 2. Start the React Frontend Dev Server
In a second terminal:
```powershell
cd c:\Users\nagar\OneDrive\Desktop\Parking-Violation-Tracker\frontend
npm run dev
```
* Frontend starts at: **`http://localhost:5173`**
* Automatically proxies `/api/*` calls to Flask on port 5000.

---

### Option B: Unified Single-Server Mode (Production / College Demonstration)
The Flask backend has been configured to serve the production-built React application directly from `frontend/dist`:

1. Build the frontend (already compiled):
   ```powershell
   cd c:\Users\nagar\OneDrive\Desktop\Parking-Violation-Tracker\frontend
   npm run build
   ```
2. Start Flask:
   ```powershell
   cd c:\Users\nagar\OneDrive\Desktop\Parking-Violation-Tracker\backend
   python app.py
   ```
3. Open your browser to: **`http://localhost:5000`**  
   The entire full-stack application (frontend + backend + SQLite) will run unified on port 5000!

---

## 6. Running Automated Tests

Run the 20 automated test cases with pytest:

```powershell
cd c:\Users\nagar\OneDrive\Desktop\Parking-Violation-Tracker
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD = "1"
python -m pytest backend/tests/test_tracker.py -v
```

All 20 tests will execute and report passing statuses:
```
backend/tests/test_tracker.py::test_01_valid_vehicle_number PASSED
backend/tests/test_tracker.py::test_02_invalid_vehicle_number PASSED
backend/tests/test_tracker.py::test_03_valid_violation_code PASSED
...
backend/tests/test_tracker.py::test_20_frontend_backend_integration_health PASSED
============================= 20 passed in 1.01s ==============================
```

Detailed test scenario descriptions and outputs are available in [`TESTING.md`](file:///c:/Users/nagar/OneDrive/Desktop/Parking-Violation-Tracker/TESTING.md).

---

## 7. REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend status, service identifier, and version |
| `GET` | `/api/categories` | Metadata for 5 predefined violation categories |
| `POST` | `/api/validate/vehicle` | Live DFA transition trace and regex equivalence diagnostic |
| `GET` | `/api/reports` | List reports with search, zone, status, priority, category filters |
| `POST` | `/api/reports` | Submit violation report (runs DFA + Regex + Zone routing + SQLite insert) |
| `GET` | `/api/reports/<id>` | Full incident details with assignment and status audit history |
| `PUT` | `/api/reports/<id>/status` | Update incident status (triggers Waiting Queue re-evaluation on Resolve) |
| `POST` | `/api/reports/<id>/reassign` | Manual operator reassignment / central correction dispatch |
| `GET` | `/api/handlers` | Live handler list with capacities, on-duty status, and active counts |
| `PUT` | `/api/handlers/<id>/availability` | Toggle handler on-duty / off-duty shift status |
| `GET` | `/api/zones` | 6 enforcement zones with prefix mappings and incident counts |
| `GET` | `/api/analytics` | Real-time SQLite statistics for Chart.js dashboards |

---

## 8. Violation Classification Table

| Code | Category Name | Fine (₹) | Default Priority | Description |
| :--- | :--- | :--- | :--- | :--- |
| **PV01** | `No-Permit` | ₹500 | Medium | Parking in regulated bay without a valid permit or pass |
| **PV02** | `Overstay` | ₹300 | Low | Exceeding maximum permitted metered parking duration |
| **PV03** | `Wrong-Zone` | ₹750 | Medium | Vehicle parked outside its registered permit sector |
| **PV04** | `Obstruction` | ₹1000 | High | Blocking access roads, fire hydrants, or driveways |
| **PV05** | `Disabled-Bay` | ₹1500 | Emergency / Critical | Unauthorized parking in designated accessible bays |
