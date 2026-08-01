import type { Transition } from 'framer-motion';

/**
 * Shared spring presets. These three values were previously copy-pasted into
 * ~30 files; import them from here instead of redeclaring.
 *
 *   springSnappy — UI taps / quick feedback (400 / 30 / 0.8)
 *   springBouncy — playful entrances, badges (300 / 20 / 0.7)
 *   springGentle — section / page entrances (200 / 25 / 0.9)
 */
export const springSnappy: Transition = { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 };
export const springBouncy: Transition = { type: 'spring', stiffness: 300, damping: 20, mass: 0.7 };
export const springGentle: Transition = { type: 'spring', stiffness: 200, damping: 25, mass: 0.9 };
