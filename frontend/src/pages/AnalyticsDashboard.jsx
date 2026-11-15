import React, { useState, useEffect } from 'react';
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
  LineElement,
  RadialLinearScale
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import { api } from '../services/api';
import StatisticsCard from '../components/StatisticsCard';
import { LoadingIndicator, ErrorMessage } from '../components/LoadingIndicator';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale
);

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
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

  if (loading) return <LoadingIndicator message="Computing SQLite Analytics & Generating Charts..." />;
  if (error) return <ErrorMessage error={error} onRetry={loadAnalytics} />;
  if (!analytics) return null;

  const { totals, category_distribution, zone_distribution, daily_trends, priority_distribution } = analytics;

  // Chart 1: Bar Chart: Zone-wise violation reports
  const zoneLabels = (zone_distribution || []).map(z => `${z.zone} (${z.team})`);
  const zoneCounts = (zone_distribution || []).map(z => z.count);
  const zoneBarData = {
    labels: zoneLabels,
    datasets: [
      {
        label: 'Logged Violations',
        data: zoneCounts,
        backgroundColor: [
          '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'
        ],
        borderWidth: 1,
        borderColor: '#1e3a8a',
        borderRadius: 8
      }
    ]
  };

  // Chart 2: Pie Chart: Five violation categories
  const catLabels = Object.keys(category_distribution || {});
  const catCounts = Object.values(category_distribution || {});
  const categoryPieData = {
    labels: catLabels,
    datasets: [
      {
        data: catCounts,
        backgroundColor: [
          '#2563eb', // No-Permit
          '#f59e0b', // Overstay
          '#8b5cf6', // Wrong-Zone
          '#ef4444', // Obstruction
          '#10b981'  // Disabled-Bay
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  // Chart 3: Line Chart: Daily violation trends
  const trendLabels = (daily_trends || []).map(d => d.date);
  const trendCounts = (daily_trends || []).map(d => d.count);
  const lineChartData = {
    labels: trendLabels.length > 0 ? trendLabels : ['Today'],
    datasets: [
      {
        label: 'Violations Ingested Per Day',
        data: trendCounts.length > 0 ? trendCounts : [totals.total_reports],
        fill: true,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.35,
        pointBackgroundColor: '#1d4ed8',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6
      }
    ]
  };

  // Chart 4: Priority Breakdown (Doughnut)
  const priorityLabels = Object.keys(priority_distribution || {});
  const priorityCounts = Object.values(priority_distribution || {});
  const priorityDoughnutData = {
    labels: priorityLabels,
    datasets: [
      {
        data: priorityCounts,
        backgroundColor: ['#dc2626', '#ea580c', '#eab308', '#64748b'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  return (
    <div>
      {/* KPI Header Stats */}
      <div className="row g-3 mb-4">
        <div className="col-lg-3 col-sm-6">
          <StatisticsCard
            title="Total Violations"
            value={totals.total_reports}
            icon="bar-chart-fill"
            variant="primary"
            subtext="Persisted in SQLite database"
          />
        </div>
        <div className="col-lg-3 col-sm-6">
          <StatisticsCard
            title="Pending Reports"
            value={totals.pending_reports}
            icon="hourglass-split"
            variant="warning"
            subtext="Awaiting Assignment"
          />
        </div>
        <div className="col-lg-3 col-sm-6">
          <StatisticsCard
            title="Assigned Reports"
            value={totals.assigned_reports + totals.in_progress_reports}
            icon="person-check-fill"
            variant="purple"
            subtext={`${totals.in_progress_reports} currently in progress`}
          />
        </div>
        <div className="col-lg-3 col-sm-6">
          <StatisticsCard
            title="Resolution Rate"
            value={`${totals.resolution_rate}%`}
            icon="award-fill"
            variant="info"
            subtext={`${totals.resolved_reports} of ${totals.total_reports} resolved`}
          />
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="row g-4 mb-4">
        
        {/* Bar Chart: Zone-wise */}
        <div className="col-lg-7">
          <div className="dashboard-card h-100">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <div>
                <h5 className="fw-bold text-dark mb-0">Zone-Wise Violation Distribution</h5>
                <small className="text-muted">Total infractions mapped across KA01 to KA06</small>
              </div>
              <span className="badge bg-primary text-white">Bar Chart</span>
            </div>
            <div style={{ height: '300px' }}>
              <Bar
                data={zoneBarData}
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

        {/* Pie Chart: 5 Categories */}
        <div className="col-lg-5">
          <div className="dashboard-card h-100">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <div>
                <h5 className="fw-bold text-dark mb-0">Violation Categories Share</h5>
                <small className="text-muted">5 Predefined Categories (PV01 - PV05)</small>
              </div>
              <span className="badge bg-success text-white">Pie Chart</span>
            </div>
            <div style={{ height: '300px' }} className="d-flex align-items-center justify-content-center">
              <Pie
                data={categoryPieData}
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

      <div className="row g-4">
        
        {/* Line Chart: Daily Trends */}
        <div className="col-lg-8">
          <div className="dashboard-card h-100">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <div>
                <h5 className="fw-bold text-dark mb-0">Daily Incident Ingestion Trends</h5>
                <small className="text-muted">Report submission volume over time</small>
              </div>
              <span className="badge bg-info text-dark">Line Chart</span>
            </div>
            <div style={{ height: '280px' }}>
              <Line
                data={lineChartData}
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

        {/* Doughnut Chart: Priority Distribution */}
        <div className="col-lg-4">
          <div className="dashboard-card h-100">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <div>
                <h5 className="fw-bold text-dark mb-0">Priority Distribution</h5>
                <small className="text-muted">Urgency classification breakdown</small>
              </div>
              <span className="badge bg-secondary">Doughnut</span>
            </div>
            <div style={{ height: '280px' }} className="d-flex align-items-center justify-content-center">
              <Doughnut
                data={priorityDoughnutData}
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
    </div>
  );
}
