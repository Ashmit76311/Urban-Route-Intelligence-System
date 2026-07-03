import { useState } from 'react';
import { api } from '../api/client';

const TYPES = [
  { id: 'accident',  label: 'Accident',   icon: '🚗' },
  { id: 'crime',     label: 'Crime',      icon: '🚨' },
  { id: 'roadblock', label: 'Roadblock',  icon: '🚧' },
  { id: 'unsafe',    label: 'Unsafe Area',icon: '⚠️' },
];

export default function IncidentModal({ position, mapCenter, onClose }) {
  // Use GPS position if available, otherwise fall back to map center
  const reportPos = position ?? mapCenter;
  const usingMapCenter = !position && !!mapCenter;
  const [selectedType, setSelectedType] = useState(null);
  const [note, setNote]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState(null);

  const handleSubmit = async () => {
    if (!selectedType) { setError('Select an incident type'); return; }
    if (!reportPos)    { setError('Location unavailable'); return; }

    setSubmitting(true);
    setError(null);
    try {
      await api.post('/incidents', {
        type: selectedType,
        lat: reportPos.lat,
        lng: reportPos.lng,
        note: note.trim() || null,
      });
      setSubmitted(true);
      setTimeout(onClose, 1800);
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Submission failed. Try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {submitted ? (
          <div className="modal-success">
            <span className="success-icon">✓</span>
            <p>Incident reported. Risk map updating.</p>
          </div>
        ) : (
          <>
            <div className="modal-header">
              <h2>Report Incident</h2>
              <button className="modal-close" onClick={onClose}>✕</button>
            </div>

            <p className="modal-location">
              📍 {reportPos
                ? `${reportPos.lat.toFixed(4)}, ${reportPos.lng.toFixed(4)}`
                : 'Location unavailable'}
              {usingMapCenter && (
                <span className="modal-location-hint"> · Using map center</span>
              )}
            </p>

            <div className="type-chips">
              {TYPES.map(t => (
                <button
                  key={t.id}
                  className={`type-chip${selectedType === t.id ? ' active' : ''}`}
                  onClick={() => setSelectedType(t.id)}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <textarea
              className="modal-note"
              placeholder="Optional: add a note (max 280 chars)"
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 280))}
              rows={3}
            />

            {error && <p className="modal-error">{error}</p>}

            <button
              className="modal-submit"
              onClick={handleSubmit}
              disabled={submitting || !selectedType}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
