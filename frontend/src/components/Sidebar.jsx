import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar({ mobileOpen, setMobileOpen, reportCounts = {} }) {
  const closeMobile = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header with Parking 'P' & Shield Logo */}
      <div className="sidebar-brand">
        <div className="brand-shield-logo">
          {/* Shield SVG with 'P' badge */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z"
              fill="#1d4ed8"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Letter 'P' inside shield */}
            <text
              x="12"
              y="15.5"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="900"
              fontFamily="sans-serif"
            >
              P
            </text>
          </svg>
        </div>
        <div className="brand-text">
          <h1>Violation Tracker</h1>
          <span>Bangalore Enforcement</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="sidebar-menu">
        <div className="menu-label">Dashboards & Operations</div>

        <NavLink
          to="/"
          end
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={closeMobile}
        >
          <i className="bi bi-grid-1x2-fill"></i>
          <span>Overview Dashboard</span>
        </NavLink>

        <NavLink
          to="/submit"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={closeMobile}
        >
          <i className="bi bi-plus-circle-fill"></i>
          <span>Submit Violation</span>
          <span className="sidebar-badge bg-primary text-white">DFA Form</span>
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={closeMobile}
        >
          <i className="bi bi-card-checklist"></i>
          <span>User Dashboard</span>
          {reportCounts.total > 0 && (
            <span className="sidebar-badge">{reportCounts.total}</span>
          )}
        </NavLink>

        <div className="menu-label">Enforcement Network</div>

        <NavLink
          to="/handlers"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={closeMobile}
        >
          <i className="bi bi-people-fill"></i>
          <span>Handler Dashboard</span>
          {reportCounts.availableHandlers > 0 && (
            <span className="sidebar-badge bg-success text-white">
              {reportCounts.availableHandlers} Online
            </span>
          )}
        </NavLink>

        <NavLink
          to="/routing"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={closeMobile}
        >
          <i className="bi bi-diagram-3-fill"></i>
          <span>Routing Management</span>
          {reportCounts.waitingQueue > 0 && (
            <span className="sidebar-badge bg-warning text-dark">
              {reportCounts.waitingQueue} Waiting
            </span>
          )}
        </NavLink>

        <div className="menu-label">Intelligence</div>

        <NavLink
          to="/analytics"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          onClick={closeMobile}
        >
          <i className="bi bi-pie-chart-fill"></i>
          <span>Analytics Dashboard</span>
        </NavLink>
      </div>

      {/* Footer Info */}
      <div className="sidebar-footer">
        <div>
          <div className="fw-bold text-white small">P14 Assignment</div>
          <span style={{ fontSize: '11px' }}>Part 3 & 4 Integrated</span>
        </div>
        <span className="badge bg-secondary" style={{ fontSize: '10px' }}>v1.0</span>
      </div>
    </aside>
  );
}
