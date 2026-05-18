'use client';

import { SEVERITY } from '@/config/strings';

export const REDACTED_PLACEHOLDER = '[Unlock full report to view]';

export interface Finding {
  domain: string;
  domain_name: string;
  severity: string;
  question: string;
  answer: string;
  recommendation: string;
}

interface FindingCardProps {
  finding: Finding;
  locked: boolean;
}

const SEVERITY_STYLES: Record<string, string> = {
  [SEVERITY.CRITICAL]: 'bg-red-100 text-red-800 border-red-200',
  [SEVERITY.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
  [SEVERITY.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [SEVERITY.LOW]: 'bg-slate-100 text-slate-600 border-slate-200',
};

/**
 * Redact sensitive fields client-side as a defense-in-depth measure.
 * The API should already return redacted data for unpaid reports —
 * this ensures no leakage even if the API response is stale/cached.
 */
function safeText(text: string, isLocked: boolean): string {
  if (!isLocked) return text;
  return REDACTED_PLACEHOLDER;
}

export function FindingCard({ finding, locked }: FindingCardProps) {
  const severityStyle = SEVERITY_STYLES[finding.severity] ?? SEVERITY_STYLES[SEVERITY.LOW];

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-xs font-medium text-slate-500">{finding.domain}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${severityStyle}`}>
          {finding.severity.toUpperCase()}
        </span>
      </div>

      <div className="px-4 py-3 space-y-2">
        <p className="text-sm font-medium text-slate-900">{finding.question}</p>

        <div>
          <p className="text-sm text-slate-600">{safeText(finding.answer, locked)}</p>
          {!locked && finding.recommendation && (
            <p className="text-sm text-emerald-700 mt-2">{finding.recommendation}</p>
          )}
        </div>

        {locked && (
          <div className="flex items-center justify-center py-2">
            <span className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
              Unlock full report to see details
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
