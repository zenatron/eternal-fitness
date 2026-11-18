'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { ExclamationCircleIcon } from '@heroicons/react/20/solid';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  UserCircleIcon,
  ArrowRightStartOnRectangleIcon,
  ScaleIcon,
  ArrowsRightLeftIcon,
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
  /** Field-level messages, matching the edit form the user graduates to. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
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
    setFieldErrors({});

    // Bounds mirror the server's profileSchema and the edit form's zod schema:
    // this is the first form a new user touches and it used to accept 1750cm.
    const checks: Array<[string, boolean, string]> = [
      ['name', !formData.name.trim(), 'Please enter your name'],
      ['age', (() => { const n = parseInt(formData.age, 10); return Number.isNaN(n) || n < 13 || n > 120; })(), 'Please enter a valid age (13–120)'],
      ['gender', !formData.gender, 'Please select your gender'],
      ['height', (() => { const n = parseFloat(formData.height); return Number.isNaN(n) || n <= 0 || (formData.useMetric ? n > 300 : n > 120); })(), 'Please enter a valid height'],
      ['weight', (() => { const n = parseFloat(formData.weight); return Number.isNaN(n) || n <= 0 || (formData.useMetric ? n > 700 : n > 1500); })(), 'Please enter a valid weight'],
    ];

    const failures = checks.filter(([, failed]) => failed);
    if (failures.length > 0) {
      setFieldErrors(Object.fromEntries(failures.map(([field, , message]) => [field, message])));
      setError(failures[0][2]);
      triggerShake();
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        name: formData.name.trim(),
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
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
    <div className="px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
        animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
        transition={springGentle}
        className="mx-auto w-full max-w-2xl"
      >
        <div>
          {/* Same header and section cards as Settings, which edits the same
              fields — this was a card holding a card per section. */}
          <PageHeader
            title="Welcome"
            description="A few details so weights, recovery and goals make sense. You can change them later."
          />

          <form onSubmit={handleSubmit} className="space-y-6">
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
                <ExclamationCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
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
                <SectionHeading icon={UserCircleIcon} title="Personal information">
                  Shown on your profile and the leaderboard.
                </SectionHeading>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="form-label">Full name</label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-input" aria-invalid={!!fieldErrors['name']}
                      placeholder="Your full name"
                      autoComplete="name"
                      required
                    />
                      {fieldErrors['name'] && (
                        <p className="form-field-error" role="alert">Please enter your name</p>
                      )}
                  </div>
                  <div>
                    <label htmlFor="age" className="form-label">Age</label>
                    <input
                      id="age"
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      className="form-input" aria-invalid={!!fieldErrors['age']}
                      placeholder="Your age"
                      min={13}
                      max={120}
                      required
                    />
                      {fieldErrors['age'] && (
                        <p className="form-field-error" role="alert">Please enter a valid age (13–120)</p>
                      )}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="gender" className="form-label">Gender</label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="form-select" aria-invalid={!!fieldErrors['gender']}
                      required
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {fieldErrors['gender'] && (
                      <p className="form-field-error" role="alert">Please select your gender</p>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Unit System.
                  A headless-ui Switch above two non-interactive labels: the
                  thing that looked like the choice was not the thing you could
                  press. Same control as the profile editor now. */}
              <motion.div variants={formItem} className="form-section">
                <SectionHeading icon={ArrowsRightLeftIcon} title="Units">
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      className="form-input" aria-invalid={!!fieldErrors['height']}
                      placeholder={formData.useMetric ? '175' : '69'}
                      step="0.1"
                      required
                    />
                      {fieldErrors['height'] && (
                        <p className="form-field-error" role="alert">Please enter a valid height</p>
                      )}
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
                      className="form-input" aria-invalid={!!fieldErrors['weight']}
                      placeholder={formData.useMetric ? '70' : '154'}
                      step="0.1"
                      required
                    />
                      {fieldErrors['weight'] && (
                        <p className="form-field-error" role="alert">Please enter a valid weight</p>
                      )}
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="btn btn-tertiary min-h-[48px] flex-1"
              >
                <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                Sign out
              </button>
              <button
                type="submit"
                className="btn btn-primary min-h-[48px] flex-[2]"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Saving…
                  </>
                ) : (
                  'Finish setup'
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
