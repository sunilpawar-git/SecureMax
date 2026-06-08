'use client';

import { SEVERITY, REPORT_STRINGS } from '@/config/strings';
import { SEVERITY_STYLES } from '@/config/colors';
import { Badge } from '@/components/ui/Badge';
import { cx } from '@/lib/utils';

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

/**
 * Redact sensitive fields client-side as a defense-in-depth measure.
 * The API should already return redacted data for unpaid reports —
 * this ensures no leakage even if the API response is stale/cached.
 */
function safeText(text: string, isLocked: boolean): string {
  if (!isLocked) return text;
  return REPORT_STRINGS.REDACTED_PLACEHOLDER;
}

export function FindingCard({ finding, locked }: FindingCardProps) {
  const severityStyle = SEVERITY_STYLES[finding.severity] ?? SEVERITY_STYLES[SEVERITY.LOW];

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {finding.domain}
        </span>
        <Badge variant={null} className={cx('border font-semibold', severityStyle)}>
          {finding.severity.toUpperCase()}
        </Badge>
      </div>

      <div className="px-4 py-3 space-y-2">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{finding.question}</p>

        <div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {safeText(finding.answer, locked)}
          </p>
          {!locked && finding.recommendation && (
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-2">
              {finding.recommendation}
            </p>
          )}
        </div>

        {locked && (
          <div className="flex items-center justify-center py-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600">
              {REPORT_STRINGS.LOCKED_BANNER_TEXT}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
