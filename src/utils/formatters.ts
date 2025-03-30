// Format volume to display with proper unit
export const formatVolume = (volume: number) => {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k`;
  }
  return Math.round(volume).toString();
};