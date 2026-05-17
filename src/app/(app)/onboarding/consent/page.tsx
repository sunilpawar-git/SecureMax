'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { APP, DPDPA, TRUST_STACK } from '@/config/strings';

export default function ConsentPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConsent() {
    if (!agreed) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/consent', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to record consent');
      }
      const data = await res.json();
      // Refresh the JWT so the proxy sees consentAt on the very next request.
      await updateSession({ consentAt: data.consentAt });
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
          <p className="mt-1 text-sm text-slate-500">Data Privacy Consent</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Before we begin</h2>
          <p className="text-xs text-slate-500">
            Purpose: {DPDPA.CONSENT_DESCRIPTION} (Consent {DPDPA.CONSENT_VERSION})
          </p>

          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>{TRUST_STACK.HNI_PRIVACY}</p>

            <div className="rounded-lg bg-slate-50 p-4 space-y-2">
              <p className="font-medium text-slate-700">How we use your data:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Your answers are encrypted at rest using AES-256-GCM</li>
                <li>We generate a security audit report based on CPP Seven Precis methodology</li>
                <li>Your data is never shared with third parties without explicit consent</li>
                <li>You may request data deletion at any time (DPDPA right to erasure)</li>
              </ul>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 space-y-2">
              <p className="font-medium text-slate-700">Your rights under DPDPA:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Right to access your personal data</li>
                <li>Right to correction of inaccurate data</li>
                <li>Right to erasure (soft-delete with anonymization)</li>
                <li>Right to grievance redressal</li>
              </ul>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span className="text-sm text-slate-700">
              I understand and consent to the processing of my data as described above,
              in accordance with the Digital Personal Data Protection Act, 2023.
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleConsent}
            disabled={!agreed || isSubmitting}
            className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-medium text-white
              hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Recording consent...' : 'I Agree — Continue to Assessment'}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          {TRUST_STACK.CREDENTIAL}
        </p>
      </div>
    </div>
  );
}
