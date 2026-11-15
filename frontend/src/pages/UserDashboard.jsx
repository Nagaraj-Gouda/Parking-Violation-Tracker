import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import ReportTable from '../components/ReportTable';
import { LoadingIndicator, ErrorMessage } from '../components/LoadingIndicator';

export default function UserDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [zone, setZone] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');

  // Dropdown options
  const [zones, setZones] = useState([]);
  const [categories, setCategories] = useState({});

  useEffect(() => {
    api.getZones().then(res => setZones(res.zones || [])).catch(console.error);
    api.getCategories().then(res => setCategories(res.categories || {})).catch(console.error);
    fetchReports();
  }, []);

  async function fetchReports(overrideFilters = null) {
    setLoading(true);
    setError(null);
    try {
      const activeFilters = overrideFilters || {
        search,
        status,
        zone,
        priority,
        category
      };
      const res = await api.getReports(activeFilters);
      setReports(res.reports || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setZone('');
    setPriority('');
    setCategory('');
    fetchReports({ search: '', status: '', zone: '', priority: '', category: '' });
  };

  return (
    <div>
      {/* Top Filter and Search Bar Card */}
      <div className="dashboard-card mb-4">
        <form onSubmit={handleSearchSubmit}>
          <div className="row g-3 align-items-end">
            
            {/* Search Input */}
            <div className="col-lg-3 col-md-6">
              <label className="form-label-custom">
                <span>Search Incidents</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Vehicle No, Report ID, Location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="col-lg-2 col-md-3 col-sm-6">
              <label className="form-label-custom">
                <span>Filter Status</span>
              </label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Waiting Queue">Waiting Queue</option>
                <option value="Central Correction Queue">Central Correction</option>
              </select>
            </div>

            {/* Zone Filter */}
            <div className="col-lg-2 col-md-3 col-sm-6">
              <label className="form-label-custom">
                <span>Enforcement Zone</span>
              </label>
              <select
                className="form-select"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
              >
                <option value="">All Zones</option>
                {zones.map(z => (
                  <option key={z.id} value={z.code}>
                    {z.code} ({z.team_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="col-lg-2 col-md-4 col-sm-6">
              <label className="form-label-custom">
                <span>Category</span>
              </label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {Object.values(categories).map(c => (
                  <option key={c.code} value={c.name}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="col-lg-1 col-md-4 col-sm-6">
              <label className="form-label-custom">
                <span>Priority</span>
              </label>
              <select
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="">All</option>
                <option value="Emergency / Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="col-lg-2 col-md-4 d-flex gap-2">
              <button type="submit" className="btn btn-primary flex-grow-1 fw-bold">
                <i className="bi bi-funnel-fill me-1"></i> Apply
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                title="Reset Filters"
                onClick={handleResetFilters}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

          </div>
        </form>
      </div>

      {/* Reports Table Container */}
      <div className="table-card">
        <div className="table-header-bar">
          <div className="d-flex align-items-center gap-3">
            <h3 className="mb-0">Logged Infractions Roster</h3>
            <span className="badge bg-primary rounded-pill">
              {reports.length} {reports.length === 1 ? 'Report' : 'Reports'}
            </span>
          </div>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => fetchReports()}
          >
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
        </div>

        {loading ? (
          <LoadingIndicator message="Filtering violation records..." />
        ) : error ? (
          <ErrorMessage error={error} onRetry={() => fetchReports()} />
        ) : (
          <ReportTable
            reports={reports}
            onRefresh={() => fetchReports()}
            emptyMessage="No violation reports found matching current filters."
          />
        )}
      </div>
    </div>
  );
}
