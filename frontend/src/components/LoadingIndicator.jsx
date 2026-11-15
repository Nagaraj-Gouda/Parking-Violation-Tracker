import React from 'react';

export function LoadingIndicator({ message = 'Loading live data from server...' }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center p-5 my-4 bg-white rounded-3 border">
      <div className="spinner-border text-primary mb-3" style={{ width: '2.5rem', height: '2.5rem' }} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <div className="text-secondary fw-semibold">{message}</div>
      <small className="text-muted mt-1">Connecting to Flask SQLite backend</small>
    </div>
  );
}

export function ErrorMessage({ error, onRetry }) {
  return (
    <div className="alert alert-danger d-flex align-items-center justify-content-between p-3 rounded-3 my-3 shadow-sm border-danger" role="alert">
      <div className="d-flex align-items-center gap-3">
        <i className="bi bi-exclamation-triangle-fill fs-3 text-danger"></i>
        <div>
          <div className="fw-bold">Operational Error Encountered</div>
          <div className="small text-danger-emphasis">
            {typeof error === 'string' ? error : error?.message || 'Unable to communicate with the enforcement service.'}
          </div>
        </div>
      </div>
      {onRetry && (
        <button className="btn btn-sm btn-outline-danger fw-bold px-3" onClick={onRetry}>
          <i className="bi bi-arrow-clockwise me-1"></i> Retry
        </button>
      )}
    </div>
  );
}
