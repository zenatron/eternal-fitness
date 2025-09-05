'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { SignedIn, SignOutButton } from '@clerk/nextjs';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';
import { Switch } from '@headlessui/react';
import { useCreateProfile } from '@/lib/hooks/useMutations';

interface ProfileFormData {
  name: string;
  age: number;
  height: number;
  weight: number;
  gender: string;
  useMetric: boolean;
}

export default function ProfileSetup() {
  const router = useRouter();
  const createProfileMutation = useCreateProfile();
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    age: 0,
    height: 0,
    weight: 0,
    gender: '',
    useMetric: false, // Default to imperial
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleUnit = () => {
    setFormData((prev) => ({
      ...prev,
      useMetric: !prev.useMetric,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Validate form data
      if (!formData.name) {
        throw new Error('Please enter your name');
      }
      if (!formData.age || formData.age < 13) {
        throw new Error('Please enter a valid age (13 or older)');
      }
      if (!formData.gender) {
        throw new Error('Please select your gender');
      }
      if (!formData.height || formData.height <= 0) {
        throw new Error('Please enter a valid height');
      }
      if (!formData.weight || formData.weight <= 0) {
        throw new Error('Please enter a valid weight');
      }

      // Prepare the request body
      const dataToSend = {
        name: formData.name,
        age: Number(formData.age),
        gender: formData.gender,
        height: Number(formData.height),
        weight: Number(formData.weight),
        useMetric: formData.useMetric,
      };

      // Use the mutation to create profile
      await createProfileMutation.mutateAsync(dataToSend);

      // Use replace instead of push to prevent back button issues
      // The mutation's onSuccess already invalidates the cache
      router.replace('/profile');
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'An unexpected error occurred',
      );
      console.error('Profile setup error:', error);
    }
  };

  return (
    <div className="min-h-screen app-bg py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl mx-auto"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          {/* Enhanced Header */}
          <div className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800 px-8 py-12 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex items-center gap-6">
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm">
                <UserCircleIcon className="w-16 h-16" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">Complete Your Profile</h1>
                <p className="text-purple-100 text-lg">
                  {"Let's personalize your fitness journey"}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                {error}
              </motion.div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="form-item-heading">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="form-item-heading">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age || ''}
                    onChange={handleChange}
                    className="form-input rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                    placeholder="Your age"
                    min="13"
                    max="120"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="form-item-heading">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="form-input rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Unit System Toggle */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="form-item-heading mb-1">Measurement System</label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose your preferred unit system for measurements
                    </p>
                  </div>

                  <Switch
                    checked={formData.useMetric}
                    onChange={toggleUnit}
                    className={`${
                      formData.useMetric ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                    } relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                  >
                    <span className="sr-only">Use metric system</span>
                    <span
                      className={`${
                        formData.useMetric ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform`}
                    />
                  </Switch>
                </div>
                <div className="flex gap-4 mt-4">
                  <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !formData.useMetric
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  }`}>
                    Imperial (lbs, in)
                  </div>
                  <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.useMetric
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  }`}>
                    Metric (kg, cm)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div className="space-y-2">
                  <label className="form-item-heading">
                    Height ({formData.useMetric ? 'cm' : 'inches'})
                  </label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height || ''}
                    onChange={handleChange}
                    className="form-input rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                    placeholder={formData.useMetric ? 'e.g., 175' : 'e.g., 69'}
                    step="0.1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="form-item-heading">
                    Weight ({formData.useMetric ? 'kg' : 'lbs'})
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight || ''}
                    onChange={handleChange}
                    className="form-input rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                    placeholder={formData.useMetric ? 'e.g., 70' : 'e.g., 154'}
                    step="0.1"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <SignedIn>
                <SignOutButton redirectUrl="/login">
                  <motion.button
                    type="button"
                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors inline-flex items-center justify-center gap-2 font-semibold"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
                    Sign Out
                  </motion.button>
                </SignOutButton>
              </SignedIn>
              <motion.button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={createProfileMutation.isPending}
                whileHover={{ scale: createProfileMutation.isPending ? 1 : 1.02 }}
                whileTap={{ scale: createProfileMutation.isPending ? 1 : 0.98 }}
              >
                {createProfileMutation.isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving Profile...
                  </div>
                ) : (
                  'Complete Setup'
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
