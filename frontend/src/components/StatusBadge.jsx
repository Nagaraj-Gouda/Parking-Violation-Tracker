import React from 'react';

export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase().trim();

  let badgeClass = 'badge-pending';
  let iconClass = 'bi-hourglass-split';
  let label = status || 'Unknown';

  if (normalized === 'pending') {
    badgeClass = 'badge-pending';
    iconClass = 'bi-clock-history';
  } else if (normalized === 'assigned') {
    badgeClass = 'badge-assigned';
    iconClass = 'bi-person-check-fill';
  } else if (normalized === 'in progress' || normalized === 'inprogress') {
    badgeClass = 'badge-in-progress';
    iconClass = 'bi-arrow-repeat';
  } else if (normalized === 'resolved') {
    badgeClass = 'badge-resolved';
    iconClass = 'bi-check-circle-fill';
  } else if (normalized === 'waiting queue' || normalized === 'waiting') {
    badgeClass = 'badge-waiting-queue';
    iconClass = 'bi-inbox-fill';
  } else if (normalized === 'central correction queue' || normalized === 'correction') {
    badgeClass = 'badge-central-correction';
    iconClass = 'bi-exclamation-octagon-fill';
  }

  return (
    <span className={`badge-custom ${badgeClass}`}>
      <i className={`bi ${iconClass}`}></i>
      <span>{label}</span>
    </span>
  );
}
