import { formatDurationHuman } from '@/utils/durationUtils';

export function formatPRValue(value: number, type: 'maxWeight' | 'maxVolume' | 'maxDuration' | 'maxDistance', useMetric: boolean = false): string {
  if (type === 'maxDuration') return formatDurationHuman(value);
  if (type === 'maxDistance') {
    const unit = useMetric ? 'km' : 'mi';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k ${unit}`;
    return `${value.toFixed(1)} ${unit}`;
  }
  const unit = useMetric ? 'kg' : 'lbs';
  return type === 'maxWeight' ? `${value.toFixed(1)} ${unit}` : `${value.toFixed(0)} ${unit}`;
}
