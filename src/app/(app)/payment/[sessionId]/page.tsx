'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRazorpay } from '@/hooks/use-razorpay';
import { APP, PAYMENT, TRUST_STACK } from '@/config/strings';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : (params.sessionId ?? '');

  const { initiatePayment, state, error } = useRazorpay({
    sessionId,
    onSuccess: () => router.push(`/report/${sessionId}/download`),
  });

  const amount = (PAYMENT.AMOUNT_PAISE / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: PAYMENT.CURRENCY,
    minimumFractionDigits: 0,
  });

  const isProcessing = state === 'creating_order' || state === 'checkout_open' || state === 'verifying';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
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
            disabled={isProcessing}
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
