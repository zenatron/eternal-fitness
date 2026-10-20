import { formatDurationHuman } from '@/utils/durationUtils';
import type { PRType } from '@/types/personalRecords';

export function formatPRValue(value: number, type: PRType, useMetric: boolean = false): string {
  if (type === 'maxDuration') return formatDurationHuman(value);
  if (type === 'maxDistance') {
    const unit = useMetric ? 'km' : 'mi';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k ${unit}`;
    return `${value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${unit}`;
  }
  const unit = useMetric ? 'kg' : 'lbs';
  // Volume is a running total and reads absurd with decimals; the weight-shaped
  // records keep one only when it carries information (182.5, not 405.0).
  // Thousands are grouped: "12150 lbs" read as a typo.
  const digits = type === 'maxVolume' ? 0 : 1;
  return `${value.toLocaleString('en-US', { maximumFractionDigits: digits })} ${unit}`;
}

/** Human label for each record type. */
export const PR_TYPE_LABELS: Record<PRType, string> = {
  maxWeight: 'Max Weight',
  maxOneRepMax: 'Est. 1RM',
  maxVolume: 'Max Volume',
  maxDuration: 'Max Duration',
  maxDistance: 'Max Distance',
};

export const PR_TYPE_ICONS: Record<PRType, string> = {
  maxWeight: '\u{1F3CB}\u{FE0F}',
  maxOneRepMax: '\u{1F4C8}',
  maxVolume: '\u{1F4CA}',
  maxDuration: '\u{23F1}\u{FE0F}',
  maxDistance: '\u{1F4CD}',
};

/**
 * The personal-records API reports short type names; the stored records use the
 * `max*` keys. This mapping was written out inline in three separate components,
 * which is why adding a record type used to mean editing all three.
 */
const API_TYPE_TO_PR_TYPE: Record<string, PRType> = {
  weight: 'maxWeight',
  oneRepMax: 'maxOneRepMax',
  volume: 'maxVolume',
  duration: 'maxDuration',
  distance: 'maxDistance',
};

export function prTypeFromApi(type: string): PRType {
  return API_TYPE_TO_PR_TYPE[type] ?? 'maxWeight';
}
