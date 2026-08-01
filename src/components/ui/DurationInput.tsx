'use client';

import { useRef, useState } from 'react';
import { parseDuration, formatDurationHuman, formatDurationInput } from '@/utils/durationUtils';

/**
 * The duration field used everywhere a length of time is typed.
 *
 * There were two of these — `DurationInput` in JsonTemplateForm and
 * `DurationField` on the log-past-workout page — each with its own copy of the
 * parsing helpers, its own styling and its own idea of what invalid input looks
 * like (one said "invalid", the other explained the accepted formats). They also
 * disagreed on whether an empty field meant zero or undefined. This is the union
 * of both: the template form's controlled-value syncing and the log page's
 * helpful validation message, on the shared `.form-input` styling.
 *
 * Accepts H:MM:SS, MM:SS, shorthand (1h30m, 45m, 90s) and a raw second count.
 */

interface DurationInputProps {
  /** Seconds. `undefined` renders an empty field. */
  value: number | undefined;
  onChange: (seconds: number | undefined) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export function DurationInput({
  value,
  onChange,
  placeholder = '45:00',
  className = '',
  id,
  'aria-label': ariaLabel,
}: DurationInputProps) {
  const [text, setText] = useState(() =>
    value !== undefined && value !== null ? formatDurationInput(value) : ''
  );
  const [isFocused, setIsFocused] = useState(false);

  // Re-sync when the value changes from outside — picking a template prefills the
  // duration, and without this the field kept showing whatever it had before.
  // Skipped while focused so it never fights the user mid-keystroke.
  const lastExternalValue = useRef(value);
  if (!isFocused && value !== lastExternalValue.current) {
    lastExternalValue.current = value;
    setText(value !== undefined && value !== null ? formatDurationInput(value) : '');
  }

  const parsed = text.trim() ? parseDuration(text) : null;
  const isInvalid = text.trim() !== '' && parsed === null;

  return (
    <div className="flex flex-col">
      <input
        id={id}
        aria-label={ariaLabel}
        aria-invalid={isInvalid}
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const p = parseDuration(next);
          if (p !== null) {
            onChange(p);
            lastExternalValue.current = p;
          } else if (next.trim() === '') {
            onChange(undefined);
            lastExternalValue.current = undefined;
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          if (parsed !== null) {
            setText(formatDurationInput(parsed));
            onChange(parsed);
            lastExternalValue.current = parsed;
          } else if (text.trim() === '') {
            onChange(undefined);
            lastExternalValue.current = undefined;
          }
        }}
        className={`form-input ${
          isInvalid ? '!border-danger-400 dark:!border-danger-500' : ''
        } ${className}`}
        placeholder={placeholder}
      />
      {text.trim() !== '' && (
        <span className={`form-hint ${isInvalid ? '!text-danger-500' : ''}`}>
          {isInvalid
            ? 'Try 1:30:00, 45:00, 30m, or a number of seconds'
            : `= ${formatDurationHuman(parsed!)}`}
        </span>
      )}
    </div>
  );
}
