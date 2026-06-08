'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { APP, ONBOARDING, ONBOARDING_COUNTRIES } from '@/config/strings';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function ProfilePage() {
  const router = useRouter();
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!city.trim() || !country) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: city.trim(), country }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || ONBOARDING.PROFILE_ERROR_SAVE);
      }
      router.push('/questionnaire');
    } catch (err) {
      setError(err instanceof Error ? err.message : ONBOARDING.PROFILE_ERROR_GENERIC);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{APP.NAME}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {ONBOARDING.PROFILE_SUBTITLE}
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                {ONBOARDING.PROFILE_HEADING}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {ONBOARDING.PROFILE_DESC}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="country"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  {ONBOARDING.COUNTRY_LABEL}
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                  className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm
                    focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">{ONBOARDING.COUNTRY_PLACEHOLDER}</option>
                  {ONBOARDING_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                >
                  {ONBOARDING.CITY_LABEL}
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={ONBOARDING.CITY_PLACEHOLDER}
                  required
                  className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm
                    focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:placeholder-slate-500"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={isSubmitting}
              disabled={!city.trim() || !country}
            >
              {isSubmitting ? ONBOARDING.PROFILE_SUBMITTING : ONBOARDING.PROFILE_SUBMIT}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
