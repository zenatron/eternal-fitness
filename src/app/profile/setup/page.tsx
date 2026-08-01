'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  UserCircleIcon,
  ArrowRightStartOnRectangleIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import { signOut } from 'next-auth/react';
import { useUpdateProfile } from '@/lib/hooks/useMutations';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Spinner } from '@/components/ui/Spinner';
import { convertLengthField, convertMassField } from '@/utils/units';
import { springSnappy, springGentle } from '@/lib/motion';


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
  age: string;
  /** Held as strings, like the profile editor, so unit conversion can round-trip
   *  a half-typed value without clobbering it. */
  height: string;
  weight: string;
  gender: string;
  useMetric: boolean;
}

export default function ProfileSetup() {
  const router = useRouter();
  const updateProfileMutation = useUpdateProfile();
  const prefersReducedMotion = useReducedMotion();

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    age: '',
    height: '',
    weight: '',
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

  const selectUnit = (useMetric: boolean) => {
    setFormData((prev) => {
      if (prev.useMetric === useMetric) return prev;
      // Without this the label flipped from cm to inches and the number stayed,
      // so a height entered as 175cm was submitted as 175 inches.
      return {
        ...prev,
        useMetric,
        height: convertLengthField(prev.height, useMetric),
        weight: convertMassField(prev.weight, useMetric),
      };
    });
  };

  const triggerShake = () => {
    setShakeError(true);
    setTimeout(() => setShakeError(false), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const age = parseInt(formData.age, 10);
      const height = parseFloat(formData.height);
      const weight = parseFloat(formData.weight);

      if (!formData.name.trim()) throw new Error('Please enter your name');
      if (Number.isNaN(age) || age < 13) throw new Error('Please enter a valid age (13 or older)');
      if (!formData.gender) throw new Error('Please select your gender');
      if (Number.isNaN(height) || height <= 0) throw new Error('Please enter a valid height');
      if (Number.isNaN(weight) || weight <= 0) throw new Error('Please enter a valid weight');

      await updateProfileMutation.mutateAsync({
        name: formData.name.trim(),
        age,
        gender: formData.gender,
        height,
        weight,
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
    <div className="py-8 px-4">
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
                <p className="text-accent-100 text-sm mt-1">
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
                <div className="w-5 h-5 rounded-full bg-danger-500 flex items-center justify-center shrink-0">
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
                <SectionHeading icon={UserCircleIcon} title="Personal Information">
                  Shown on your profile and the leaderboard.
                </SectionHeading>
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
                      value={formData.age}
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

              {/* Unit System.
                  A headless-ui Switch above two non-interactive labels: the
                  thing that looked like the choice was not the thing you could
                  press. Same control as the profile editor now. */}
              <motion.div variants={formItem} className="form-section">
                <SectionHeading icon={ScaleIcon} title="Measurement System">
                  Pick one — anything you have already entered is converted.
                </SectionHeading>

                <SegmentedControl
                  label="Unit preference"
                  value={formData.useMetric}
                  onChange={selectUnit}
                  options={[
                    { value: false, label: 'Imperial', hint: 'lbs, inches' },
                    { value: true, label: 'Metric', hint: 'kg, cm' },
                  ]}
                />
              </motion.div>

              {/* Measurements */}
              <motion.div variants={formItem} className="form-section">
                <SectionHeading icon={ScaleIcon} title="Measurements">
                  Used for your weight goal and body-composition estimates.
                </SectionHeading>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="height" className="form-label">
                      Height ({formData.useMetric ? 'cm' : 'inches'})
                    </label>
                    <input
                      id="height"
                      type="number"
                      name="height"
                      value={formData.height}
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
                      value={formData.weight}
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
                    <Spinner className="h-4 w-4" />
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
