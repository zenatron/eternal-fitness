'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import React from 'react';

import { motion, useReducedMotion } from 'framer-motion';
import JsonTemplateForm from '@/components/ui/JsonTemplateForm';
import { springGentle } from '@/lib/motion';

export default function CreateTemplatePage() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="px-4 pb-16 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <PageHeader back title="New template" description="Pick exercises, set your targets, save it once." />

        {/* Form Container */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ ...springGentle, delay: 0.1 }}
        >
          <JsonTemplateForm mode="create" />
        </motion.div>
      </div>
    </div>
  );
}
