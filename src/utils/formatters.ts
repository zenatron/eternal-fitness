// Format volume to display with proper unit
export const formatVolume = (
  volume: number | null | undefined,
  useMetric: boolean | undefined,
) => {
  // Handle null or undefined volume gracefully
  if (volume === null || volume === undefined || isNaN(volume)) {
    return '-'; // Or return empty string, 0, etc., depending on desired display
  }

  const unit = useMetric ? 'kg' : 'lbs';

  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k ${unit}`;
  }
  return `${Math.round(volume).toString()} ${unit}`;
};