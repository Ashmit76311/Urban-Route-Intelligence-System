import { useEffect } from 'react';
import { api } from '../api/client';
import { useHeatmap } from '../hooks/useHeatmap';

export default function HeatmapLayer({ mapRef, visible, onLoadingChange }) {
  const { loading } = useHeatmap(mapRef, visible, api);

  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  return null;
}
