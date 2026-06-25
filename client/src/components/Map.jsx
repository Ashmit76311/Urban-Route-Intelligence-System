import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

const Map = forwardRef(({ userLocation }, ref) => {
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
      style: 'mapbox://styles/mapbox/dark-v11',
      center: userLocation
        ? [userLocation.lng, userLocation.lat]
        : [77.209, 28.6139],
      zoom: 13,
      attributionControl: false,
    });

    mapRef.current.addControl(new mapboxgl.AttributionControl(), 'bottom-left');
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    return () => {
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!userLocation || !mapRef.current) return;

    mapRef.current.easeTo({ center: [userLocation.lng, userLocation.lat], zoom: 13 });

    markerRef.current?.remove();
    markerRef.current = new mapboxgl.Marker({ color: '#3b82f6', scale: 0.8 })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(mapRef.current);
  }, [userLocation]);

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
