import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import ReportDetailModal from '../components/ReportDetailModal';
import { LoadingIndicator, ErrorMessage } from '../components/LoadingIndicator';

export default function RoutingDashboard() {
  const [zones, setZones] = useState([]);
  const [reports, setReports] = useState([]);
  const [handlers, setHandlers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalReportId, setModalReportId] = useState(null);

  // Reassignment Modal State
  const [reassignModalReport, setReassignModalReport] = useState(null);
  const [selectedReassignHandler, setSelectedReassignHandler] = useState('');
  const [reassignNotes, setReassignNotes] = useState('');

  useEffect(() => {
    fetchRoutingOverview();
  }, []);

  async function fetchRoutingOverview() {
    setLoading(true);
    setError(null);
    try {
      const [zRes, rRes, hRes] = await Promise.all([
        api.getZones(),
        api.getReports(),
        api.getHandlers()
      ]);
      setZones(zRes.zones || []);
      setReports(rRes.reports || []);
      setHandlers(hRes.handlers || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  // Trigger automated dispatch on a report (e.g. In Waiting Queue or Central Correction)
  const handleAutoDispatch = async (reportId) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await api.reassignReport(reportId);
      setActionMessage({ type: 'success', text: res.message || 'Routing engine evaluated report.' });
      fetchRoutingOverview();
    } catch (err) {
      setActionMessage({ type: 'danger', text: err.message || 'Failed to dispatch report.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit manual reassignment from modal
  const handleManualReassignSubmit = async (e) => {
    e.preventDefault();
    if (!reassignModalReport || !selectedReassignHandler) return;

    setActionLoading(true);
    try {
      await api.reassignReport(
        reassignModalReport.id,
        selectedReassignHandler,
        reassignNotes || 'Manual routing intervention from Routing Management'
      );
      setActionMessage({
        type: 'success',
        text: `Report ${reassignModalReport.report_id} successfully dispatched to handler.`
      });
      setReassignModalReport(null);
      setSelectedReassignHandler('');
      setReassignNotes('');
      fetchRoutingOverview();
    } catch (err) {
      alert(`Reassignment failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingIndicator message="Loading Network Routing Table & Queues..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchRoutingOverview} />;

  // Filter queue lists
  const waitingQueueReports = reports.filter(r => r.status === 'Waiting Queue');
  const centralCorrectionReports = reports.filter(r => r.status === 'Central Correction Queue');

  return (
    <div>
      {/* Action Notification Alert */}
      {actionMessage && (
        <div className={`alert alert-${actionMessage.type} alert-dismissible fade show p-3 mb-4 rounded-3 shadow-sm`} role="alert">
          <i className={`bi ${actionMessage.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
          {actionMessage.text}
          <button type="button" className="btn-close" onClick={() => setActionMessage(null)}></button>
        </div>
      )}

      {/* 1. Six-Zone Routing Table */}
      <div className="table-card mb-4">
        <div className="table-header-bar">
          <div>
            <h4 className="fw-bold text-dark mb-0">
              <i className="bi bi-diagram-3-fill text-primary me-2"></i>
              Six-Zone Static Routing Configuration
            </h4>
            <span className="text-muted small">
              Automated deterministic mapping of vehicle prefix to enforcement zone and primary teams
            </span>
          </div>
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-mono">
            Part B: Computer Networks Routing Engine
          </span>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Vehicle Prefix</th>
                <th>Enforcement Zone</th>
                <th>Assigned Team</th>
                <th>Jurisdiction Description</th>
                <th>Available Handlers</th>
                <th>Total Reports (DB)</th>
                <th>Active Reports (DB)</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id}>
                  <td>
                    <span className="badge bg-dark text-white font-mono fs-6 px-2 py-1">
                      {z.prefix}
                    </span>
                  </td>
                  <td>
                    <strong className="text-dark">{z.code}</strong>
                  </td>
                  <td>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                      {z.team_name}
                    </span>
                  </td>
                  <td className="text-secondary small">{z.description}</td>
                  <td>
                    <span className={`badge ${z.available_handlers > 0 ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'}`}>
                      {z.available_handlers} / {z.total_handlers} Available
                    </span>
                  </td>
                  <td className="font-mono fw-bold text-dark">{z.total_reports}</td>
                  <td className="font-mono fw-bold text-primary">{z.active_reports}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Queues Section (Waiting Queue & Central Correction Queue) */}
      <div className="row g-4">
        
        {/* Waiting Queue (Capacity Overflows) */}
        <div className="col-lg-6">
          <div className="dashboard-card h-100">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <div>
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-inbox-fill text-warning"></i>
                  Waiting Queue
                  <span className="badge bg-warning text-dark font-mono" style={{ fontSize: '11px' }}>
                    {waitingQueueReports.length} Queued
                  </span>
                </h5>
                <small className="text-muted">
                  Incidents delayed when all zone handlers reach maximum daily capacity
                </small>
              </div>
            </div>

            {waitingQueueReports.length > 0 ? (
              <div className="table-responsive" style={{ maxHeight: '350px' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Report ID</th>
                      <th>Vehicle</th>
                      <th>Priority</th>
                      <th>Zone</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitingQueueReports.map((r) => (
                      <tr key={r.id}>
                        <td className="font-mono small text-primary fw-bold">{r.report_id}</td>
                        <td className="font-mono text-dark fw-bold">{r.vehicle_number}</td>
                        <td>
                          <span className={`priority-badge priority-${r.priority ? (r.priority.toLowerCase().includes('emerg') ? 'emergency' : r.priority.toLowerCase()) : 'medium'}`}>
                            {r.priority}
                          </span>
                        </td>
                        <td>{r.assigned_zone_name || 'Zone'}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-primary py-0 px-2 fw-semibold"
                            disabled={actionLoading}
                            onClick={() => handleAutoDispatch(r.id)}
                            title="Re-evaluate with Routing Engine"
                          >
                            <i className="bi bi-arrow-repeat me-1"></i> Re-check
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5 text-muted bg-light rounded-3">
                <i className="bi bi-check2-circle fs-2 text-success d-block mb-1"></i>
                <div className="fw-semibold">Waiting Queue Empty</div>
                <small className="text-secondary">All zone handlers have sufficient daily capacity.</small>
              </div>
            )}
          </div>
        </div>

        {/* Central Correction Queue (Unknown / Out-of-State Prefixes) */}
        <div className="col-lg-6">
          <div className="dashboard-card h-100">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <div>
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-octagon-fill text-danger"></i>
                  Central Correction Queue
                  <span className="badge bg-danger text-white font-mono" style={{ fontSize: '11px' }}>
                    {centralCorrectionReports.length} Unresolved
                  </span>
                </h5>
                <small className="text-muted">
                  Unmatched or out-of-state prefixes (e.g. DL, MH) requiring supervisor review
                </small>
              </div>
            </div>

            {centralCorrectionReports.length > 0 ? (
              <div className="table-responsive" style={{ maxHeight: '350px' }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Report ID</th>
                      <th>Vehicle</th>
                      <th>Location</th>
                      <th className="text-end">Manual Dispatch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {centralCorrectionReports.map((r) => (
                      <tr key={r.id}>
                        <td className="font-mono small text-primary fw-bold">{r.report_id}</td>
                        <td className="font-mono text-danger fw-bold">{r.vehicle_number}</td>
                        <td className="small text-secondary">{r.location}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-danger py-0 px-2 fw-bold"
                            onClick={() => setReassignModalReport(r)}
                          >
                            <i className="bi bi-person-plus-fill me-1"></i> Assign
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5 text-muted bg-light rounded-3">
                <i className="bi bi-shield-check fs-2 text-success d-block mb-1"></i>
                <div className="fw-semibold">Central Correction Queue Clear</div>
                <small className="text-secondary">All vehicles cleanly routed to zones KA01 through KA06.</small>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Manual Reassignment Modal */}
      {reassignModalReport && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
              <div className="modal-header border-bottom px-4 py-3 bg-dark text-white">
                <h5 className="modal-title fw-bold">Manual Routing Dispatch</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setReassignModalReport(null)}></button>
              </div>
              <form onSubmit={handleManualReassignSubmit}>
                <div className="modal-body p-4">
                  <div className="alert alert-warning small mb-3">
                    <strong>Vehicle Number:</strong> <span className="font-mono fw-bold">{reassignModalReport.vehicle_number}</span><br />
                    This vehicle prefix is not in the default 6-zone table. Select an enforcement handler to take manual jurisdiction.
                  </div>

                  <div className="mb-3">
                    <label className="form-label-custom">Select Enforcement Handler <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={selectedReassignHandler}
                      onChange={(e) => setSelectedReassignHandler(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Handler (Zone / Team) --</option>
                      {handlers.map(h => (
                        <option
                          key={h.id}
                          value={h.id}
                          disabled={!h.is_available || h.is_at_capacity}
                        >
                          {h.name} ({h.handler_id}) - {h.zone_code} ({h.zone_team}) - Load: {h.current_assignments}/{h.daily_capacity}
                          {!h.is_available ? ' [OFFLINE]' : h.is_at_capacity ? ' [AT CAPACITY]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label-custom">Supervisor Routing Notes</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Reason for manual dispatch or specific instructions..."
                      value={reassignNotes}
                      onChange={(e) => setReassignNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer border-top bg-light px-4 py-2">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReassignModalReport(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm fw-bold" disabled={actionLoading || !selectedReassignHandler}>
                    Confirm Dispatch
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {modalReportId && (
        <ReportDetailModal
          reportId={modalReportId}
          onClose={() => setModalReportId(null)}
          onStatusUpdated={() => fetchRoutingOverview()}
        />
      )}
    </div>
  );
}
