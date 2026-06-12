'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { UserCircleIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';
import { signOut } from 'next-auth/react';
import { Switch } from '@headlessui/react';
import { useUpdateProfile } from '@/lib/hooks/useMutations';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

const formStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const formItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: springGentle },
};

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
  const updateProfileMutation = useUpdateProfile();
  const prefersReducedMotion = useReducedMotion();

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    age: 0,
    height: 0,
    weight: 0,
    gender: '',
    useMetric: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const toggleUnit = () => {
    setFormData((prev) => ({
      ...prev,
      useMetric: !prev.useMetric,
    }));
  };

  const triggerShake = () => {
    setShakeError(true);
    setTimeout(() => setShakeError(false), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!formData.name.trim()) throw new Error('Please enter your name');
      if (!formData.age || formData.age < 13) throw new Error('Please enter a valid age (13 or older)');
      if (!formData.gender) throw new Error('Please select your gender');
      if (!formData.height || formData.height <= 0) throw new Error('Please enter a valid height');
      if (!formData.weight || formData.weight <= 0) throw new Error('Please enter a valid weight');

      await updateProfileMutation.mutateAsync({
        name: formData.name.trim(),
        age: Number(formData.age),
        gender: formData.gender,
        height: Number(formData.height),
        weight: Number(formData.weight),
        useMetric: formData.useMetric,
      });
      router.replace('/profile');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      triggerShake();
      console.error('Profile setup error:', err);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={springGentle}
        className="w-full max-w-xl mx-auto"
      >
        <div className="forge-card overflow-hidden">
          {/* Header */}
          <div className="greeting-gradient px-8 py-10 text-white relative overflow-hidden">
            <div className="relative flex items-center gap-5">
              <motion.div
                className="p-3.5 rounded-xl bg-white/15 backdrop-blur-sm"
                animate={prefersReducedMotion ? {} : { scale: [1, 1.04, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <UserCircleIcon className="w-12 h-12" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-display font-bold tracking-wide uppercase">Complete Your Profile</h1>
                <p className="text-forge-100 text-sm mt-1">
                  Let&apos;s personalize your fitness journey
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Error */}
            {error && (
              <motion.div
                className="form-error"
                initial={prefersReducedMotion ? {} : { opacity: 0, x: shakeError ? -10 : 0, scale: 0.96 }}
                animate={
                  shakeError && !prefersReducedMotion
                    ? { x: [0, -8, 8, -6, 6, -3, 3, 0], opacity: 1, scale: 1 }
                    : { opacity: 1, scale: 1, x: 0 }
                }
                transition={shakeError ? { duration: 0.5 } : springSnappy}
              >
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                {error}
              </motion.div>
            )}

            <motion.div
              className="space-y-6"
              variants={formStagger}
              initial={prefersReducedMotion ? {} : 'hidden'}
              animate={prefersReducedMotion ? {} : 'visible'}
            >
              {/* Personal Info */}
              <motion.div variants={formItem} className="form-section">
                <h2 className="text-sm font-semibold text-surface-600 dark:text-surface-500 uppercase tracking-wider mb-5">
                  Personal Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="form-label">Full Name</label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Your full name"
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="age" className="form-label">Age</label>
                    <input
                      id="age"
                      type="number"
                      name="age"
                      value={formData.age || ''}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Your age"
                      min={13}
                      max={120}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="gender" className="form-label">Gender</label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="form-select"
                      required
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </motion.div>

              {/* Unit System */}
              <motion.div variants={formItem} className="form-section">
                <h2 className="text-sm font-semibold text-surface-600 dark:text-surface-500 uppercase tracking-wider mb-5">
                  Measurement System
                </h2>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-surface-600 dark:text-surface-800">
                      Unit Preference
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-600 mt-0.5">
                      Choose your preferred measurement system
                    </p>
                  </div>
                  <Switch
                    checked={formData.useMetric}
                    onChange={toggleUnit}
                    className={`${
                      formData.useMetric ? 'bg-forge-500' : 'bg-surface-300 dark:bg-surface-600'
                    } relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-forge-500 focus:ring-offset-2 dark:focus:ring-offset-surface-0`}
                  >
                    <span className="sr-only">Use metric system</span>
                    <motion.span
                      animate={{ x: formData.useMetric ? 22 : 4 }}
                      transition={springSnappy}
                      className="inline-block h-5 w-5 rounded-full bg-white shadow"
                    />
                  </Switch>
                </div>

                <div className="flex gap-3 mt-4">
                  <div className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-center transition-colors ${
                    !formData.useMetric
                      ? 'bg-forge-50 dark:bg-forge-900/30 text-forge-700 dark:text-forge-300 ring-1 ring-forge-200 dark:ring-forge-800'
                      : 'bg-surface-100 dark:bg-surface-100 text-surface-500 dark:text-surface-600'
                  }`}>
                    Imperial (lbs, in)
                  </div>
                  <div className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-center transition-colors ${
                    formData.useMetric
                      ? 'bg-forge-50 dark:bg-forge-900/30 text-forge-700 dark:text-forge-300 ring-1 ring-forge-200 dark:ring-forge-800'
                      : 'bg-surface-100 dark:bg-surface-100 text-surface-500 dark:text-surface-600'
                  }`}>
                    Metric (kg, cm)
                  </div>
                </div>
              </motion.div>

              {/* Measurements */}
              <motion.div variants={formItem} className="form-section">
                <h2 className="text-sm font-semibold text-surface-600 dark:text-surface-500 uppercase tracking-wider mb-5">
                  Measurements
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="height" className="form-label">
                      Height ({formData.useMetric ? 'cm' : 'inches'})
                    </label>
                    <input
                      id="height"
                      type="number"
                      name="height"
                      value={formData.height || ''}
                      onChange={handleChange}
                      className="form-input"
                      placeholder={formData.useMetric ? 'e.g. 175' : 'e.g. 69'}
                      step="0.1"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="weight" className="form-label">
                      Weight ({formData.useMetric ? 'kg' : 'lbs'})
                    </label>
                    <input
                      id="weight"
                      type="number"
                      name="weight"
                      value={formData.weight || ''}
                      onChange={handleChange}
                      className="form-input"
                      placeholder={formData.useMetric ? 'e.g. 70' : 'e.g. 154'}
                      step="0.1"
                      required
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-surface-100 dark:border-surface-300">
              <motion.button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex-1 px-6 py-3 bg-surface-100 dark:bg-surface-100 text-surface-500 dark:text-surface-600 rounded-xl hover:bg-surface-200 dark:hover:bg-surface-200 transition-colors inline-flex items-center justify-center gap-2 font-medium text-sm"
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                transition={springSnappy}
              >
                <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                Sign Out
              </motion.button>
              <motion.button
                type="submit"
                className="btn btn-primary flex-[2] !py-3 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                disabled={updateProfileMutation.isPending}
                whileHover={prefersReducedMotion || updateProfileMutation.isPending ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion || updateProfileMutation.isPending ? {} : { scale: 0.98 }}
                transition={springSnappy}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
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
