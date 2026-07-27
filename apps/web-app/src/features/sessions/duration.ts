/**
 * mm:ss <-> seconds helpers. Duration values cross the wire as integer seconds;
 * these live UI-side only so the user can type/read a familiar "1:30" format.
 */

/** Parse "1:30" or a plain seconds string into whole seconds. Returns null when invalid. */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') {
    return null;
  }

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length !== 2) {
      return null;
    }
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return null;
    }
    if (minutes < 0 || seconds < 0 || seconds >= 60) {
      return null;
    }
    return Math.round(minutes) * 60 + Math.round(seconds);
  }

  const seconds = Number(trimmed);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }
  return Math.round(seconds);
}

/** Format whole seconds as "m:ss" (seconds zero-padded). */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
