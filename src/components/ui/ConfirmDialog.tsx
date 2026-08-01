'use client';

import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * Confirmation modal, replacing the native `confirm()` this app used for
 * destructive actions.
 *
 * `confirm()` blocks the main thread (freezing the workout timer and any
 * in-flight sync), cannot be styled, and traps focus in a way screen readers
 * handle inconsistently. Headless UI's Dialog gives a real focus trap, Escape
 * handling and correct ARIA for free.
 */

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive and reorders emphasis. */
  destructive?: boolean;
  /**
   * Confirm is in flight: both buttons lock and the confirm button shows a
   * spinner. Also blocks Escape and outside-click, so the dialog cannot be
   * dismissed out from under a request that is already deleting something.
   */
  busy?: boolean;
  busyLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  busyLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          static
          open={open}
          onClose={busy ? () => {} : onCancel}
          className="relative z-[60]"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
          />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            {/* The motion element is nested rather than rendered via `as`:
                DialogPanel has its own boolean `transition` prop, which
                collides with Framer Motion's transition object. */}
            <DialogPanel className="w-full max-w-sm">
              <motion.div
                initial={
                  prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }
                }
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 320, damping: 26 }
                }
                className="w-full rounded-2xl border border-surface-900 bg-white p-6 shadow-2xl shadow-black/20 dark:border-surface-300 dark:bg-surface-100 dark:shadow-black/50"
              >
              <div className="flex items-start gap-4">
                {destructive && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-500/10 border border-danger-500/25">
                    <ExclamationTriangleIcon className="h-5 w-5 text-danger-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <DialogTitle className="font-display text-lg uppercase tracking-wide text-surface-50 dark:text-white">
                    {title}
                  </DialogTitle>
                  <Description className="mt-1.5 text-sm text-surface-600 dark:text-surface-800">
                    {message}
                  </Description>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={onCancel}
                  disabled={busy}
                  className="btn btn-tertiary flex-1 tap-control disabled:opacity-50"
                  // The safe choice gets focus, so a reflexive Enter cancels
                  // rather than deletes.
                  autoFocus
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={busy}
                  className={`btn flex-1 gap-2 tap-control disabled:opacity-70 ${
                    destructive ? 'btn-danger' : 'btn-primary'
                  }`}
                >
                  {busy && (
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white"
                    />
                  )}
                  {busy ? busyLabel ?? confirmLabel : confirmLabel}
                </button>
              </div>
              </motion.div>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
