'use client';

import React from 'react';
import { FlagIcon } from '@heroicons/react/24/outline';
import TemplateFormEditor from '@/components/ui/TemplateFormEditor';

export default function CreateTemplatePage() {
  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Workout Template</h1>
        <p className="text-secondary mt-1">Design your reusable workout blueprint.</p>
      </div>
      
      <TemplateFormEditor
        mode="create"
        headerElement={
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Template Details</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Create a template that you can use for multiple workout sessions
            </p>
          </div>
        }
      />
    </div>
  );
}