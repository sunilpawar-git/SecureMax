'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { APP } from '@/config/strings';

const COUNTRIES = [
  'India', 'United Arab Emirates', 'Singapore', 'United Kingdom',
  'United States', 'Saudi Arabia', 'Qatar', 'Bahrain', 'Other',
] as const;

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
        throw new Error(data.error || 'Failed to save profile');
      }
      router.push('/questionnaire');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">{APP.NAME}</h1>
          <p className="mt-1 text-sm text-slate-500">Location Information</p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
        >
          <div>
            <h2 className="font-semibold text-slate-900">Where is your property located?</h2>
            <p className="mt-1 text-sm text-slate-500">
              This helps us tailor the security assessment to local threat landscapes and
              regulations.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-1">
                Country
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                  focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1">
                City
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai, Dubai, London"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                  focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!city.trim() || !country || isSubmitting}
            className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-medium text-white
              hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Continue to Assessment'}
          </button>
        </form>
      </div>
    </div>
  );
}
