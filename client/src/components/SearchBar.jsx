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

export default function SearchBar({ userLocation, onSourceSet, onDestSet }) {
  const [srcText, setSrcText] = useState('My Location');
  const [dstText, setDstText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeField, setActiveField] = useState(null);
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
    } else {
      setDstText(item.name);
      onDestSet(item.coordinates);
    }
    setSuggestions([]);
    setActiveField(null);
  };

  return (
    <div className="search-bar-container">
      <div className="search-inputs">
        <div className="input-row">
          <span className="input-dot src" />
          <input
            value={srcText}
            placeholder="Starting point"
            onFocus={() => {
              setActiveField('src');
              if (srcText === 'My Location') setSrcText('');
            }}
            onBlur={() => {
              if (!srcText) setSrcText('My Location');
            }}
            onChange={(e) => setSrcText(e.target.value)}
          />
        </div>
        <div className="input-divider" />
        <div className="input-row">
          <span className="input-dot dst" />
          <input
            value={dstText}
            placeholder="Where to?"
            onFocus={() => setActiveField('dst')}
            onChange={(e) => setDstText(e.target.value)}
          />
        </div>
      </div>
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
