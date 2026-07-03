import { useState, useEffect } from 'react';

// Haversine distance in meters between two [lng, lat] points
function distanceMeters([lng1, lat1], [lng2, lat2]) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ADVANCE_THRESHOLD_M = 30;   // advance step when within 30m of maneuver point

export function useNavigation({ steps, position, active }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [arrived, setArrived]     = useState(false);

  // Reset when navigation starts or route changes
  useEffect(() => {
    setStepIndex(0);
    setArrived(false);
  }, [steps]);

  useEffect(() => {
    if (!active || !position || !steps?.length || arrived) return;

    const currentStep = steps[stepIndex];
    if (!currentStep) return;

    const dist = distanceMeters(
      [position.lng, position.lat],
      currentStep.location
    );

    if (dist <= ADVANCE_THRESHOLD_M) {
      if (stepIndex >= steps.length - 1) {
        setArrived(true);
      } else {
        setStepIndex(i => i + 1);
      }
    }
  }, [position, active, steps, arrived, stepIndex]);

  const currentStep = steps?.[stepIndex] ?? null;
  const nextStep    = steps?.[stepIndex + 1] ?? null;

  return { currentStep, nextStep, stepIndex, totalSteps: steps?.length ?? 0, arrived };
}
