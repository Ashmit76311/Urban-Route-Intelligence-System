function fmtDist(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
function fmtTime(secs) {
  const m = Math.round(secs / 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm > 0 ? `${h} hr ${rm} min` : `${h} hr`;
  }
  return `${m} min`;
}

function riskBadge(score) {
  if (score === null || score === undefined) return null;
  const cls = score >= 70 ? 'risk-high' : score >= 40 ? 'risk-med' : 'risk-low';
  const label = score >= 70 ? 'HIGH' : score >= 40 ? 'MED' : 'LOW';
  return <span className={`dir-risk-badge ${cls}`}>{score}/100 {label}</span>;
}

export default function DirectionsPanel({
  route, source, destination, onStart, onClose,
}) {
  if (!route) return null;

  const steps = route.steps ?? [];

  return (
    <div className="dir-panel-overlay">
      <div className="dir-panel">

        {/* Header */}
        <div className="dir-header">
          <button className="dir-back" onClick={onClose}>←</button>
          <div className="dir-header-text">
            <span className="dir-from-to">
              from <strong>{source}</strong>
            </span>
            <span className="dir-from-to">
              to <strong>{destination}</strong>
            </span>
          </div>
          <button className="dir-close" onClick={onClose}>✕</button>
        </div>

        {/* Summary */}
        <div className="dir-summary">
          <span className="dir-time">{fmtTime(route.duration)}</span>
          <span className="dir-dist">({fmtDist(route.distance)})</span>
          {riskBadge(route.risk_score)}
        </div>
        {route.weather_severity > 0.3 && (
          <div className="dir-weather">⚠ Weather may affect conditions</div>
        )}

        {/* Steps list */}
        <div className="dir-steps">
          {/* Origin */}
          <div className="dir-step dir-origin">
            <div className="dir-step-icon">
              <span className="dir-dot origin-dot" />
            </div>
            <div className="dir-step-text">
              <span className="dir-step-place">{source}</span>
            </div>
          </div>

          {steps.map((step, i) => (
            <div className="dir-step" key={i}>
              <div className="dir-step-icon">
                <StepArrow type={step.type} />
              </div>
              <div className="dir-step-text">
                <span className="dir-step-instruction">{step.instruction}</span>
                <span className="dir-step-meta">{fmtTime(step.duration)} ({fmtDist(step.distance)})</span>
              </div>
            </div>
          ))}

          {/* Destination */}
          <div className="dir-step dir-destination">
            <div className="dir-step-icon">
              <span className="dir-dot dest-dot" />
            </div>
            <div className="dir-step-text">
              <span className="dir-step-place">{destination}</span>
            </div>
          </div>
        </div>

        {/* Start button */}
        <div className="dir-footer">
          <button className="dir-start-btn" onClick={onStart}>
            Start Navigation →
          </button>
        </div>
      </div>
    </div>
  );
}

function StepArrow({ type }) {
  const t = (type ?? '').toLowerCase();
  let arrow = '›';
  if (t.includes('left'))       arrow = '↰';
  else if (t.includes('right')) arrow = '↱';
  else if (t.includes('straight') || t === 'depart') arrow = '↑';
  else if (t.includes('uturn'))  arrow = '↩';
  else if (t.includes('arrive'))arrow = '◉';
  else if (t.includes('roundabout')) arrow = '↻';
  else if (t.includes('merge')) arrow = '⤴';
  else if (t.includes('fork'))  arrow = '⑂';
  return <span className="dir-step-arrow">{arrow}</span>;
}
