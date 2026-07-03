import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';

const HIGH_RISK_THRESHOLD = 65;   // matches risk_level: 'high' in risk.js

export function useLiveLocation({ active, onHighRiskEntered }) {
  const [position, setPosition]       = useState(null);   // { lat, lng, accuracy }
  const [riskScore, setRiskScore]     = useState(null);
  const watchIdRef                    = useRef(null);
  const lastRiskCheckRef              = useRef(0);
  const alreadyWarnedRef              = useRef(false);

  const checkRisk = useCallback(async (lat, lng) => {
    // Throttle: check at most every 15 seconds to avoid hammering the API
    const now = Date.now();
    if (now - lastRiskCheckRef.current < 15000) return;
    lastRiskCheckRef.current = now;

    try {
      const { data } = await api.post('/risk/score', {
        waypoints: [[lng, lat]],
      });
      const score = data.risk_score;
      setRiskScore(score);

      if (score !== null && score >= HIGH_RISK_THRESHOLD && !alreadyWarnedRef.current) {
        alreadyWarnedRef.current = true;
        onHighRiskEntered(score);
      } else if (score !== null && score < HIGH_RISK_THRESHOLD) {
        // Reset warning once user leaves high-risk zone
        alreadyWarnedRef.current = false;
      }
    } catch {
      // Non-fatal — position tracking continues regardless
    }
  }, [onHighRiskEntered]);

  useEffect(() => {
    if (!active) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setPosition({ lat, lng, accuracy });
        checkRisk(lat, lng);
      },
      (err) => console.warn('[watchPosition]', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [active, checkRisk]);

  return { position, riskScore };
}
