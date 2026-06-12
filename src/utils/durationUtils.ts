/**
 * Parse a user-typed duration string into total seconds.
 * Supports: H:MM:SS, MM:SS, shorthand (1h30m, 5m, 90s), raw number (seconds).
 */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const shorthandRegex = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?$/i;
  const shorthandMatch = trimmed.match(shorthandRegex);
  if (shorthandMatch && (shorthandMatch[1] || shorthandMatch[2] || shorthandMatch[3])) {
    const hours = parseInt(shorthandMatch[1] || '0', 10);
    const minutes = parseInt(shorthandMatch[2] || '0', 10);
    const seconds = parseInt(shorthandMatch[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  const colonParts = trimmed.split(':');
  if (colonParts.length === 2) {
    const mins = parseInt(colonParts[0], 10);
    const secs = parseInt(colonParts[1], 10);
    if (!isNaN(mins) && !isNaN(secs) && secs >= 0 && secs < 60) {
      return mins * 60 + secs;
    }
  }
  if (colonParts.length === 3) {
    const hrs = parseInt(colonParts[0], 10);
    const mins = parseInt(colonParts[1], 10);
    const secs = parseInt(colonParts[2], 10);
    if (!isNaN(hrs) && !isNaN(mins) && !isNaN(secs) && mins >= 0 && mins < 60 && secs >= 0 && secs < 60) {
      return hrs * 3600 + mins * 60 + secs;
    }
  }

  const num = parseFloat(trimmed);
  if (!isNaN(num) && num >= 0 && /^\d+(\.\d+)?$/.test(trimmed)) {
    return Math.round(num);
  }

  return null;
}

export function formatDurationHuman(seconds: number): string {
  if (seconds < 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }
  if (m > 0) {
    return `${m}m ${String(s).padStart(2, '0')}s`;
  }
  return `${s}s`;
}

export function formatDurationInput(seconds: number): string {
  if (seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDurationShort(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}
