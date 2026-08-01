'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/lib/hooks/useProfile';
import { useUpdateProfile } from '@/lib/hooks/useMutations';
import {
  ArrowLeftIcon,
  UserCircleIcon,
  ScaleIcon,
  SwatchIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { AccentPicker } from '@/components/theme/AccentPicker';
import { AvatarUploader } from '@/components/ui/profile/AvatarUploader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Spinner } from '@/components/ui/Spinner';
import { convertLengthField, convertMassField } from '@/utils/units';
import { motion, useReducedMotion } from 'framer-motion';
import { z } from 'zod';
import { springSnappy, springGentle } from '@/lib/motion';


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
        height: convertLengthField(prev.height, useMetric),
        weight: convertMassField(prev.weight, useMetric),
        weightGoal: convertMassField(prev.weightGoal, useMetric),
      };
    });
  };

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
          <Spinner className="h-8 w-8 text-accent-500" />
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

              {/* Unit System.
                  Was a headless-ui Switch plus a duplicate pair of buttons
                  driving the same value — the switch could disagree with the
                  selection, and "metric or imperial" is a choice between two
                  named things rather than something to turn on. Now one control:
                  tap the system you want. */}
              <motion.div variants={formItem} className="form-section">
                <SectionHeading icon={ScaleIcon} title="Measurement System">
                  Your entered heights and weights convert automatically.
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

              {/* Appearance */}
              <motion.div variants={formItem} className="form-section">
                <SectionHeading icon={SwatchIcon} title="Appearance">
                  {/* No Save needed, and saying so avoids the "did that take?" pause. */}
                  Applies immediately, and follows you to your other devices.
                </SectionHeading>
                <AccentPicker />
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

            {/* Action.
                Sticky, because the form is long enough that Save sat below the
                fold on a phone for anyone editing the fields near the top. The
                dirty state is stated rather than left to be inferred from
                whether the button looks pressable. */}
            <div className="sticky bottom-4 -mx-2 rounded-xl border border-surface-200 bg-white/95 p-3 backdrop-blur dark:border-surface-300 dark:bg-surface-100/95">
              <motion.button
                type="submit"
                className="btn btn-primary inline-flex w-full items-center justify-center gap-2 !py-3 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting || !isDirty}
                whileHover={prefersReducedMotion || submitting || !isDirty ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion || submitting || !isDirty ? {} : { scale: 0.98 }}
                transition={springSnappy}
              >
                {submitting ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Saving...
                  </>
                ) : isDirty ? (
                  'Save Profile'
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    All Changes Saved
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
