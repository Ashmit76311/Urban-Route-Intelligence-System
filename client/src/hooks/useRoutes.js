import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function useRoutes(source, destination) {
  const [routes, setRoutes] = useState([]);
  const [fastId, setFastId] = useState(null);
  const [safeId, setSafeId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trigger, setTrigger] = useState(0);

  const refetch = () => setTrigger(t => t + 1);

  useEffect(() => {
    if (!source || !destination) {
      setRoutes([]);
      setFastId(null);
      setSafeId(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get('/routes', {
          params: {
            src_lng: source[0],
            src_lat: source[1],
            dst_lng: destination[0],
            dst_lat: destination[1],
          },
        });
        if (!cancelled) {
          setRoutes(data.routes);
          setFastId(data.fast_id);
          setSafeId(data.safe_id);
        }
      } catch {
        if (!cancelled) setError('Could not fetch routes. Try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, destination, trigger]);

  return { routes, fastId, safeId, loading, error, refetch };
}
