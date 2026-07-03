import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

const Map = forwardRef(({ userLocation, livePosition, onMove, theme }, ref) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
  }));

  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: theme === 'light'
        ? 'mapbox://styles/mapbox/light-v11'
        : 'mapbox://styles/mapbox/dark-v11',
      center: userLocation
        ? [userLocation.lng, userLocation.lat]
        : [77.209, 28.6139],
      zoom: 13,
      attributionControl: false,
    });

    mapRef.current.addControl(new mapboxgl.AttributionControl(), 'bottom-left');
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    // Emit center on every move so App can pass it to IncidentModal
    mapRef.current.on('move', () => {
      const c = mapRef.current.getCenter();
      onMove?.({ lat: parseFloat(c.lat.toFixed(5)), lng: parseFloat(c.lng.toFixed(5)) });
    });
    // emit once on load
    mapRef.current.on('load', () => {
      const c = mapRef.current.getCenter();
      onMove?.({ lat: parseFloat(c.lat.toFixed(5)), lng: parseFloat(c.lng.toFixed(5)) });
    });

    return () => {
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch Mapbox style when theme changes
  useEffect(() => {
    if (!mapRef.current) return;
    const style = theme === 'light'
      ? 'mapbox://styles/mapbox/light-v11'
      : 'mapbox://styles/mapbox/dark-v11';
    mapRef.current.setStyle(style);
  }, [theme]);

  useEffect(() => {
    if (!userLocation || !mapRef.current) return;

    mapRef.current.easeTo({ center: [userLocation.lng, userLocation.lat], zoom: 13 });

    markerRef.current?.remove();
    markerRef.current = new mapboxgl.Marker({ color: '#3b82f6', scale: 0.8 })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(mapRef.current);
  }, [userLocation]);

  useEffect(() => {
    if (!livePosition || !mapRef.current) return;
    const { lat, lng } = livePosition;
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      markerRef.current = new mapboxgl.Marker({ color: '#3b82f6', scale: 0.8 })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
    }
    mapRef.current.easeTo({ center: [lng, lat], zoom: 16, duration: 800 });
  }, [livePosition]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        zIndex: 0,
      }}
    />
  );
});

export default Map;
