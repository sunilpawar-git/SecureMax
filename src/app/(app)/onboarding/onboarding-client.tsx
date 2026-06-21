'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { APP, ONBOARDING, ONBOARDING_COUNTRIES, TRUST_STACK } from '@/config/strings';
import { Card } from '@/components/ui/Card';
import { ConsentLegalBlock } from './ConsentLegalBlock';

export default function OnboardingClient() {
  return (
    <Suspense fallback={null}>
      <OnboardingForm />
    </Suspense>
  );
}

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const track = searchParams.get('track');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);

  const fieldsIncomplete = !city.trim() || !country;

  async function handleConsented() {
    setProfileError(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: city.trim(),
          country,
          ...(phone.trim() && { phone: phone.trim() }),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || ONBOARDING.PROFILE_ERROR_SAVE);
      }
      router.push(track ? `/questionnaire?track=${encodeURIComponent(track)}` : '/questionnaire');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : ONBOARDING.PROFILE_ERROR_GENERIC);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{APP.NAME}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Data Privacy Consent</p>
        </div>

        <ConsentLegalBlock disabled={fieldsIncomplete} onConsented={handleConsented} />

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                {ONBOARDING.PROFILE_HEADING}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {ONBOARDING.PROFILE_DESC}
              </p>
            </div>

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
                className="w-full min-h-[48px] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm
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
                className="w-full min-h-[48px] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm
                  focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:placeholder-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
              >
                {ONBOARDING.PHONE_LABEL}
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={ONBOARDING.PHONE_PLACEHOLDER}
                pattern="^\+?[0-9\s\-()]{8,20}$"
                className="w-full min-h-[48px] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm
                  focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:placeholder-slate-500"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {ONBOARDING.PHONE_HINT}
              </p>
            </div>

            {profileError && (
              <p className="text-sm text-red-600 dark:text-red-400">{profileError}</p>
            )}
          </div>
        </Card>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          {TRUST_STACK.CREDENTIAL}
        </p>
      </div>
    </div>
  );
}
