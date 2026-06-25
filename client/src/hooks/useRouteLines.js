import { useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

const ROUTE_COLORS = {
  fast: '#f59e0b',
  safe: '#22c55e',
  other: '#64748b',
};

function removeRouteLayers(map, routes) {
  if (!map?.isStyleLoaded()) return;
  routes.forEach((r) => {
    const lid = `route-line-${r.id}`;
    const sid = `route-src-${r.id}`;
    if (map.getLayer(lid)) map.removeLayer(lid);
    if (map.getSource(sid)) map.removeSource(sid);
  });
}

export function useRouteLines(mapRef, routes, fastId, safeId, selectedId) {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !routes.length) return;

    const onLoad = () => {
      removeRouteLayers(map, routes);

      routes.forEach((r) => {
        const lid = `route-line-${r.id}`;
        const sid = `route-src-${r.id}`;

        const color =
          r.id === safeId ? ROUTE_COLORS.safe :
          r.id === fastId ? ROUTE_COLORS.fast :
          ROUTE_COLORS.other;

        const isSelected = r.id === selectedId;

        map.addSource(sid, {
          type: 'geojson',
          data: { type: 'Feature', geometry: r.geometry },
        });

        map.addLayer({
          id: lid,
          type: 'line',
          source: sid,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': color,
            'line-width': isSelected ? 6 : 3,
            'line-opacity': isSelected ? 1 : 0.45,
          },
        });
      });

      const allCoords = routes.flatMap((r) => r.geometry.coordinates);
      const bounds = allCoords.reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]),
      );
      map.fitBounds(bounds, { padding: { top: 120, bottom: 220, left: 40, right: 40 } });
    };

    if (map.isStyleLoaded()) {
      onLoad();
    } else {
      map.once('load', onLoad);
    }

    return () => {
      removeRouteLayers(map, routes);
    };
  }, [mapRef, routes, fastId, safeId, selectedId]);
}
