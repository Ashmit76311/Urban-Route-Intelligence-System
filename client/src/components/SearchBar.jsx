import { useState, useEffect } from 'react';
import { api } from '../api/client';

function useDebounce(value, ms = 350) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return deb;
}

function fmtTime(secs) {
  if (!secs) return '—';
  const m = Math.round(secs / 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  }
  return `${m}m`;
}

const MODES = [
  { id: 'driving', icon: '↱', fallback: 'Best' },
];

export default function SearchBar({ userLocation, onSourceSet, onDestSet, onSourceName, onDestName, drivingDuration }) {
  const [srcText, setSrcText] = useState('My Location');
  const [dstText, setDstText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [activeMode, setActiveMode] = useState('driving');
  const debouncedSrc = useDebounce(srcText);
  const debouncedDst = useDebounce(dstText);

  const fetchSuggestions = async (q, field) => {
    if (!q || q === 'My Location') {
      setSuggestions([]);
      return;
    }
    try {
      const { data } = await api.get('/geocode', { params: { q } });
      setSuggestions(data.suggestions.map((s) => ({ ...s, field })));
    } catch {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    if (activeField === 'src') fetchSuggestions(debouncedSrc, 'src');
  }, [debouncedSrc, activeField]);

  useEffect(() => {
    if (activeField === 'dst') fetchSuggestions(debouncedDst, 'dst');
  }, [debouncedDst, activeField]);

  useEffect(() => {
    if (userLocation && srcText === 'My Location') {
      onSourceSet([userLocation.lng, userLocation.lat]);
    }
  }, [userLocation, srcText, onSourceSet]);

  const onSelect = (item) => {
    if (item.field === 'src') {
      setSrcText(item.name);
      onSourceSet(item.coordinates);
      onSourceName?.(item.name);
    } else {
      setDstText(item.name);
      onDestSet(item.coordinates);
      onDestName?.(item.name);
    }
    setSuggestions([]);
    setActiveField(null);
  };

  const swap = () => {
    const tmpText = srcText;
    setSrcText(dstText);
    setDstText(tmpText);
  };

  // Compute estimated times for each mode based on driving duration
  const modeLabels = {
    driving: drivingDuration ? fmtTime(drivingDuration) : '',
  };

  return (
    <div className="search-bar-container">
      {/* Transport mode tabs */}
      <div className="mode-tabs">
        {MODES.map(m => (
          <button
            key={m.id}
            className={`mode-tab${activeMode === m.id ? ' active' : ''}`}
            onClick={() => setActiveMode(m.id)}
          >
            <span className="mode-icon">{m.icon}</span>
            <span className="mode-label">{modeLabels[m.id]}</span>
          </button>
        ))}
      </div>

      {/* Inputs with Google Maps-style dots */}
      <div className="search-inputs-gm">
        {/* Left dot column */}
        <div className="dot-column">
          <span className="gm-dot src-dot" />
          <span className="gm-connector" />
          <span className="gm-dot dst-dot" />
        </div>

        {/* Input fields */}
        <div className="input-column">
          <input
            className="gm-input"
            value={srcText}
            placeholder="Choose starting point, or click on the map"
            onFocus={() => {
              setActiveField('src');
              if (srcText === 'My Location') setSrcText('');
            }}
            onBlur={() => {
              if (!srcText) setSrcText('My Location');
            }}
            onChange={(e) => setSrcText(e.target.value)}
          />
          <div className="gm-input-divider" />
          <input
            className="gm-input"
            value={dstText}
            placeholder="Choose destination"
            onFocus={() => setActiveField('dst')}
            onChange={(e) => setDstText(e.target.value)}
          />
        </div>

        {/* Swap button */}
        <button className="swap-btn" onClick={swap} title="Swap origin and destination">
          ⇅
        </button>
      </div>

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((s) => (
            <li key={s.id} onMouseDown={() => onSelect(s)}>
              <span className="suggestion-icon">📍</span>
              <span>{s.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
