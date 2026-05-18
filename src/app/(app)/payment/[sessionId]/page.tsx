'use client';

import Script from 'next/script';
import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRazorpay } from '@/hooks/use-razorpay';
import { APP, PAYMENT, TRUST_STACK } from '@/config/strings';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : (params.sessionId ?? '');

  const { initiatePayment, state, error, scriptReady, onScriptLoad, onScriptError } = useRazorpay({
    sessionId,
    onSuccess: () => router.push(`/report/${sessionId}/download`),
  });

  // process.env.NODE_ENV is inlined at build time by Next.js — no hydration mismatch risk
  const isDev = process.env.NODE_ENV === 'development';

  const [devBypassing, setDevBypassing] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  const handleDevBypass = useCallback(async () => {
    setDevBypassing(true);
    setDevError(null);
    try {
      const res = await fetch('/api/dev/unlock-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDevError(data.error || 'Dev bypass failed');
        setDevBypassing(false);
        return;
      }
      // Redirect to the report job ID for download (not the audit session ID)
      const reportId = data.report_job_id ?? sessionId;
      router.push(`/report/${reportId}/download`);
    } catch {
      setDevError('Network error during dev bypass');
      setDevBypassing(false);
    }
  }, [sessionId, router]);

  const amount = (PAYMENT.AMOUNT_PAISE / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: PAYMENT.CURRENCY,
    minimumFractionDigits: 0,
  });

  const isProcessing = state === 'creating_order' || state === 'checkout_open' || state === 'verifying';
  const isDisabled = isProcessing || !scriptReady;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onReady={onScriptLoad}
        onError={onScriptError}
      />
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">{APP.NAME}</h1>
          <p className="text-sm text-slate-500 mt-1">Unlock Your Full Security Report</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-slate-900">{amount}</div>
            <p className="text-sm text-slate-500">One-time payment</p>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <Feature text="Complete findings with detailed recommendations" />
            <Feature text="CPP Seven Precis domain-mapped vulnerabilities" />
            <Feature text="Threat intelligence enrichment" />
            <Feature text="Downloadable PDF audit report" />
            <Feature text="Priority booking for physical on-site audit" />
          </div>

          <button
            onClick={initiatePayment}
            disabled={isDisabled}
            className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-medium text-white
              hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === 'creating_order' && 'Preparing payment...'}
            {state === 'checkout_open' && 'Complete payment in Razorpay...'}
            {state === 'verifying' && 'Verifying payment...'}
            {state === 'success' && 'Payment verified!'}
            {(state === 'idle' || state === 'error') && `Pay ${amount}`}
          </button>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          {isDev && (
            <div className="border-t border-dashed border-amber-300 pt-4 space-y-2">
              <p className="text-xs text-amber-600 text-center font-medium">
                ⚙ Dev mode — skip real payment
              </p>
              <button
                onClick={handleDevBypass}
                disabled={devBypassing}
                className="w-full rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm
                  font-medium text-amber-800 hover:bg-amber-100 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {devBypassing ? 'Unlocking...' : 'Bypass Payment (Dev)'}
              </button>
              {devError && <p className="text-xs text-red-600 text-center">{devError}</p>}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs text-emerald-800 text-center leading-relaxed">
            {TRUST_STACK.HNI_PRIVACY}
          </p>
        </div>

        <p className="text-center text-xs text-slate-400">{TRUST_STACK.COMPLIANCE_SIGNAL}</p>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <svg className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
      <span className="text-sm text-slate-600">{text}</span>
    </div>
  );
}
