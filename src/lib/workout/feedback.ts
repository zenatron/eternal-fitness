'use client';

/**
 * Haptic and audio feedback for in-workout events.
 *
 * Deliberately asset-free: tones are synthesised with the Web Audio API rather
 * than shipping mp3s, so nothing extra has to be downloaded or cached, and the
 * alert works on a first offline launch.
 */

let audioContext: AudioContext | null = null;

/**
 * Browsers only allow audio after a user gesture, and a context created before
 * one starts life suspended. This is called lazily from within handlers.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    if (!audioContext) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      audioContext = new Ctor();
    }
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }
    return audioContext;
  } catch {
    return null;
  }
}

/**
 * Primes the audio context from a user gesture so later programmatic beeps —
 * which have no gesture of their own — are allowed to play.
 */
export function primeAudio(): void {
  getAudioContext();
}

interface ToneOptions {
  frequency: number;
  durationMs: number;
  /** Peak gain, 0–1. Kept low; this plays in a quiet gym, not a club. */
  volume?: number;
  type?: OscillatorType;
  delayMs?: number;
}

function playTone({
  frequency,
  durationMs,
  volume = 0.18,
  type = 'sine',
  delayMs = 0,
}: ToneOptions): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const start = ctx.currentTime + delayMs / 1000;
    const end = start + durationMs / 1000;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);

    // Ramped rather than switched, because an instant gain change produces an
    // audible click at both ends of the tone.
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.setValueAtTime(volume, end - 0.04);
    gain.gain.linearRampToValueAtTime(0, end);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  } catch {
    /* audio is a nicety, never a failure */
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported on iOS Safari */
  }
}

/** Soft tick for the last few seconds of a rest countdown. */
export function playCountdownTick(): void {
  playTone({ frequency: 660, durationMs: 70, volume: 0.1 });
}

/** Rest is over — a rising three-tone figure, plus a firm buzz. */
export function playRestComplete(): void {
  playTone({ frequency: 587.33, durationMs: 130 });
  playTone({ frequency: 739.99, durationMs: 130, delayMs: 140 });
  playTone({ frequency: 987.77, durationMs: 260, delayMs: 280, volume: 0.22 });
  vibrate([180, 90, 180, 90, 320]);
}

/** Confirmation for logging a set. */
export function playSetComplete(): void {
  playTone({ frequency: 880, durationMs: 90, volume: 0.12 });
  vibrate(40);
}

/** Celebration for a new personal record. */
export function playPersonalRecord(): void {
  playTone({ frequency: 523.25, durationMs: 110, volume: 0.2 });
  playTone({ frequency: 659.25, durationMs: 110, volume: 0.2, delayMs: 110 });
  playTone({ frequency: 783.99, durationMs: 110, volume: 0.2, delayMs: 220 });
  playTone({ frequency: 1046.5, durationMs: 420, volume: 0.24, delayMs: 330 });
  vibrate([90, 60, 90, 60, 240]);
}

/**
 * Fires a system notification through the service worker.
 *
 * Used when rest finishes while the app is backgrounded — the tab may be frozen
 * by then, so the worker is what actually gets to run.
 */
export async function notifyThroughServiceWorker(options: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  vibrate?: number[];
}): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: 'SHOW_NOTIFICATION', ...options });
    return true;
  } catch {
    return false;
  }
}
