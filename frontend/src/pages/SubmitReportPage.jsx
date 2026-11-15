import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function SubmitReportPage() {
  const navigate = useNavigate();

  // Form fields
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [violationCode, setViolationCode] = useState('PV01');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dateTime, setDateTime] = useState('');

  // Categories & Zones data
  const [categories, setCategories] = useState({});
  const [zones, setZones] = useState([]);

  // Live Automata Validation State
  const [validationData, setValidationData] = useState(null);
  const [validating, setValidating] = useState(false);

  // Form submission states
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    // Set current datetime default in format YYYY-MM-DDTHH:MM
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setDateTime(localIso);

    // Fetch categories and zones
    api.getCategories().then(res => setCategories(res.categories || {})).catch(console.error);
    api.getZones().then(res => setZones(res.zones || [])).catch(console.error);
  }, []);

  // Real-time DFA evaluation on change
  useEffect(() => {
    const trimmed = vehicleNumber.trim();
    if (!trimmed) {
      setValidationData(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setValidating(true);
        const res = await api.validateVehicle(trimmed);
        setValidationData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setValidating(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [vehicleNumber]);

  // Handle category change to auto-update default priority
  const handleCodeChange = (e) => {
    const code = e.target.value;
    setViolationCode(code);
    if (categories[code] && categories[code].default_priority) {
      setPriority(categories[code].default_priority);
    }
  };

  // Predict zone from prefix
  const predictedPrefix = vehicleNumber.trim().length >= 4 ? vehicleNumber.trim().substring(0, 4).toUpperCase() : '';
  const matchingZone = zones.find(z => z.prefix === predictedPrefix);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitSuccess(null);
    setSubmitting(true);

    try {
      const payload = {
        vehicle_number: vehicleNumber.trim(),
        violation_code: violationCode,
        description: description.trim(),
        location: location.trim(),
        priority: priority,
        date_time: dateTime ? dateTime.replace('T', ' ') + ':00' : null
      };

      const result = await api.submitReport(payload);
      setSubmitSuccess(result);

      // Reset form
      setVehicleNumber('');
      setDescription('');
      setLocation('');
      setValidationData(null);
    } catch (err) {
      setErrorMessage(err.data?.error || err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = categories[violationCode];

  return (
    <div className="row justify-content-center">
      <div className="col-xl-11">
        
        {/* Success Alert Banner */}
        {submitSuccess && (
          <div className="alert alert-success alert-dismissible fade show p-4 shadow-sm mb-4 rounded-3 border-success" role="alert">
            <div className="d-flex align-items-start gap-3">
              <i className="bi bi-check-circle-fill text-success fs-3"></i>
              <div className="flex-grow-1">
                <h5 className="alert-heading fw-bold mb-1">Violation Report Successfully Logged & Routed!</h5>
                <p className="mb-2">
                  Generated Unique Report ID:{' '}
                  <span className="font-mono fw-bold text-dark bg-white px-2 py-1 rounded border">
                    {submitSuccess.report.report_id}
                  </span>
                </p>
                <div className="row g-2 small text-secondary">
                  <div className="col-md-4">
                    <strong>Vehicle:</strong> {submitSuccess.report.vehicle_number} (DFA & Regex Agreed)
                  </div>
                  <div className="col-md-4">
                    <strong>Category:</strong> {submitSuccess.report.violation_category} ({submitSuccess.report.violation_code})
                  </div>
                  <div className="col-md-4">
                    <strong>Routing Outcome:</strong>{' '}
                    <span className="badge bg-primary text-white">
                      {submitSuccess.routing.status} - {submitSuccess.routing.zone || 'Central Correction'}
                    </span>
                  </div>
                </div>
                {submitSuccess.routing.message && (
                  <div className="mt-2 small fst-italic text-muted">
                    <i className="bi bi-info-circle me-1"></i> {submitSuccess.routing.message}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 pt-2 border-top d-flex gap-2">
              <button className="btn btn-sm btn-primary" onClick={() => navigate('/reports')}>
                <i className="bi bi-card-checklist me-1"></i> View in User Dashboard
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setSubmitSuccess(null)}>
                Submit Another Report
              </button>
            </div>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="alert alert-danger alert-dismissible fade show p-3 shadow-sm mb-4 rounded-3" role="alert">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-shield-x fs-4 text-danger"></i>
              <div>
                <strong>Validation or Submission Error:</strong> {errorMessage}
              </div>
            </div>
            <button type="button" className="btn-close" onClick={() => setErrorMessage(null)}></button>
          </div>
        )}

        <div className="row g-4">
          
          {/* Main Submission Form */}
          <div className="col-lg-7">
            <div className="dashboard-card">
              <div className="border-bottom pb-3 mb-4">
                <h4 className="fw-bold text-dark mb-1">
                  <i className="bi bi-file-earmark-plus-fill text-primary me-2"></i>
                  File Parking Infraction
                </h4>
                <p className="text-muted small mb-0">
                  Every submission is mathematically validated through a Deterministic Finite Automaton (DFA)
                  and regular expression engine before automated zone dispatch.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                
                {/* 1. Vehicle Registration Number */}
                <div className="mb-3">
                  <label className="form-label-custom">
                    <span>1. Vehicle Registration Number <span className="text-danger">*</span></span>
                    <span className="badge bg-light text-muted font-mono" style={{ fontSize: '11px' }}>
                      [A-Z]{'{2}'}[0-9]{'{2}'}[A-Z]{'{1,2}'}[0-9]{'{4}'}
                    </span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted font-mono">
                      <i className="bi bi-car-front-fill"></i>
                    </span>
                    <input
                      type="text"
                      className={`form-control font-mono fw-bold fs-6 ${
                        validationData
                          ? validationData.valid
                            ? 'is-valid'
                            : 'is-invalid'
                          : ''
                      }`}
                      placeholder="e.g. KA01AB1234 or KA01A1234"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      required
                    />
                    {validating && (
                      <span className="input-group-text bg-white">
                        <span className="spinner-border spinner-border-sm text-primary" role="status"></span>
                      </span>
                    )}
                  </div>
                  <div className="form-text small">
                    Must be uppercase Indian registration without spaces or hyphens (e.g., KA01AB1234).
                  </div>
                </div>

                {/* 2. Violation Code */}
                <div className="mb-3">
                  <label className="form-label-custom">
                    <span>2. Violation Code & Category <span className="text-danger">*</span></span>
                    <span className="badge bg-light text-muted font-mono" style={{ fontSize: '11px' }}>
                      PV[0-9]{'{2}'}
                    </span>
                  </label>
                  <select
                    className="form-select-custom"
                    value={violationCode}
                    onChange={handleCodeChange}
                    required
                  >
                    {Object.values(categories).map((cat) => (
                      <option key={cat.code} value={cat.code}>
                        {cat.code} - {cat.name} ({cat.title})
                      </option>
                    ))}
                  </select>
                  {selectedCategory && (
                    <div className="bg-light p-2 rounded mt-2 border small">
                      <div className="fw-semibold text-dark">{selectedCategory.title}</div>
                      <div className="text-muted">{selectedCategory.description}</div>
                      <div className="d-flex gap-3 mt-1 text-secondary">
                        <span><strong>Standard Fine:</strong> ₹{selectedCategory.fine_amount}</span>
                        <span><strong>Default Severity:</strong> {selectedCategory.default_priority}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Violation Description */}
                <div className="mb-3">
                  <label className="form-label-custom">
                    <span>3. Violation Description / Evidence Remarks</span>
                  </label>
                  <textarea
                    className="form-control-custom"
                    rows="3"
                    placeholder="Specific details regarding the parking infraction, obstruction context, or driver behavior..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  ></textarea>
                </div>

                {/* 4. Violation Location */}
                <div className="mb-3">
                  <label className="form-label-custom">
                    <span>4. Exact Violation Location <span className="text-danger">*</span></span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light text-muted">
                      <i className="bi bi-geo-alt-fill text-danger"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Street name, landmark, bay number, or pillar reference"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* 5. Enforcement Zone (Auto-detected) */}
                <div className="mb-3">
                  <label className="form-label-custom">
                    <span>5. Enforcement Zone (Auto-Routed via Prefix)</span>
                  </label>
                  <div className="p-3 bg-light rounded border d-flex align-items-center justify-content-between">
                    <div>
                      <div className="fw-bold text-dark">
                        {matchingZone ? (
                          <>
                            <span className="badge bg-primary text-white me-2">{matchingZone.code}</span>
                            <span>{matchingZone.team_name}</span>
                          </>
                        ) : predictedPrefix ? (
                          <span className="badge bg-danger text-white">
                            Prefix '{predictedPrefix}' Unmapped - Central Correction Queue
                          </span>
                        ) : (
                          <span className="text-muted fst-italic">Awaiting vehicle prefix...</span>
                        )}
                      </div>
                      <small className="text-muted">
                        {matchingZone ? matchingZone.description : 'Static 6-zone routing table lookup'}
                      </small>
                    </div>
                    <i className="bi bi-signpost-split-fill fs-3 text-secondary"></i>
                  </div>
                </div>

                {/* 6. Urgency / Priority */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label-custom">
                      <span>6. Urgency / Priority <span className="text-danger">*</span></span>
                    </label>
                    <select
                      className="form-select-custom"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="Emergency / Critical">Emergency / Critical (Immediate Towing)</option>
                      <option value="High">High (Active Obstruction)</option>
                      <option value="Medium">Medium (Overstay / Wrong-Zone)</option>
                      <option value="Low">Low (Minor Infraction)</option>
                    </select>
                  </div>

                  {/* 7. Date and Time */}
                  <div className="col-md-6">
                    <label className="form-label-custom">
                      <span>7. Incident Date and Time <span className="text-danger">*</span></span>
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control-custom"
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* 8. Submit Button */}
                <div className="mt-4 pt-2 border-top">
                  <button
                    type="submit"
                    className="btn btn-primary-custom w-100 py-3"
                    disabled={submitting || (validationData && !validationData.valid)}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Validating DFA & Dispatching Incident...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-shield-check fs-5"></i>
                        <span>Validate Automata & Submit Report</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>

          {/* Right Column: Real-Time Automata Theory (DFA + Regex) Inspector */}
          <div className="col-lg-5">
            <div className="dashboard-card mb-4">
              <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
                <h5 className="fw-bold text-dark mb-0">
                  <i className="bi bi-cpu-fill text-info me-2"></i>
                  Part A: Automata Inspector
                </h5>
                <span className="badge bg-dark font-mono text-light">DFA M = (Q, Σ, δ, q₀, F)</span>
              </div>

              <p className="text-muted small">
                Character-by-character transition monitoring for input:{' '}
                <strong className="font-mono text-dark">{vehicleNumber || '—'}</strong>
              </p>

              {/* Status Comparison Pill */}
              <div className="card p-3 mb-3 border bg-light">
                <div className="row g-2 text-center">
                  <div className="col-6 border-end">
                    <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '11px' }}>DFA Engine</small>
                    {validationData ? (
                      validationData.dfa_result ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          <i className="bi bi-check-circle-fill me-1"></i> Accepted (q₁₀)
                        </span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                          <i className="bi bi-x-circle-fill me-1"></i> Rejected (Dead)
                        </span>
                      )
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary">Idle</span>
                    )}
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block text-uppercase fw-bold" style={{ fontSize: '11px' }}>Regex Engine</small>
                    {validationData ? (
                      validationData.regex_result ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          <i className="bi bi-check-circle-fill me-1"></i> Full Match
                        </span>
                      ) : (
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                          <i className="bi bi-x-circle-fill me-1"></i> No Match
                        </span>
                      )
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary">Idle</span>
                    )}
                  </div>
                </div>

                {validationData && (
                  <div className="mt-2 text-center">
                    <span className={`badge ${validationData.agreement ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '11px' }}>
                      <i className={`bi ${validationData.agreement ? 'bi-patch-check-fill' : 'bi-exclamation-triangle-fill'} me-1`}></i>
                      {validationData.agreement ? 'DFA & Regex Engines in 100% Agreement' : 'Automata Engines Disagree!'}
                    </span>
                  </div>
                )}
              </div>

              {/* Character State Trace Stepper */}
              <h6 className="fw-bold text-dark small mb-2">Character-by-Character State Trace:</h6>
              <div className="dfa-visualizer-box" style={{ maxHeight: '250px' }}>
                {validationData && validationData.dfa_trace && validationData.dfa_trace.length > 0 ? (
                  validationData.dfa_trace.map((step) => (
                    <div key={step.step} className="d-flex align-items-center mb-1 pb-1 border-bottom border-secondary">
                      <span className="text-info fw-bold me-2 font-mono">[{step.step}]</span>
                      <span className="badge bg-primary text-white font-mono me-2">'{step.character}'</span>
                      <span className="text-secondary font-mono">q{step.from_state} &rarr; </span>
                      <span className={`ms-1 fw-bold font-mono ${step.to_state === 10 ? 'text-success' : step.to_state === -1 ? 'text-danger' : 'text-warning'}`}>
                        {step.to_state === -1 ? 'DEAD' : `q${step.to_state}`}
                      </span>
                      <span className="ms-auto text-muted small text-truncate" style={{ maxWidth: '140px' }}>
                        {step.to_state === 10 ? 'Accept' : step.to_state === -1 ? 'Trap State' : `Step ${step.step}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-secondary fst-italic py-3 text-center">
                    Type a vehicle registration number to watch the DFA state transitions unfold live.
                  </div>
                )}
              </div>

              {/* Sample Quick Fill Helpers */}
              <div className="mt-3">
                <small className="text-muted fw-bold d-block mb-1 text-uppercase" style={{ fontSize: '10px' }}>
                  Demonstration Quick-Fill Presets:
                </small>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-0 font-mono"
                    style={{ fontSize: '11px' }}
                    onClick={() => {
                      setVehicleNumber('KA01AB1234');
                      setLocation('MG Road Brigade Junction');
                    }}
                  >
                    KA01AB1234 (Zone 1)
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-0 font-mono"
                    style={{ fontSize: '11px' }}
                    onClick={() => {
                      setVehicleNumber('KA02CD5678');
                      setLocation('Rajajinagar Metro Station');
                    }}
                  >
                    KA02CD5678 (Zone 2)
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-0 font-mono"
                    style={{ fontSize: '11px' }}
                    onClick={() => {
                      setVehicleNumber('DL01AB9999');
                      setLocation('Outer Ring Road Flyover');
                    }}
                  >
                    DL01AB9999 (Unknown)
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger py-0 font-mono"
                    style={{ fontSize: '11px' }}
                    onClick={() => {
                      setVehicleNumber('ka01ab1234');
                      setLocation('Test');
                    }}
                  >
                    ka01ab1234 (Invalid)
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
