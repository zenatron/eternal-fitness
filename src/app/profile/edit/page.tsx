'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/lib/hooks/useProfile';
import { useUpdateProfile } from '@/lib/hooks/useMutations';
import Link from 'next/link';
import { Switch } from '@headlessui/react';
import { ArrowLeftIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

export default function EditProfilePage() {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    height: '',
    weight: '',
    age: '',
    gender: '',
    useMetric: true,
    weightGoal: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form with existing data when it loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        height: profile.height ? String(profile.height) : '',
        weight: profile.weight ? String(profile.weight) : '',
        age: profile.age ? String(profile.age) : '',
        gender: profile.gender || '',
        useMetric: profile.useMetric !== undefined ? profile.useMetric : true,
        weightGoal: profile.weightGoal ? String(profile.weightGoal) : '',
      });
    }
  }, [profile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData({
      ...formData,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const toggleUnit = () => {
    setFormData((prev) => ({
      ...prev,
      useMetric: !prev.useMetric,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Convert values to numbers where needed
    const processedData = {
      ...formData,
      height: formData.height ? parseFloat(formData.height) : undefined,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      age: formData.age ? parseInt(formData.age) : undefined,
      weightGoal: formData.weightGoal ? parseFloat(formData.weightGoal) : undefined,
    };

    try {
      await updateProfileMutation.mutateAsync(processedData);
      router.replace('/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-medium"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to Profile</span>
          </Link>
        </div>

        {/* Enhanced Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800 px-8 py-12 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex items-center gap-6">
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm">
                <UserCircleIcon className="w-16 h-16" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">Edit Profile</h1>
                <p className="text-purple-100 text-lg">
                  Update your personal information and preferences
                </p>
              </div>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 m-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-3"
            >
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
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
                  />
                </div>

                <div className="space-y-2">
                  <label className="form-item-heading">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="form-input rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
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
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="form-item-heading">
                    Weight Goal ({formData.useMetric ? 'kg' : 'lbs'})
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    name="weightGoal"
                    value={formData.weightGoal || ''}
                    onChange={handleChange}
                    className="form-input rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 transition-colors"
                    placeholder={formData.useMetric ? 'Target weight in kg' : 'Target weight in lbs'}
                    step="0.1"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Set a target weight for your fitness goals
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <motion.button
                type="submit"
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting}
                whileHover={{ scale: submitting ? 1 : 1.02 }}
                whileTap={{ scale: submitting ? 1 : 0.98 }}
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving Changes...
                  </div>
                ) : (
                  'Save Profile'
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
