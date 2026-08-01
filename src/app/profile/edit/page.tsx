'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/lib/hooks/useProfile';
import { useUpdateProfile } from '@/lib/hooks/useMutations';
import { Switch } from '@headlessui/react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { AccentPicker } from '@/components/theme/AccentPicker';
import { AvatarUploader } from '@/components/ui/profile/AvatarUploader';
import { motion, useReducedMotion } from 'framer-motion';
import { z } from 'zod';
import { springSnappy, springGentle } from '@/lib/motion';


const CM_PER_INCH = 2.54;
const LB_PER_KG = 2.20462262;

/** Convert a numeric string field when the unit system flips. Empty/invalid → unchanged. */
const convertLength = (val: string, toMetric: boolean) => {
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  return (toMetric ? num * CM_PER_INCH : num / CM_PER_INCH).toFixed(1);
};
const convertMass = (val: string, toMetric: boolean) => {
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  return (toMetric ? num / LB_PER_KG : num * LB_PER_KG).toFixed(1);
};

const profileFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
  age: z.number().int().min(13, 'Must be at least 13').max(120, 'Must be 120 or less').nullable(),
  height: z.number().positive('Must be greater than 0').max(300, 'Unrealistic height').nullable(),
  weight: z.number().positive('Must be greater than 0').max(2000, 'Unrealistic weight').nullable(),
  weightGoal: z.number().positive('Must be greater than 0').max(2000, 'Unrealistic goal').nullable(),
});

type FieldErrors = Partial<Record<keyof typeof profileFormSchema.shape, string>>;

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

