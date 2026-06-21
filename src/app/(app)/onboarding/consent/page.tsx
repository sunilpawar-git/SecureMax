'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { APP, DPDPA, TRUST_STACK } from '@/config/strings';
import { LEGAL_LINKS } from '@/config/legal-strings';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function ConsentPage() {
  return (
    <Suspense fallback={null}>
      <ConsentForm />
    </Suspense>
  );
}

function ConsentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const track = searchParams.get('track');
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
      router.push(
        track ? `/onboarding/profile?track=${encodeURIComponent(track)}` : '/onboarding/profile',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{APP.NAME}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Data Privacy Consent</p>
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Before we begin</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Purpose: {DPDPA.CONSENT_DESCRIPTION} (Consent {DPDPA.CONSENT_VERSION})
          </p>

          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>{TRUST_STACK.HNI_PRIVACY}</p>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4 space-y-2">
              <p className="font-medium text-slate-700 dark:text-slate-200">
                How we use your data:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                <li>Your answers are encrypted at rest using AES-256-GCM</li>
                <li>We generate a security audit report based on CPP Seven Precis methodology</li>
                <li>Your data is never shared with third parties without explicit consent</li>
                <li>You may request data deletion at any time (DPDPA right to erasure)</li>
              </ul>
            </div>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4 space-y-2">
              <p className="font-medium text-slate-700 dark:text-slate-200">
                Your rights under DPDPA:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
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
              className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-emerald-700 focus:ring-emerald-600"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              I understand and consent to the processing of my data as described above, in
              accordance with the Digital Personal Data Protection Act, 2023.
            </span>
          </label>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Read our full{' '}
            <Link
              href={LEGAL_LINKS.PRIVACY.href}
              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 underline"
            >
              {LEGAL_LINKS.PRIVACY.label}
            </Link>
            .
          </p>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button
            size="lg"
            className="w-full"
            onClick={handleConsent}
            loading={isSubmitting}
            disabled={!agreed}
          >
            {isSubmitting ? 'Recording consent...' : 'I Agree — Continue to Assessment'}
          </Button>
        </Card>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          {TRUST_STACK.CREDENTIAL}
        </p>
      </div>
    </div>
  );
}
