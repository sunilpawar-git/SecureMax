'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { APP, CTA, TRUST_STACK } from '@/config/strings';

interface FormData {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  facilityCount: string;
  notes: string;
}

const INITIAL: FormData = {
  companyName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  facilityCount: '1',
  notes: '',
};

interface ProposalFormProps {
  defaultName?: string;
  defaultEmail?: string;
}

export default function EnterpriseProposalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-sm text-slate-400">Loading...</p></div>}>
      <ProposalFormWrapper />
    </Suspense>
  );
}

function ProposalFormWrapper() {
  const [defaults, setDefaults] = useState<{ name?: string; email?: string }>({});

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          setDefaults({
            name: data?.user?.name ?? undefined,
            email: data?.user?.email ?? undefined,
          });
        }
      } catch {
        /* auth session fetch is best-effort for pre-fill */
      }
    }
    fetchSession();
  }, []);

  return (
    <ProposalForm defaultName={defaults.name} defaultEmail={defaults.email} />
  );
}

function ProposalForm({ defaultName, defaultEmail }: ProposalFormProps) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session') ?? '';
  const [form, setForm] = useState<FormData>({
    ...INITIAL,
    contactName: defaultName ?? '',
    contactEmail: defaultEmail ?? '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/payment?action=enterprise-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone || undefined,
          facilityCount: parseInt(form.facilityCount, 10) || 1,
          reportId: sessionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Proposal Received</h2>
          <p className="text-sm text-slate-600">
            Our team will contact you within 24 hours to discuss your enterprise security audit.
          </p>
          <p className="text-xs text-slate-400">{TRUST_STACK.ENTERPRISE_SOVEREIGNTY}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">{APP.NAME}</h1>
          <p className="text-sm text-slate-500 mt-1">{CTA.ENTERPRISE_PROPOSAL}</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <Field label="Company Name" name="companyName" value={form.companyName} onChange={handleChange} required />
          <Field label="Your Name" name="contactName" value={form.contactName} onChange={handleChange} required />
          <Field label="Email" name="contactEmail" value={form.contactEmail} onChange={handleChange} type="email" required />
          <Field label="Phone (optional)" name="contactPhone" value={form.contactPhone} onChange={handleChange} type="tel" />
          <Field label="Number of Facilities" name="facilityCount" value={form.facilityCount} onChange={handleChange} type="number" required />

          <div>
            <label htmlFor="field-notes" className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <textarea
              id="field-notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Any specific security concerns or requirements..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-medium text-white
              hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : CTA.ENTERPRISE_PROPOSAL}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">{TRUST_STACK.ENTERPRISE_SOVEREIGNTY}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
}) {
  const inputId = `field-${name}`;
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        id={inputId}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />
    </div>
  );
}
