import React from 'react';

export default function StatisticsCard({ title, value, icon, variant = 'primary', subtext, trend }) {
  return (
    <div className="dashboard-card stat-card h-100">
      <div className="stat-content">
        <div className="stat-label">{title}</div>
        <div className="stat-value">{value !== undefined && value !== null ? value : '--'}</div>
        {subtext && <div className="stat-sub">{subtext}</div>}
        {trend && (
          <div className="mt-2 font-mono" style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
            <i className="bi bi-arrow-up-right me-1"></i>
            {trend}
          </div>
        )}
      </div>
      <div className={`stat-icon ${variant}`}>
        <i className={`bi ${icon}`}></i>
      </div>
    </div>
  );
}
