import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import OverviewDashboard from './pages/OverviewDashboard';
import SubmitReportPage from './pages/SubmitReportPage';
import UserDashboard from './pages/UserDashboard';
import HandlerDashboard from './pages/HandlerDashboard';
import RoutingDashboard from './pages/RoutingDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import { api } from './services/api';
import './App.css';

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reportCounts, setReportCounts] = useState({
    total: 0,
    availableHandlers: 0,
    waitingQueue: 0
  });

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const data = await api.getAnalytics();
        if (data && data.totals) {
          setReportCounts({
            total: data.totals.total_reports,
            availableHandlers: data.totals.available_handlers,
            waitingQueue: data.totals.waiting_queue_reports + data.totals.central_correction_reports
          });
        }
      } catch (err) {
        // Backend might still be starting
      }
    };
    loadCounts();
    const interval = setInterval(loadCounts, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        reportCounts={reportCounts}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar setMobileOpen={setMobileOpen} />

        <main className="content-body">
          <Routes>
            <Route path="/" element={<OverviewDashboard />} />
            <Route path="/submit" element={<SubmitReportPage />} />
            <Route path="/reports" element={<UserDashboard />} />
            <Route path="/handlers" element={<HandlerDashboard />} />
            <Route path="/routing" element={<RoutingDashboard />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
