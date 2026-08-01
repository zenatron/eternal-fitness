'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/solid';
import { vibrate } from '@/lib/workout/feedback';

/**
 * Numeric entry tuned for use mid-set, with chalky hands, one-handed.
 *
 * Three things the plain `<input type="number">` it replaces got wrong on a
 * phone:
 *
 *  - No `inputMode`, so iOS opened the full alphabetic keyboard for weight.
 *    `decimal` and `numeric` bring up a keypad instead.
 *  - No steppers, so nudging 60kg to 62.5kg meant selecting text and retyping.
 *  - Tap targets well under 44px.
 *
 * Hold-to-repeat is included because adding 20kg in 2.5kg steps should not be
 * eight separate taps.
 */

interface StepperInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  label: string;
  /** Amount each press adds or removes. */
  step?: number;
  min?: number;
  max?: number;
  /** Decimals are allowed only when the step is fractional. */
  allowDecimal?: boolean;
  placeholder?: string;
  /** Greyed-out reference value from the previous session. */
  ghost?: number;
  suffix?: string;
  /** Hides the +/- buttons where they would not fit. */
  compact?: boolean;
  id?: string;
}

/** Delay before hold-to-repeat kicks in, then the interval between repeats. */
const REPEAT_DELAY_MS = 450;
const REPEAT_INTERVAL_MS = 90;

export function StepperInput({
  value,
  onChange,
  label,
  step = 1,
  min = 0,
  max,
  allowDecimal,
  placeholder = '0',
  ghost,
  suffix,
  compact = false,
  id,
}: StepperInputProps) {
  const decimal = allowDecimal ?? !Number.isInteger(step);

  /**
   * The raw text is held separately from the numeric value so intermediate
   * states while typing ('', '1.', '.5') don't get clobbered by reformatting on
   * every keystroke.
   */
  const [draft, setDraft] = useState<string>(value?.toString() ?? '');
  const isFocusedRef = useRef(false);
  const repeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track external changes (prefill, undo) unless the user is mid-edit.
  useEffect(() => {
    if (!isFocusedRef.current) {
      setDraft(value?.toString() ?? '');
    }
  }, [value]);

  const clamp = useCallback(
    (next: number): number => {
      let result = next;
      if (min !== undefined) result = Math.max(min, result);
      if (max !== undefined) result = Math.min(max, result);
      // Floating point: 0.1 + 0.2 must not surface as 0.30000000000000004.
      return Math.round(result * 1000) / 1000;
    },
    [min, max]
  );

  const applyDelta = useCallback(
    (delta: number) => {
      const base = value ?? 0;
      const next = clamp(base + delta);
      if (next === value) return;
      setDraft(next.toString());
      onChange(next);
      // Confirms the press without needing to look at the screen.
      vibrate(12);
    },
    [value, clamp, onChange]
  );

  const stopRepeat = useCallback(() => {
    if (repeatTimerRef.current) {
      clearTimeout(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  }, []);

  const startRepeat = useCallback(
    (delta: number) => {
      applyDelta(delta);
      repeatTimerRef.current = setTimeout(() => {
        repeatIntervalRef.current = setInterval(() => applyDelta(delta), REPEAT_INTERVAL_MS);
      }, REPEAT_DELAY_MS);
    },
    [applyDelta]
  );

  useEffect(() => stopRepeat, [stopRepeat]);

  const handleTextChange = (raw: string) => {
    // Permit only what the mode allows, so a stray letter cannot land in state.
    const cleaned = decimal
      ? raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
      : raw.replace(/[^0-9]/g, '');

    setDraft(cleaned);

    if (cleaned === '' || cleaned === '.') {
      onChange(undefined);
      return;
    }
    const parsed = decimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
    onChange(Number.isNaN(parsed) ? undefined : clamp(parsed));
  };

  /*
   * These are the most-tapped controls in the app and were previously a low
   * contrast grey-on-grey — hard to pick out mid-set. A forge-tinted fill with
   * a visible border and a solid accent icon makes them read as buttons.
   */
  const buttonClass =
    'flex items-center justify-center rounded-lg border ' +
    'border-accent-500/30 bg-accent-500/10 text-accent-700 ' +
    'dark:border-accent-500/40 dark:bg-accent-500/15 dark:text-accent-300 ' +
    'transition-colors hover:bg-accent-500/25 dark:hover:bg-accent-500/30 ' +
    'active:bg-accent-600 active:text-white active:border-accent-600 ' +
    'disabled:opacity-30 tap-control select-none min-w-[44px] min-h-[44px]';

  return (
    <div>
      <label htmlFor={id} className="form-label flex items-baseline justify-between gap-1">
        <span>{label}</span>
        {ghost !== undefined && ghost > 0 && (
          <span
            className="font-body text-[0.65rem] normal-case tracking-normal text-surface-500"
            title="Last session"
          >
            was {ghost}
          </span>
        )}
      </label>

      <div className="flex items-stretch gap-1">
        {!compact && (
          <button
            type="button"
            aria-label={`Decrease ${label}`}
            className={buttonClass}
            onPointerDown={(event) => {
              event.preventDefault();
              startRepeat(-step);
            }}
            onPointerUp={stopRepeat}
            onPointerLeave={stopRepeat}
            onPointerCancel={stopRepeat}
            disabled={value !== undefined && min !== undefined && value <= min}
          >
            <MinusIcon className="h-5 w-5" />
          </button>
        )}

        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            // `text` with inputMode rather than `type="number"`: number inputs
            // reject intermediate values, silently drop non-numeric keystrokes,
            // and scroll-wheel over a focused field changes the value.
            type="text"
            inputMode={decimal ? 'decimal' : 'numeric'}
            enterKeyHint="next"
            value={draft}
            onChange={(event) => handleTextChange(event.target.value)}
            onFocus={(event) => {
              isFocusedRef.current = true;
              // Select all so typing replaces rather than appends — the common
              // case is overwriting the prefilled target.
              event.target.select();
            }}
            onBlur={() => {
              isFocusedRef.current = false;
              setDraft(value?.toString() ?? '');
            }}
            placeholder={ghost !== undefined && ghost > 0 ? String(ghost) : placeholder}
            className="form-input tabular w-full text-center font-display text-base font-bold !px-2 !py-2 min-h-[44px]"
            aria-describedby={ghost ? `${id}-ghost` : undefined}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-surface-500">
              {suffix}
            </span>
          )}
        </div>

        {!compact && (
          <button
            type="button"
            aria-label={`Increase ${label}`}
            className={buttonClass}
            onPointerDown={(event) => {
              event.preventDefault();
              startRepeat(step);
            }}
            onPointerUp={stopRepeat}
            onPointerLeave={stopRepeat}
            onPointerCancel={stopRepeat}
            disabled={value !== undefined && max !== undefined && value >= max}
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
