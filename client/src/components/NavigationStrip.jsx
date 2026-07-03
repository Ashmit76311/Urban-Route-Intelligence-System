function fmtDist(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

// SVG maneuver arrows — Google Maps style
function ManeuverArrow({ type }) {
  const t = (type ?? '').toLowerCase();

  const arrows = {
    depart:        <path d="M12 4 L12 16 M12 4 L7 9 M12 4 L17 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    straight:      <path d="M12 4 L12 18 M12 4 L7 9 M12 4 L17 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    'turn left':   <><path d="M18 18 L18 10 Q18 6 14 6 L6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M9 3 L6 6 L9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    'turn right':  <><path d="M6 18 L6 10 Q6 6 10 6 L18 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M15 3 L18 6 L15 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    'slight left': <><path d="M18 18 L18 12 Q17 7 11 6 L8 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M11 3 L8 6 L11 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    'slight right':<><path d="M6 18 L6 12 Q7 7 13 6 L16 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M13 3 L16 6 L13 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    'sharp left':  <><path d="M18 18 L18 14 Q18 8 8 8 L8 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M5 7 L8 4 L11 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    'sharp right': <><path d="M6 18 L6 14 Q6 8 16 8 L16 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M13 7 L16 4 L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    uturn:         <><path d="M8 18 L8 10 Q8 4 14 4 Q20 4 20 10 L20 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M17 17 L20 14 L23 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    roundabout:    <><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M12 4 L12 7 M12 4 L9.5 6.5 M12 4 L14.5 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/></>,
    merge:         <><path d="M9 18 L12 12 M15 18 L12 12 M12 12 L12 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M9 7 L12 4 L15 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    fork:          <><path d="M12 18 L12 12 M12 12 L8 6 M12 12 L16 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    arrive:        <><path d="M12 3 L12 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/><circle cx="12" cy="18" r="2.5" fill="currentColor"/></>,
  };

  // Find best match
  let icon = arrows['straight'];
  for (const [key, svg] of Object.entries(arrows)) {
    if (t === key || t.includes(key) || key.includes(t)) {
      icon = svg;
      break;
    }
  }

  return (
    <svg viewBox="0 0 24 24" width="36" height="36" className="maneuver-svg">
      {icon}
    </svg>
  );
}

function riskColor(score) {
  if (!score && score !== 0) return '#22c55e';
  if (score >= 65) return '#ef4444';
  if (score >= 35) return '#f59e0b';
  return '#22c55e';
}

function riskLabel(score) {
  if (!score && score !== 0) return null;
  if (score >= 65) return 'HIGH RISK';
  if (score >= 35) return 'MODERATE';
  return 'LOW RISK';
}

export default function NavigationStrip({
  currentStep, nextStep, stepIndex, totalSteps,
  arrived, riskScore, onReroute, onExit,
}) {
  const isHighRisk = riskScore >= 65;
  const progress = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;
  const color = riskColor(riskScore);

  if (arrived) {
    return (
      <div className="nav-strip arrived">
        <div className="nav-arrived-content">
          <div className="nav-maneuver-box" style={{ background: '#22c55e' }}>
            <svg viewBox="0 0 24 24" width="36" height="36" className="maneuver-svg">
              <path d="M9 12 L11 14 L15 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <div className="nav-text">
            <span className="nav-arrived-label">You have arrived</span>
          </div>
          <button className="nav-exit-btn" onClick={onExit}>Done ✓</button>
        </div>
        <div className="nav-progress-bar">
          <div className="nav-progress-fill" style={{ width: '100%', background: '#22c55e' }} />
        </div>
      </div>
    );
  }

  if (!currentStep) return null;

  return (
    <div className={`nav-strip${isHighRisk ? ' high-risk' : ''}`}>
      <div className="nav-main-row">

        {/* Maneuver icon box */}
        <div className="nav-maneuver-box" style={{ background: color }}>
          <ManeuverArrow type={currentStep.type} />
        </div>

        {/* Instruction block */}
        <div className="nav-text">
          <span className="nav-distance">{fmtDist(currentStep.distance)}</span>
          <span className="nav-instruction">{currentStep.instruction}</span>
          {nextStep && (
            <div className="nav-next-row">
              <span className="nav-next-label">Then:</span>
              <span className="nav-next">{nextStep.instruction}</span>
            </div>
          )}
        </div>

        {/* Meta — steps, risk, exit */}
        <div className="nav-meta">
          <button className="nav-exit-btn-sm" onClick={onExit} title="Exit navigation">✕</button>
          <span className="nav-step-count">{stepIndex + 1}/{totalSteps}</span>
          {riskScore !== null && (
            <span className="nav-risk-pill" style={{ background: color }}>
              {Math.round(riskScore)}
            </span>
          )}
        </div>
      </div>

      {/* Reroute warning */}
      {isHighRisk && (
        <div className="nav-reroute-bar">
          ⚠ High-risk zone ahead.{' '}
          <button className="nav-reroute-btn" onClick={onReroute}>Find safer route</button>
        </div>
      )}

      {/* Risk label ticker */}
      {riskLabel(riskScore) && (
        <div className="nav-risk-bar" style={{ background: color + '22', borderTop: `2px solid ${color}40` }}>
          <span style={{ color }}>● {riskLabel(riskScore)} AREA</span>
        </div>
      )}

      {/* Progress */}
      <div className="nav-progress-bar">
        <div className="nav-progress-fill" style={{ width: `${progress}%`, background: color }} />
      </div>
    </div>
  );
}
