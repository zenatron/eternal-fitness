'use client';

import { Fragment, type ReactNode } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Shared modal chrome for the profile detail modals.
 *
 * Two problems this fixes:
 *
 *  - **Layering.** The achievements modal was a bare `fixed inset-0 z-50` div
 *    rendered inline. Because the page wraps its content in an animated
 *    `motion.div`, that transform creates a stacking context, so the modal's
 *    z-index was scoped *inside* it and the sticky app chrome painted over the
 *    top. Headless UI's Dialog portals to the document body, which takes the
 *    modal out of that context entirely.
 *  - **Shape.** They were desktop dialogs — `max-w-6xl`, `max-h-96` scroll
 *    regions — floating awkwardly on a phone. Below `sm` this is a bottom sheet
 *    that fills the screen and respects the safe area; above it, a centred
 *    dialog as before.
 *
 * Focus trapping, Escape handling, scroll locking and `aria-modal` all come
 * from Dialog rather than being hand-rolled.
 */

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Rendered to the left of the title — usually an icon in a tinted tile. */
  icon?: ReactNode;
  children: ReactNode;
  /**
   * Pinned action row. Lives outside the scroll region, so a long body can
   * never push Save/Confirm off the bottom of a phone screen. When present it
   * carries the safe-area inset instead of the scroll region.
   */
  footer?: ReactNode;
  /** Widest the dialog grows on desktop. */
  maxWidth?: string;
}

export function ModalShell({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'max-w-3xl',
}: ModalShellProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      {/* Above the sticky chrome (z-40), the rest timer (z-40) and the install
          prompt (z-50). */}
      <Dialog as="div" className="relative z-[70]" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-250"
            enterFrom="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-8 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-surface-100 sm:max-h-[85vh] sm:rounded-2xl ${maxWidth}`}
            >
              <div className="flex shrink-0 items-start gap-3 border-b border-surface-900 p-4 dark:border-surface-300 sm:p-5">
                {icon}
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-display text-lg font-bold uppercase tracking-wide text-surface-50 dark:text-white">
                    {title}
                  </DialogTitle>
                  {subtitle && (
                    <p className="mt-0.5 truncate text-sm text-surface-500 dark:text-surface-600">
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="touch-target flex shrink-0 items-center justify-center rounded-lg text-surface-500 transition-colors hover:bg-surface-900 hover:text-surface-50 dark:hover:bg-surface-200 dark:hover:text-white tap-control"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* The single scroll region, so nested max-h scrollers aren't
                  needed and the sheet can use the full height available. */}
              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5"
                style={
                  footer ? undefined : { paddingBottom: 'calc(1rem + var(--safe-bottom))' }
                }
              >
                {children}
              </div>

              {footer && (
                <div
                  className="shrink-0 border-t border-surface-900 p-4 dark:border-surface-300 sm:p-5"
                  style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}
                >
                  {footer}
                </div>
              )}
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
