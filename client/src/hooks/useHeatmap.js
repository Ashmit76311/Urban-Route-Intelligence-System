import { useEffect, useRef, useState } from 'react';

export function useHeatmap(mapRef, visible, api) {
  // Track whether we've added the layer so we don't re-add on re-renders
  const layerAddedRef = useRef(false);
  const [loading, setLoading] = useState(false);

  const loadGrid = async (map) => {
    setLoading(true);
    const bounds = map.getBounds();
    try {
      const { data } = await api.get('/risk/grid', {
        params: {
          sw_lat: bounds.getSouth(),
          sw_lng: bounds.getWest(),
          ne_lat: bounds.getNorth(),
          ne_lng: bounds.getEast(),
        },
      });

      if (map.getSource('risk-grid-src')) {
        // Update existing source data on pan
        map.getSource('risk-grid-src').setData(data);
      } else {
        map.addSource('risk-grid-src', { type: 'geojson', data });
        map.addLayer({
          id: 'risk-hex-fill',
          type: 'fill',
          source: 'risk-grid-src',
          paint: {
            'fill-color': [
              'interpolate', ['linear'], ['get', 'risk_score'],
              0,   'rgba(34, 197, 94, 0.1)',
              35,  'rgba(234, 179, 8, 0.15)',
              65,  'rgba(239, 68, 68, 0.25)',
              100, 'rgba(127, 29, 29, 0.35)',
            ],
            'fill-outline-color': 'rgba(255,255,255,0.02)',
          },
        });
        layerAddedRef.current = true;
      }
    } catch (err) {
      console.error('[heatmap]', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Toggle visibility without re-fetching
    if (layerAddedRef.current && map.getLayer('risk-hex-fill')) {
      map.setLayoutProperty('risk-hex-fill', 'visibility', visible ? 'visible' : 'none');
      if (!visible) return;
    }

    if (!visible) return;

    // handler reference is stable within this effect — used for both .on and .off
    let debounceTimer = null;
    const handler = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadGrid(map), 300);
    };

    const init = () => {
      loadGrid(map);
      map.on('moveend', handler);
    };

    if (map.isStyleLoaded()) {
      init();
    } else {
      map.once('load', init);
    }

    return () => {
      clearTimeout(debounceTimer);
      // Same reference — correctly removes the listener
      map.off('moveend', handler);
    };
  }, [visible]);

  return { loading };
}
