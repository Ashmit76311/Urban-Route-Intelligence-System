import { useRef, useState, useEffect } from 'react';
import Map from './components/Map';
import SearchBar from './components/SearchBar';
import RoutePanel from './components/RoutePanel';
import { useGeolocation } from './hooks/useGeolocation';
import { useRoutes } from './hooks/useRoutes';
import { useRouteLines } from './hooks/useRouteLines';
import './index.css';

export default function App() {
  const mapRef = useRef(null);
  const { location: userLocation } = useGeolocation();
  const [source, setSource] = useState(null);
  const [destination, setDestination] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const { routes, fastId, safeId, loading, error } = useRoutes(source, destination);

  useEffect(() => {
    if (routes.length && fastId !== null) {
      setSelectedId(fastId);
    }
  }, [routes, fastId]);

  useEffect(() => {
    if (!destination) {
      setSelectedId(null);
    }
  }, [destination]);

  useRouteLines(mapRef, routes, fastId, safeId, selectedId);

  return (
    <div className="app">
      <Map ref={mapRef} userLocation={userLocation} />

      <SearchBar
        userLocation={userLocation}
        onSourceSet={setSource}
        onDestSet={setDestination}
      />

      {loading && <div className="toast">Finding routes...</div>}
      {error && <div className="toast error">{error}</div>}

      <RoutePanel
        routes={routes}
        fastId={fastId}
        safeId={safeId}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onStart={() => {
          alert('Navigation — coming in Phase 3');
        }}
      />
    </div>
  );
}
