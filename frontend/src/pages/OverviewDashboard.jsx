import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { api } from '../services/api';
import StatisticsCard from '../components/StatisticsCard';
import ReportTable from '../components/ReportTable';
import { LoadingIndicator, ErrorMessage } from '../components/LoadingIndicator';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export default function OverviewDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingIndicator message="Loading City Violation Overview..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchDashboardData} />;
  if (!analytics) return null;

  const { totals, category_distribution, zone_distribution, daily_trends, recent_reports } = analytics;

  // Chart 1: Category Distribution (Doughnut)
  const categoryLabels = Object.keys(category_distribution || {});
  const categoryValues = Object.values(category_distribution || {});
  const categoryChartData = {
    labels: categoryLabels,
    datasets: [
      {
        data: categoryValues,
        backgroundColor: [
          '#2563eb', // No-Permit (Blue)
          '#d97706', // Overstay (Amber)
          '#7c3aed', // Wrong-Zone (Purple)
          '#dc2626', // Obstruction (Red)
          '#059669'  // Disabled-Bay (Green)
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  // Chart 2: Zone-wise Violation Reports (Bar Chart)
  const zoneLabels = (zone_distribution || []).map(z => `${z.zone} (${z.team})`);
  const zoneValues = (zone_distribution || []).map(z => z.count);
  const zoneChartData = {
    labels: zoneLabels,
    datasets: [
      {
        label: 'Active & Logged Violations',
        data: zoneValues,
        backgroundColor: '#1e40af',
        borderRadius: 6,
        hoverBackgroundColor: '#2563eb'
      }
    ]
  };

  // Chart 3: Daily Violation Trends (Line Chart)
  const trendLabels = (daily_trends || []).map(d => d.date);
  const trendValues = (daily_trends || []).map(d => d.count);
  const trendChartData = {
    labels: trendLabels.length > 0 ? trendLabels : ['Today'],
    datasets: [
      {
        label: 'Reports Filed',
        data: trendValues.length > 0 ? trendValues : [totals.total_reports],
        fill: true,
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        tension: 0.35,
        pointBackgroundColor: '#059669',
        pointRadius: 5
      }
    ]
  };

  return (
    <div>
      {/* KPI Stat Cards */}
      <div className="row g-3 mb-4">
        <div className="col-xl-2 col-md-4 col-sm-6">
          <StatisticsCard
            title="Total Reports"
            value={totals.total_reports}
            icon="card-checklist"
            variant="primary"
            subtext="All Recorded Incidents"
          />
        </div>
        <div className="col-xl-2 col-md-4 col-sm-6">
          <StatisticsCard
            title="Pending Reports"
            value={totals.pending_reports}
            icon="hourglass-split"
            variant="warning"
            subtext="Awaiting Triage"
          />
        </div>
        <div className="col-xl-2 col-md-4 col-sm-6">
          <StatisticsCard
            title="Assigned Reports"
            value={totals.assigned_reports}
            icon="person-badge-fill"
            variant="purple"
            subtext="With Enforcement Teams"
          />
        </div>
        <div className="col-xl-2 col-md-4 col-sm-6">
          <StatisticsCard
            title="Resolved Reports"
            value={totals.resolved_reports}
            icon="check2-all"
            variant="info"
            subtext={`${totals.resolution_rate}% Resolution Rate`}
          />
        </div>
        <div className="col-xl-2 col-md-4 col-sm-6">
          <StatisticsCard
            title="Available Handlers"
            value={`${totals.available_handlers}/${totals.total_handlers}`}
            icon="shield-shaded"
            variant="info"
            subtext="Active in 6 Zones"
          />
        </div>
        <div className="col-xl-2 col-md-4 col-sm-6">
          <StatisticsCard
            title="Queued / Review"
            value={totals.waiting_queue_reports + totals.central_correction_reports}
            icon="exclamation-octagon-fill"
            variant={totals.central_correction_reports > 0 ? 'danger' : 'warning'}
            subtext={`${totals.waiting_queue_reports} wait, ${totals.central_correction_reports} corr.`}
          />
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="row g-4 mb-4">
        {/* Zone Distribution Bar Chart */}
        <div className="col-lg-7">
          <div className="dashboard-card h-100">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <div>
                <h5 className="fw-bold text-dark mb-0">Zone-Wise Violation Distribution</h5>
                <small className="text-muted">Enforcement zones KA01 through KA06</small>
              </div>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-mono">
                6 Zones Monitored
              </span>
            </div>
            <div style={{ height: '270px' }}>
              <Bar
                data={zoneChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { stepSize: 1 }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Category Doughnut Chart */}
        <div className="col-lg-5">
          <div className="dashboard-card h-100">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <div>
                <h5 className="fw-bold text-dark mb-0">Violation Categories</h5>
                <small className="text-muted">5 Predefined Classification Codes</small>
              </div>
              <span className="badge bg-light text-muted border">PV01 - PV05</span>
            </div>
            <div style={{ height: '270px' }} className="d-flex align-items-center justify-content-center">
              <Doughnut
                data={categoryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { boxWidth: 12, font: { size: 11 } }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Trends & Quick Dispatch Banner */}
      <div className="row g-4 mb-4">
        <div className="col-lg-12">
          <div className="dashboard-card">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <div>
                <h5 className="fw-bold text-dark mb-0">Daily Violation Activity Trends</h5>
                <small className="text-muted">Real-time incident ingestion volume over time</small>
              </div>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={fetchDashboardData}
              >
                <i className="bi bi-arrow-clockwise me-1"></i> Refresh Data
              </button>
            </div>
            <div style={{ height: '220px' }}>
              <Line
                data={trendChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { stepSize: 1 }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Violation Reports Table */}
      <div className="table-card">
        <div className="table-header-bar">
          <div>
            <h3>Recent Violation Reports</h3>
            <span className="text-muted small">Latest reports submitted and routed through the engine</span>
          </div>
          <button
            className="btn btn-sm btn-primary fw-semibold"
            onClick={() => navigate('/reports')}
          >
            View All Reports <i className="bi bi-arrow-right ms-1"></i>
          </button>
        </div>
        <ReportTable
          reports={recent_reports}
          onRefresh={fetchDashboardData}
          emptyMessage="No violation reports recorded yet. Use 'Submit Violation' to record the first report."
        />
      </div>
    </div>
  );
}
