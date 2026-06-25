function fmt(secs) {
  const m = Math.round(secs / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

function fmtDist(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function RouteCard({ label, icon, route, selected, accentColor, onClick }) {
  if (!route) return null;
  return (
    <div
      className={`route-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={{ borderColor: selected ? accentColor : 'rgba(255,255,255,0.08)' }}
    >
      <div className="route-card-top">
        <span className="route-label">{icon} {label}</span>
        <span
          className="risk-badge"
          style={{ background: route.risk_score !== null ? accentColor : '#334155' }}
        >
          {route.risk_score !== null ? `${route.risk_score}/100` : 'Risk: —'}
        </span>
      </div>
      <div className="route-card-stats">
        <span className="stat-primary">{fmt(route.duration)}</span>
        <span className="stat-secondary">{fmtDist(route.distance)}</span>
      </div>
      {selected && <div className="selected-indicator" style={{ background: accentColor }} />}
    </div>
  );
}

export default function RoutePanel({ routes, fastId, safeId, selectedId, onSelect, onStart }) {
  if (!routes.length) return null;

  const fast = routes.find((r) => r.id === fastId);
  const safe = routes.find((r) => r.id === safeId);

  return (
    <div className="route-panel">
      <div className="route-cards-row">
        <RouteCard
          label="Fastest"
          icon="⚡"
          route={fast}
          selected={selectedId === fastId}
          accentColor="#f59e0b"
          onClick={() => onSelect(fastId)}
        />
        <RouteCard
          label="Safest"
          icon="🛡"
          route={safe}
          selected={selectedId === safeId}
          accentColor="#22c55e"
          onClick={() => onSelect(safeId)}
        />
      </div>
      {selectedId !== null && (
        <button type="button" className="start-btn" onClick={onStart}>
          Start Navigation →
        </button>
      )}
      <p className="risk-note">Risk scores available in the next update.</p>
    </div>
  );
}
