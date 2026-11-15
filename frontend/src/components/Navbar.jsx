import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';

export default function Navbar({ setMobileOpen }) {
  const [timeStr, setTimeStr] = useState('');
  const [apiConnected, setApiConnected] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Probe health periodically
    const checkHealth = async () => {
      try {
        await api.getHealth();
        setApiConnected(true);
      } catch (e) {
        setApiConnected(false);
      }
    };
    checkHealth();
    const healthTimer = setInterval(checkHealth, 30000);
    return () => clearInterval(healthTimer);
  }, []);

  // Title lookup
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return { title: 'Overview Dashboard', subtitle: 'Live Enforcement Operations & City Traffic Metrics' };
      case '/submit':
        return { title: 'Submit Violation Report', subtitle: 'Automata Theory (DFA + Regex) Validation & Routing' };
      case '/reports':
        return { title: 'User Dashboard', subtitle: 'Search, Filter and Track City Parking Violations' };
      case '/handlers':
        return { title: 'Handler Dashboard', subtitle: 'Manage Enforcement Officers, Availability & Daily Capacities' };
      case '/routing':
        return { title: 'Routing Management', subtitle: '6-Zone Network Dispatch, Priority Escalation & Correction Queues' };
      case '/analytics':
        return { title: 'Analytics Dashboard', subtitle: 'Interactive Charts & SQLite Statistical Performance' };
      default:
        return { title: 'Parking Violation Tracker', subtitle: 'Administrative Control Center' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <header className="navbar-custom">
      <div className="d-flex align-items-center gap-3">
        <button
          className="btn btn-outline-secondary btn-sm d-lg-none"
          onClick={() => setMobileOpen(prev => !prev)}
        >
          <i className="bi bi-list fs-5"></i>
        </button>

        <div className="page-title">
          <h2>{title}</h2>
          <p className="d-none d-sm-block">{subtitle}</p>
        </div>
      </div>

      <div className="navbar-actions">
        <div className="live-clock font-mono d-none d-md-flex">
          <i className="bi bi-clock-fill text-primary"></i>
          <span>{timeStr}</span>
        </div>

        {apiConnected ? (
          <div className="system-status-indicator">
            <span className="status-dot"></span>
            <span>API Active</span>
          </div>
        ) : (
          <div className="badge bg-danger-subtle text-danger border border-danger-subtle py-2 px-3">
            <i className="bi bi-exclamation-circle-fill me-1"></i> API Offline
          </div>
        )}

        {location.pathname !== '/submit' && (
          <button
            className="btn btn-primary btn-sm fw-bold px-3 d-none d-sm-inline-flex align-items-center gap-1 shadow-sm"
            onClick={() => navigate('/submit')}
          >
            <i className="bi bi-plus-lg"></i>
            <span>New Report</span>
          </button>
        )}
      </div>
    </header>
  );
}
