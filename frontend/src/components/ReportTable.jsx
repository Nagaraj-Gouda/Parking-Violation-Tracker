import React, { useState } from 'react';
import StatusBadge from './StatusBadge';
import ReportDetailModal from './ReportDetailModal';

export default function ReportTable({ reports, onRefresh, emptyMessage = 'No violation reports found matching current criteria.' }) {
  const [selectedReportId, setSelectedReportId] = useState(null);

  return (
    <div className="table-responsive">
      <table className="custom-table">
        <thead>
          <tr>
            <th>Report ID</th>
            <th>Vehicle No</th>
            <th>Category</th>
            <th>Location</th>
            <th>Zone / Team</th>
            <th>Priority</th>
            <th>Assigned Handler</th>
            <th>Status</th>
            <th>Timestamp</th>
            <th className="text-end">Action</th>
          </tr>
        </thead>
        <tbody>
          {reports && reports.length > 0 ? (
            reports.map((r) => (
              <tr key={r.id}>
                <td className="font-mono fw-bold text-primary small">
                  {r.report_id}
                </td>
                <td className="font-mono fw-bold text-dark">
                  {r.vehicle_number}
                </td>
                <td>
                  <div className="fw-semibold text-dark">{r.violation_category}</div>
                  <div className="font-mono text-muted" style={{ fontSize: '11px' }}>{r.violation_code}</div>
                </td>
                <td className="text-secondary small" style={{ maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.location}
                </td>
                <td>
                  <span className="badge bg-light text-dark border">
                    {r.assigned_zone_name || r.zone_code || 'Unassigned'}
                  </span>
                  {r.zone_team && (
                    <div className="text-muted" style={{ fontSize: '11px' }}>{r.zone_team}</div>
                  )}
                </td>
                <td>
                  <span className={`priority-badge priority-${r.priority ? (r.priority.toLowerCase().includes('emerg') ? 'emergency' : r.priority.toLowerCase()) : 'medium'}`}>
                    {r.priority || 'Medium'}
                  </span>
                </td>
                <td>
                  {r.handler_name ? (
                    <span className="small text-dark fw-medium">
                      <i className="bi bi-person me-1 text-primary"></i>
                      {r.handler_name}
                    </span>
                  ) : (
                    <span className="text-muted small fst-italic">None</span>
                  )}
                </td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td className="font-mono text-muted small" style={{ fontSize: '12px' }}>
                  {r.created_at ? r.created_at.substring(0, 16) : '--'}
                </td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-outline-primary py-1 px-2"
                    title="View Details"
                    onClick={() => setSelectedReportId(r.id)}
                  >
                    <i className="bi bi-eye-fill me-1"></i> View
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="10" className="text-center py-5 text-muted">
                <i className="bi bi-folder2-open fs-2 d-block mb-2 text-secondary"></i>
                <div className="fw-semibold">{emptyMessage}</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Detail Modal */}
      {selectedReportId && (
        <ReportDetailModal
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onStatusUpdated={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
