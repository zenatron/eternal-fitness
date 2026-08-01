'use client';

import React from 'react';
import { ArrowLeftIcon, PlusCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import JsonTemplateForm from '@/components/ui/JsonTemplateForm';
import { springSnappy, springGentle } from '@/lib/motion';


export default function CreateTemplatePage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      transition={springGentle}
      className="app-bg py-8 px-4"
    >
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 16, scale: 0.98 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
          transition={{ ...springGentle, delay: 0.05 }}
          className="mb-8"
        >
          <div className="forge-card overflow-hidden">
            <div className="relative px-5 py-6 text-white greeting-gradient sm:px-8 sm:py-8">
              {/* Subtle overlay for depth */}
              <div className="absolute inset-0 bg-black/10" />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Go back"
                    whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                    transition={springSnappy}
                  >
                    <ArrowLeftIcon className="h-6 w-6" />
                  </motion.button>
                  <div>
                    <h1 className="mb-1.5 flex items-center gap-2.5 font-display text-2xl font-bold tracking-wide sm:text-3xl">
                      <motion.span
                        initial={prefersReducedMotion ? {} : { opacity: 0, x: -12 }}
                        animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                        transition={{ ...springGentle, delay: 0.1 }}
                      >
                        <SparklesIcon className="h-7 w-7 shrink-0" />
                      </motion.span>
                      NEW TEMPLATE
                    </h1>
                    <motion.p
                      className="text-accent-100"
                      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                      transition={{ ...springGentle, delay: 0.15 }}
                    >
                      Design your workout blueprint
                    </motion.p>
                  </div>
                </div>
                <motion.div
                  className="hidden md:block"
                  initial={prefersReducedMotion ? {} : { opacity: 0, x: 12 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
                  transition={{ ...springGentle, delay: 0.2 }}
                >
                  <div className="text-right">
                    <p className="text-accent-100 text-sm">Step 1 of 1</p>
                    <p className="text-xl font-semibold">
                      Template Builder
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Form Container */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.1 }}
        >
          <JsonTemplateForm mode="create" />
        </motion.div>
      </div>
    </motion.div>
  );
}
