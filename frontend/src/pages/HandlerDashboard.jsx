import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import ReportDetailModal from '../components/ReportDetailModal';
import { LoadingIndicator, ErrorMessage } from '../components/LoadingIndicator';

export default function HandlerDashboard() {
  const [handlers, setHandlers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHandlerId, setSelectedHandlerId] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(false);
  const [modalReportId, setModalReportId] = useState(null);

  useEffect(() => {
    fetchHandlerData();
  }, []);

  async function fetchHandlerData() {
    setLoading(true);
    setError(null);
    try {
      const [hRes, rRes] = await Promise.all([
        api.getHandlers(),
        api.getReports()
      ]);
      setHandlers(hRes.handlers || []);
      setReports(rRes.reports || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  // Toggle availability
  const handleToggleAvailability = async (handler) => {
    try {
      await api.toggleHandlerAvailability(handler.id, !handler.is_available);
      fetchHandlerData();
    } catch (err) {
      alert(`Could not toggle availability: ${err.message}`);
    }
  };

  // Update status for a report directly from handler board
  const handleUpdateStatus = async (reportId, newStatus) => {
    setActionLoading(true);
    try {
      await api.updateReportStatus(reportId, newStatus, `Handler advanced status to ${newStatus}`);
      fetchHandlerData();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingIndicator message="Loading Enforcement Officers & Capacities..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchHandlerData} />;

  // Filtered reports for current selection
  const activeReports = reports.filter(r => {
    if (selectedHandlerId === 'ALL') return true;
    return r.assigned_handler_id === Number(selectedHandlerId);
  });

  return (
    <div>
      {/* Top Banner: Capacity Summary */}
      <div className="dashboard-card mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
          <div>
            <h4 className="fw-bold text-dark mb-1">
              <i className="bi bi-people-fill text-primary me-2"></i>
              Enforcement Handlers Roster
            </h4>
            <span className="text-muted small">
              Live capacity monitoring, shift availability, and assignment workload
            </span>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={fetchHandlerData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh Roster
          </button>
        </div>

        {/* Handlers Grid */}
        <div className="row g-3">
          {handlers.map((h) => {
            const usagePercent = Math.min(100, Math.round((h.current_assignments / h.daily_capacity) * 100));
            const isFull = h.current_assignments >= h.daily_capacity;

            return (
              <div key={h.id} className="col-xl-4 col-md-6">
                <div
                  className={`card h-100 border p-3 rounded-3 shadow-sm transition ${
                    selectedHandlerId === String(h.id) ? 'border-primary ring-2' : ''
                  }`}
                  style={{
                    backgroundColor: h.is_available ? '#ffffff' : '#f8fafc',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedHandlerId(selectedHandlerId === String(h.id) ? 'ALL' : String(h.id))}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="fw-bold text-dark d-flex align-items-center gap-2">
                        {h.name}
                        <span className={`badge ${h.role === 'Primary' ? 'bg-primary' : 'bg-secondary'}`} style={{ fontSize: '10px' }}>
                          {h.role}
                        </span>
                      </div>
                      <div className="text-muted font-mono small">
                        {h.handler_id} &bull; {h.zone_code} ({h.zone_team})
                      </div>
                    </div>

                    {/* Toggle availability switch */}
                    <div className="form-check form-switch" onClick={(e) => e.stopPropagation()}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        checked={Boolean(h.is_available)}
                        onChange={() => handleToggleAvailability(h)}
                        title={h.is_available ? 'Active / On-Duty' : 'Off-Duty'}
                      />
                    </div>
                  </div>

                  {/* Daily Capacity Progress Bar */}
                  <div className="my-2">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted fw-semibold">Daily Load Capacity:</span>
                      <span className={`fw-bold font-mono ${isFull ? 'text-danger' : 'text-primary'}`}>
                        {h.current_assignments} / {h.daily_capacity}
                        {isFull && ' (MAX)'}
                      </span>
                    </div>
                    <div className="progress" style={{ height: '7px' }}>
                      <div
                        className={`progress-bar ${isFull ? 'bg-danger' : usagePercent > 60 ? 'bg-warning' : 'bg-primary'}`}
                        role="progressbar"
                        style={{ width: `${usagePercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center pt-2 mt-2 border-top small text-secondary">
                    <span>
                      <i className="bi bi-hourglass-split me-1"></i>
                      Pending: <strong>{h.pending_assignments}</strong>
                    </span>
                    <span>
                      {h.is_available ? (
                        <span className="text-success fw-bold">
                          <i className="bi bi-circle-fill me-1" style={{ fontSize: '8px' }}></i> Available
                        </span>
                      ) : (
                        <span className="text-muted fw-semibold">
                          <i className="bi bi-pause-circle me-1"></i> Off Duty
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Handlers Assignments & Operational Queue Table */}
      <div className="table-card">
        <div className="table-header-bar">
          <div className="d-flex align-items-center gap-3">
            <h3 className="mb-0">
              {selectedHandlerId === 'ALL'
                ? 'All Active Field Assignments'
                : `Assignments for Selected Handler (${handlers.find(h => String(h.id) === selectedHandlerId)?.name || ''})`}
            </h3>
            {selectedHandlerId !== 'ALL' && (
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setSelectedHandlerId('ALL')}
              >
                Clear Filter
              </button>
            )}
          </div>
          <span className="badge bg-secondary font-mono">
            {activeReports.length} Active Records
          </span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Vehicle No</th>
                <th>Category</th>
                <th>Location</th>
                <th>Assigned Handler</th>
                <th>Priority</th>
                <th>Status</th>
                <th className="text-end">Handler Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeReports && activeReports.length > 0 ? (
                activeReports.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono fw-bold text-primary small">{r.report_id}</td>
                    <td className="font-mono fw-bold text-dark">{r.vehicle_number}</td>
                    <td>
                      <span className="fw-semibold text-dark">{r.violation_category}</span>
                      <div className="font-mono text-muted small">{r.violation_code}</div>
                    </td>
                    <td className="small text-secondary" style={{ maxWidth: '200px' }}>{r.location}</td>
                    <td>
                      {r.handler_name ? (
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                          {r.handler_name} ({r.handler_code})
                        </span>
                      ) : (
                        <span className="text-muted fst-italic small">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`priority-badge priority-${r.priority ? (r.priority.toLowerCase().includes('emerg') ? 'emergency' : r.priority.toLowerCase()) : 'medium'}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <button
                          className="btn btn-sm btn-outline-secondary py-1 px-2"
                          title="View Dossier"
                          onClick={() => setModalReportId(r.id)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        {r.status === 'Assigned' && (
                          <button
                            className="btn btn-sm btn-outline-primary py-1 px-2 fw-semibold"
                            disabled={actionLoading}
                            onClick={() => handleUpdateStatus(r.id, 'In Progress')}
                            title="Accept and Begin Enforcement"
                          >
                            <i className="bi bi-play-circle me-1"></i> Accept
                          </button>
                        )}
                        {r.status === 'In Progress' && (
                          <button
                            className="btn btn-sm btn-success py-1 px-2 fw-semibold"
                            disabled={actionLoading}
                            onClick={() => handleUpdateStatus(r.id, 'Resolved')}
                            title="Mark Infraction Resolved"
                          >
                            <i className="bi bi-check-circle me-1"></i> Resolve
                          </button>
                        )}
                        {r.status === 'Resolved' && (
                          <span className="badge bg-success-subtle text-success border border-success-subtle py-1">
                            Completed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    No active assignments found for this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalReportId && (
        <ReportDetailModal
          reportId={modalReportId}
          onClose={() => setModalReportId(null)}
          onStatusUpdated={() => fetchHandlerData()}
        />
      )}
    </div>
  );
}
