import { useRef, useState, useCallback, useEffect } from 'react';
import Map from './components/Map';
import SearchBar from './components/SearchBar';
import RoutePanel from './components/RoutePanel';
import HeatmapLayer from './components/HeatmapLayer';
import NavigationStrip from './components/NavigationStrip';
import DirectionsPanel from './components/DirectionsPanel';
import IncidentModal from './components/IncidentModal';
import ThemeToggle from './components/ThemeToggle';
import { useGeolocation } from './hooks/useGeolocation';
import { useRoutes } from './hooks/useRoutes';
import { useRouteLines } from './hooks/useRouteLines';
import { useLiveLocation } from './hooks/useLiveLocation';
import { useNavigation } from './hooks/useNavigation';
import './index.css';

export default function App() {
  const mapRef = useRef(null);
  const { location: userLocation } = useGeolocation();

  const [source, setSource]           = useState(null);
  const [destination, setDestination] = useState(null);
  const [selectedId, setSelectedId]   = useState(null);
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [mapCenter, setMapCenter]     = useState({ lat: 28.6139, lng: 77.209 });

  // Theme
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('uris-theme') ?? 'dark'
  );
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('uris-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // Navigation mode
  const [navigating, setNavigating]       = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [showReroute, setShowReroute]     = useState(false);
  const [showIncident, setShowIncident]   = useState(false);

  // Place names for DirectionsPanel
  const [sourceName, setSourceName] = useState('My Location');
  const [destName, setDestName]     = useState('');

  const { routes, fastId, safeId, loading, error, refetch } = useRoutes(source, destination);

  if (routes.length && selectedId === null && fastId !== null) setSelectedId(fastId);

  const selectedRoute = routes.find(r => r.id === selectedId) ?? null;

  // Live location — only active during navigation
  const handleHighRisk = useCallback((score) => {
    setShowReroute(true);
  }, []);

  const { position, riskScore } = useLiveLocation({
    active: navigating,
    onHighRiskEntered: handleHighRisk,
  });

  // Step tracking
  const { currentStep, nextStep, stepIndex, totalSteps, arrived } = useNavigation({
    steps: selectedRoute?.steps ?? [],
    position,
    active: navigating,
  });

  useRouteLines(mapRef, routes, fastId, safeId, selectedId);

  // Move user marker during navigation
  // (Map component handles the static initial dot; navigation dot handled here via effect)

  const startNavigation = () => {
    setNavigating(true);
    setShowReroute(false);
    // Tighten zoom on selected route
    const map = mapRef.current?.getMap();
    if (map && position) {
      map.easeTo({ center: [position.lng, position.lat], zoom: 16 });
    }
  };

  const exitNavigation = () => {
    setNavigating(false);
    setShowDirections(false);
    setShowReroute(false);
    setSelectedId(null);
    setDestination(null);
  };

  const handleReroute = () => {
    setShowReroute(false);
    setNavigating(false);
    // refetch routes — same source/dest, will pick new safe route
    refetch();
  };

  return (
    <div className="app">
      <Map ref={mapRef} userLocation={userLocation} livePosition={position} onMove={setMapCenter} theme={theme} />
      <HeatmapLayer mapRef={mapRef} visible={heatmapVisible} onLoadingChange={setHeatmapLoading} />
      <ThemeToggle theme={theme} onToggle={toggleTheme} />

      {!navigating && (
        <SearchBar
          userLocation={userLocation}
          onSourceSet={setSource}
          onDestSet={setDestination}
          onSourceName={setSourceName}
          onDestName={setDestName}
          drivingDuration={routes.find(r => r.id === fastId)?.duration}
        />
      )}

      {loading && <div className="toast">Finding routes...</div>}
      {error   && <div className="toast error">{error}</div>}

      {navigating ? (
        <NavigationStrip
          currentStep={currentStep}
          nextStep={nextStep}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          arrived={arrived}
          riskScore={riskScore}
          onReroute={handleReroute}
          onExit={exitNavigation}
        />
      ) : (
        <RoutePanel
          routes={routes}
          fastId={fastId}
          safeId={safeId}
          selectedId={selectedId}
          heatmapVisible={heatmapVisible}
          heatmapLoading={heatmapLoading}
          onSelect={setSelectedId}
          onHeatmapToggle={() => setHeatmapVisible(v => !v)}
          onStart={() => setShowDirections(true)}
          onReportIncident={() => setShowIncident(true)}
        />
      )}

      {showDirections && !navigating && (
        <DirectionsPanel
          route={selectedRoute}
          source={sourceName}
          destination={destName}
          onStart={() => { setShowDirections(false); startNavigation(); }}
          onClose={() => setShowDirections(false)}
        />
      )}

      {showIncident && (
        <IncidentModal
          position={position ?? userLocation ?? mapCenter}
          mapCenter={mapCenter}
          onClose={() => setShowIncident(false)}
        />
      )}
    </div>
  );
}
