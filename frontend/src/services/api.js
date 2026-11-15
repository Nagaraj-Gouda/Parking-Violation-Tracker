/**
 * api.js - REST API Client for Parking Violation Tracker
 * Connects React frontend with Flask backend endpoints.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = (data && data.error) || (data && data.message) || response.statusText;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export const api = {
  // System Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  // Violation Categories
  async getCategories() {
    const res = await fetch(`${API_BASE}/categories`);
    return handleResponse(res);
  },

  // Automata Vehicle Validation (DFA + Regex real-time diagnostic)
  async validateVehicle(vehicleNumber) {
    const res = await fetch(`${API_BASE}/validate/vehicle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_number: vehicleNumber })
    });
    return handleResponse(res);
  },

  // Reports
  async getReports(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.zone) params.append('zone', filters.zone);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);

    const url = `${API_BASE}/reports${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  async getReport(id) {
    const res = await fetch(`${API_BASE}/reports/${id}`);
    return handleResponse(res);
  },

  async submitReport(reportData) {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });
    return handleResponse(res);
  },

  async updateReportStatus(id, status, comment = '', changedBy = 'Admin User') {
    const res = await fetch(`${API_BASE}/reports/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, comment, changed_by: changedBy })
    });
    return handleResponse(res);
  },

  async reassignReport(id, handlerId = null, notes = '') {
    const res = await fetch(`${API_BASE}/reports/${id}/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handler_id: handlerId, notes })
    });
    return handleResponse(res);
  },

  // Enforcement Handlers
  async getHandlers() {
    const res = await fetch(`${API_BASE}/handlers`);
    return handleResponse(res);
  },

  async toggleHandlerAvailability(handlerId, isAvailable = null) {
    const body = isAvailable !== null ? { is_available: isAvailable } : {};
    const res = await fetch(`${API_BASE}/handlers/${handlerId}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return handleResponse(res);
  },

  // Zones & Routing Table
  async getZones() {
    const res = await fetch(`${API_BASE}/zones`);
    return handleResponse(res);
  },

  // Analytics
  async getAnalytics() {
    const res = await fetch(`${API_BASE}/analytics`);
    return handleResponse(res);
  }
};
