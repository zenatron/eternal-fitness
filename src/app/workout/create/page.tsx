'use client';

import { FlagIcon } from '@heroicons/react/24/outline';
import WorkoutFormEditor from '@/components/WorkoutFormEditor';

export default function CreateWorkoutPage() {
  const headerElement = (
    <div className="app-card rounded-2xl shadow-xl overflow-hidden mb-6">
      <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-12 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative flex items-center gap-6">
          <FlagIcon className="w-20 h-20" />
          <div>
            <h1 className="text-3xl font-bold">Create Custom Workout</h1>
            <p className="text-blue-100 mt-1">Design your own personalized workout routine</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <WorkoutFormEditor
      mode="create"
      headerElement={headerElement}
    />
  );
}