export default function EditProfilePage() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const prefersReducedMotion = useReducedMotion();

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [shakeError, setShakeError] = useState(false);

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

  // Snapshot the hydrated values so we can detect unsaved changes.
  const initialForm = useMemo(
    () =>
      profile
        ? {
            name: profile.name || '',
            height: profile.height ? String(profile.height) : '',
            weight: profile.weight ? String(profile.weight) : '',
            age: profile.age ? String(profile.age) : '',
            gender: profile.gender || '',
            useMetric: profile.useMetric !== undefined ? profile.useMetric : true,
            weightGoal: profile.weightGoal ? String(profile.weightGoal) : '',
          }
        : null,
    [profile],
  );

  const isDirty = useMemo(() => {
    if (!initialForm) return false;
    return (Object.keys(formData) as (keyof typeof formData)[]).some(
      (k) => formData[k] !== initialForm[k],
    );
  }, [formData, initialForm]);

  // Warn before the tab closes / navigates away with unsaved edits.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const selectUnit = (useMetric: boolean) => {
    setFormData((prev) => {
      if (prev.useMetric === useMetric) return prev;
      // Convert the entered values so they keep their meaning.
      return {
        ...prev,
        useMetric,
        height: convertLength(prev.height, useMetric),
        weight: convertMass(prev.weight, useMetric),
        weightGoal: convertMass(prev.weightGoal, useMetric),
      };
    });
  };

  const toggleUnit = () => selectUnit(!formData.useMetric);

  const handleBack = () => {
    if (isDirty && !window.confirm('Discard your unsaved changes?')) return;
    router.push('/profile');
  };

  const triggerShake = () => {
    setShakeError(true);
    setTimeout(() => setShakeError(false), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const heightVal = formData.height ? parseFloat(formData.height) : null;
    const weightVal = formData.weight ? parseFloat(formData.weight) : null;
    const ageVal = formData.age ? parseInt(formData.age, 10) : null;
    const goalVal = formData.weightGoal ? parseFloat(formData.weightGoal) : null;

    const parsed = profileFormSchema.safeParse({
      name: formData.name,
      age: ageVal,
      height: heightVal,
      weight: weightVal,
      weightGoal: goalVal,
    });

    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (key && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      setError('Please fix the highlighted fields.');
      triggerShake();
      setSubmitting(false);
      return;
    }

    const processedData = {
      ...formData,
      height: parsed.data.height,
      weight: parsed.data.weight,
      age: parsed.data.age,
      weightGoal: parsed.data.weightGoal,
    };

    try {
      await updateProfileMutation.mutateAsync(processedData);
      router.replace('/profile');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-page">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={prefersReducedMotion ? {} : { opacity: 1 }}
        >
          <svg className="animate-spin h-8 w-8 text-accent-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-surface-500 dark:text-surface-600">Loading profile...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={springGentle}
        className="w-full max-w-2xl mx-auto"
      >
        {/* Back link */}
        <motion.div
          className="mb-5"
          initial={prefersReducedMotion ? {} : { opacity: 0, x: -12 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, x: 0 }}
          transition={springSnappy}
        >
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm text-surface-500 dark:text-surface-600 hover:text-accent-600 dark:hover:text-accent-400 transition-colors font-medium"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Profile
          </button>
        </motion.div>

        <div className="forge-card overflow-hidden">
          {/* Header */}
          <div className="greeting-gradient px-8 py-10 text-white relative overflow-hidden">
            <div className="relative flex items-center gap-5">
              <AvatarUploader
                avatarUrl={profile?.avatarUrl}
                imageUrl={profile?.image}
                name={profile?.name}
                email={profile?.email}
                size={80}
              />
              <div>
                <h1 className="text-3xl font-display font-bold tracking-wide">Edit Profile</h1>
                <p className="text-accent-100 text-sm mt-1">
                  Update your personal information and preferences
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
                      className={`form-input ${fieldErrors.name ? '!border-danger-400 !focus:border-danger-500' : ''}`}
                      placeholder="Your full name"
                      autoComplete="name"
                      aria-invalid={!!fieldErrors.name}
                    />
                    {fieldErrors.name && <p className="form-hint !text-danger-500">{fieldErrors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="age" className="form-label">Age</label>
                    <input
                      id="age"
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      className={`form-input ${fieldErrors.age ? '!border-danger-400 !focus:border-danger-500' : ''}`}
                      placeholder="Your age"
                      min={13}
                      max={120}
                      aria-invalid={!!fieldErrors.age}
                    />
                    {fieldErrors.age && <p className="form-hint !text-danger-500">{fieldErrors.age}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="gender" className="form-label">Gender</label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="form-select"
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
                    <p className="text-sm font-semibold text-surface-600 dark:text-surface-500">
                      Unit Preference
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-600 mt-0.5">
                      Tap a system to switch — your values are converted automatically
                    </p>
                  </div>
                  <Switch
                    checked={formData.useMetric}
                    onChange={toggleUnit}
                    className={`${
                      formData.useMetric ? 'bg-accent-500' : 'bg-surface-900 dark:bg-surface-600'
                    } relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:focus:ring-offset-surface-0`}
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
                  <button
                    type="button"
                    onClick={() => selectUnit(false)}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-center transition-colors tap-control ${
                      !formData.useMetric
                        ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 ring-1 ring-accent-200 dark:ring-accent-800'
                        : 'bg-surface-100 dark:bg-surface-100 text-surface-500 dark:text-surface-600 hover:bg-surface-200 dark:hover:bg-surface-200'
                    }`}
                  >
                    Imperial (lbs, in)
                  </button>
                  <button
                    type="button"
                    onClick={() => selectUnit(true)}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-center transition-colors tap-control ${
                      formData.useMetric
                        ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 ring-1 ring-accent-200 dark:ring-accent-800'
                        : 'bg-surface-100 dark:bg-surface-100 text-surface-500 dark:text-surface-600 hover:bg-surface-200 dark:hover:bg-surface-200'
                    }`}
                  >
                    Metric (kg, cm)
                  </button>
                </div>
              </motion.div>

              {/* Appearance */}
              <motion.div variants={formItem} className="form-section">
                <h2 className="text-sm font-semibold text-surface-600 dark:text-surface-500 uppercase tracking-wider mb-2">
                  Appearance
                </h2>
                <p className="text-xs text-surface-500 dark:text-surface-600 mb-4">
                  {/* No Save needed, and saying so avoids the "did that take?" pause. */}
                  Applies immediately, and follows you to your other devices.
                </p>
                <AccentPicker />
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
                      value={formData.height}
                      onChange={handleChange}
                      className={`form-input ${fieldErrors.height ? '!border-danger-400 !focus:border-danger-500' : ''}`}
                      placeholder={formData.useMetric ? 'e.g. 175' : 'e.g. 69'}
                      step="0.1"
                      aria-invalid={!!fieldErrors.height}
                    />
                    {fieldErrors.height && <p className="form-hint !text-danger-500">{fieldErrors.height}</p>}
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
                      className={`form-input ${fieldErrors.weight ? '!border-danger-400 !focus:border-danger-500' : ''}`}
                      placeholder={formData.useMetric ? 'e.g. 70' : 'e.g. 154'}
                      step="0.1"
                      aria-invalid={!!fieldErrors.weight}
                    />
                    {fieldErrors.weight && <p className="form-hint !text-danger-500">{fieldErrors.weight}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="weightGoal" className="form-label">
                      Weight Goal ({formData.useMetric ? 'kg' : 'lbs'})
                      <span className="font-normal text-surface-600 dark:text-surface-500 ml-1">(optional)</span>
                    </label>
                    <input
                      id="weightGoal"
                      type="number"
                      name="weightGoal"
                      value={formData.weightGoal}
                      onChange={handleChange}
                      className={`form-input ${fieldErrors.weightGoal ? '!border-danger-400 !focus:border-danger-500' : ''}`}
                      placeholder={formData.useMetric ? 'Target weight in kg' : 'Target weight in lbs'}
                      step="0.1"
                      aria-invalid={!!fieldErrors.weightGoal}
                    />
                    <p className="form-hint">Set a target weight for your fitness goals</p>
                    {fieldErrors.weightGoal && <p className="form-hint !text-danger-500">{fieldErrors.weightGoal}</p>}
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Action */}
            <div className="pt-6 border-t border-surface-100 dark:border-surface-300">
              <motion.button
                type="submit"
                className="btn btn-primary w-full !py-3 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                disabled={submitting}
                whileHover={prefersReducedMotion || submitting ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion || submitting ? {} : { scale: 0.98 }}
                transition={springSnappy}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
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
