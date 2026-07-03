function fmt(secs) {
  const m = Math.round(secs / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

function fmtDist(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function riskLabel(score) {
  if (score === null) return { text: '—', cls: 'risk-unknown' };
  if (score >= 70)   return { text: `${score}/100 ⚠ HIGH`,   cls: 'risk-high' };
  if (score >= 40)   return { text: `${score}/100 ~ MED`,    cls: 'risk-med' };
  return               { text: `${score}/100 ✓ LOW`,          cls: 'risk-low' };
}

function RouteCard({ label, icon, route, selected, accentColor, onClick }) {
  if (!route) return null;
  const { text, cls } = riskLabel(route.risk_score);
  return (
    <div
      className={`route-card${selected ? ' selected' : ''}`}
      onClick={onClick}
      style={{ borderColor: selected ? accentColor : 'rgba(255,255,255,0.08)' }}
    >
      <div className="route-card-top">
        <span className="route-label">{icon} {label}</span>
        <span className={`risk-badge ${cls}`}>{text}</span>
      </div>
      <div className="route-card-stats">
        <span className="stat-primary">{fmt(route.duration)}</span>
        <span className="stat-secondary">{fmtDist(route.distance)}</span>
      </div>
      {route.weather_severity > 0.3 && (
        <div className="weather-warning">⚠ Risk elevated by weather</div>
      )}
      {selected && <div className="selected-indicator" style={{ background: accentColor }} />}
    </div>
  );
}

export default function RoutePanel({
  routes, fastId, safeId, selectedId,
  heatmapVisible, heatmapLoading, onSelect, onHeatmapToggle, onStart, onReportIncident,
}) {
  if (!routes.length) return null;

  const fast = routes.find(r => r.id === fastId);
  const safe = routes.find(r => r.id === safeId);

  return (
    <div className="route-panel">
      <div className="route-cards-row">
        <RouteCard
          label="Fastest" icon="⚡"
          route={fast} selected={selectedId === fastId}
          accentColor="#f59e0b"
          onClick={() => onSelect(fastId)}
        />
        <RouteCard
          label="Safest" icon="🛡"
          route={safe} selected={selectedId === safeId}
          accentColor="#22c55e"
          onClick={() => onSelect(safeId)}
        />
      </div>

      {/* Secondary controls row */}
      <div className="panel-secondary-row">
        <button className="layer-toggle" onClick={onHeatmapToggle}>
          {heatmapVisible ? (heatmapLoading ? '⏳ Loading...' : '🗺 Hide Risk') : '🗺 Show Risk'}
        </button>
        <button className="report-btn" onClick={onReportIncident}>
          ⚠ Report
        </button>
      </div>

      {/* Primary CTA */}
      {selectedId !== null && (
        <button className="start-btn" onClick={onStart}>
          Start Navigation →
        </button>
      )}
    </div>
  );
}
