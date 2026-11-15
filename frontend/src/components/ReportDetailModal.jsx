import React, { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import { api } from '../services/api';

export default function ReportDetailModal({ reportId, onClose, onStatusUpdated }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [statusComment, setStatusComment] = useState('');

  useEffect(() => {
    if (!reportId) return;
    loadDetails();
  }, [reportId]);

  async function loadDetails() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getReport(reportId);
      setReport(res.report);
    } catch (err) {
      setError(err.message || 'Failed to load report details.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus) {
    setUpdating(true);
    try {
      await api.updateReportStatus(
        report.id,
        newStatus,
        statusComment || `Status transition to ${newStatus}`,
        'Operations Officer'
      );
      setStatusComment('');
      await loadDetails();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  }

  if (!reportId) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1060 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
          
          {/* Modal Header */}
          <div className="modal-header border-bottom px-4 py-3" style={{ backgroundColor: '#0f172a', color: '#fff' }}>
            <div className="d-flex align-items-center gap-3">
              <div className="p-2 bg-primary rounded-3 text-white">
                <i className="bi bi-shield-fill-check fs-5"></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold mb-0">Violation Report Dossier</h5>
                <span className="font-mono text-info small">{report ? report.report_id : 'Loading...'}</span>
              </div>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4 bg-light">
            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <div className="mt-2 text-muted fw-semibold">Fetching report records...</div>
              </div>
            )}

            {error && (
              <div className="alert alert-danger mb-0">
                <i className="bi bi-exclamation-triangle-fill me-2"></i> {error}
              </div>
            )}

            {!loading && report && (
              <div>
                {/* Top Summary Banner */}
                <div className="card border-0 shadow-sm p-3 mb-3 bg-white rounded-3">
                  <div className="row g-3 align-items-center">
                    <div className="col-md-3">
                      <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '11px' }}>Vehicle Number</small>
                      <span className="font-mono fw-bold fs-5 text-primary">{report.vehicle_number}</span>
                      <div className="badge bg-success-subtle text-success border border-success-subtle d-inline-block mt-1" style={{ fontSize: '10px' }}>
                        <i className="bi bi-check2-circle me-1"></i> DFA Verified
                      </div>
                    </div>
                    <div className="col-md-3">
                      <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '11px' }}>Category</small>
                      <span className="fw-bold text-dark">{report.violation_category}</span>
                      <small className="d-block text-muted font-mono">{report.violation_code}</small>
                    </div>
                    <div className="col-md-3">
                      <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '11px' }}>Priority</small>
                      <span className={`priority-badge priority-${report.priority.toLowerCase().includes('emerg') ? 'emergency' : report.priority.toLowerCase()}`}>
                        {report.priority}
                      </span>
                    </div>
                    <div className="col-md-3 text-md-end">
                      <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '11px' }}>Current Status</small>
                      <StatusBadge status={report.status} />
                    </div>
                  </div>
                </div>

                {/* Grid Info */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="card border-0 shadow-sm p-3 h-100 bg-white rounded-3">
                      <h6 className="fw-bold text-dark mb-2 border-bottom pb-2">
                        <i className="bi bi-geo-alt-fill text-danger me-1"></i> Incident Location & Timestamp
                      </h6>
                      <p className="mb-2 text-secondary">
                        <strong>Location:</strong> {report.location}
                      </p>
                      <p className="mb-2 text-secondary font-mono small">
                        <strong>Logged At:</strong> {report.created_at}
                      </p>
                      {report.description && (
                        <div className="bg-light p-2 rounded small text-muted border">
                          <strong>Notes:</strong> {report.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="card border-0 shadow-sm p-3 h-100 bg-white rounded-3">
                      <h6 className="fw-bold text-dark mb-2 border-bottom pb-2">
                        <i className="bi bi-diagram-3-fill text-primary me-1"></i> Zone & Enforcement Team
                      </h6>
                      <p className="mb-2 text-secondary">
                        <strong>Zone:</strong> {report.assigned_zone_name || report.zone_code || 'Unassigned / Unknown'}
                      </p>
                      <p className="mb-2 text-secondary">
                        <strong>Team:</strong> {report.zone_team || 'Pending Routing'}
                      </p>
                      <p className="mb-0 text-secondary">
                        <strong>Assigned Handler:</strong>{' '}
                        {report.handler_name ? (
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                            {report.handler_name} ({report.handler_code}) - {report.handler_role}
                          </span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary">No Handler Assigned</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Workflow Status Timeline */}
                <div className="card border-0 shadow-sm p-3 mb-3 bg-white rounded-3">
                  <h6 className="fw-bold text-dark mb-3 border-bottom pb-2">
                    <i className="bi bi-clock-history text-info me-1"></i> Status Audit History
                  </h6>
                  {report.status_history && report.status_history.length > 0 ? (
                    <ul className="list-unstyled mb-0 position-relative ps-3" style={{ borderLeft: '2px solid #e2e8f0' }}>
                      {report.status_history.map((h, i) => (
                        <li key={i} className="mb-3 position-relative">
                          <div
                            style={{
                              position: 'absolute',
                              left: '-22px',
                              top: '2px',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: '#2563eb',
                              border: '2px solid #fff'
                            }}
                          ></div>
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold small text-dark">{h.new_status}</span>
                            <span className="badge bg-light text-muted border" style={{ fontSize: '10px' }}>{h.changed_by}</span>
                            <span className="font-mono text-muted small ms-auto">{h.timestamp}</span>
                          </div>
                          {h.comment && <div className="small text-muted mt-1">{h.comment}</div>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-muted small">No status changes recorded yet.</div>
                  )}
                </div>

                {/* Handler Action Controls */}
                <div className="card border-0 shadow-sm p-3 bg-white rounded-3">
                  <h6 className="fw-bold text-dark mb-2">
                    <i className="bi bi-gear-fill text-secondary me-1"></i> Enforcement Workflow Actions
                  </h6>
                  <div className="row g-2 align-items-center">
                    <div className="col-md-7">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Add operational remark or resolution notes..."
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                      />
                    </div>
                    <div className="col-md-5 d-flex gap-2 justify-content-md-end">
                      {report.status !== 'In Progress' && report.status !== 'Resolved' && (
                        <button
                          className="btn btn-sm btn-outline-primary fw-semibold"
                          disabled={updating}
                          onClick={() => handleStatusChange('In Progress')}
                        >
                          <i className="bi bi-play-circle me-1"></i> In Progress
                        </button>
                      )}
                      {report.status !== 'Resolved' && (
                        <button
                          className="btn btn-sm btn-success fw-semibold"
                          disabled={updating}
                          onClick={() => handleStatusChange('Resolved')}
                        >
                          <i className="bi bi-check-circle me-1"></i> Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer border-top bg-white px-4 py-2">
            <button type="button" className="btn btn-secondary btn-sm px-4" onClick={onClose}>
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
