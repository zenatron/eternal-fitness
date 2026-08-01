// Format volume to display with proper unit and k/M suffixes
export const formatVolume = (
  volume: number | null | undefined,
  useMetric: boolean | undefined,
) => {
  if (volume === null || volume === undefined || isNaN(volume)) {
    return '-';
  }

  const unit = useMetric ? 'kg' : 'lbs';

  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M ${unit}`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k ${unit}`;
  }
  return `${Math.round(volume).toString()} ${unit}`;
};

// Format a single weight value (e.g. max weight lifted) with the user's unit.
export const formatWeight = (
  weight: number | null | undefined,
  useMetric: boolean | undefined,
) => {
  if (weight === null || weight === undefined || isNaN(weight)) {
    return '-';
  }
  const unit = useMetric ? 'kg' : 'lbs';
  return `${weight.toFixed(1)} ${unit}`;
};