'use client';

import React from 'react';
import { ArrowLeftIcon, PlusCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import JsonTemplateForm from '@/components/ui/JsonTemplateForm';

export default function CreateTemplatePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800 px-8 py-8 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Go back"
                  >
                    <ArrowLeftIcon className="h-6 w-6" />
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                      <SparklesIcon className="h-8 w-8" />
                      Create Workout Template
                    </h1>
                    <p className="text-purple-100">
                      Design your perfect workout blueprint with our advanced template system
                    </p>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="text-right">
                    <p className="text-purple-100 text-sm">Step 1 of 1</p>
                    <p className="text-xl font-semibold">
                      Template Builder
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <JsonTemplateForm mode="create" />
      </div>
    </div>
  );
}
