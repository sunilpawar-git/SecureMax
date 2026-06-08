'use client';

import { RadarChart } from '@/app/(app)/questionnaire/radar-chart';
import { FindingCard, type Finding } from './FindingCard';
import type { RadarScores } from '@/app/(app)/questionnaire/types';
import { REPORT_STRINGS } from '@/config/strings';

interface FreeSummaryViewProps {
  domainScores: RadarScores;
  findings: Finding[];
  urgencyScore: number;
  complianceGapCount?: number;
  track: string;
}

export function FreeSummaryView({
  domainScores,
  findings,
  urgencyScore,
  complianceGapCount,
  track,
}: FreeSummaryViewProps) {
  const riskLevel =
    urgencyScore >= 70
      ? REPORT_STRINGS.RISK_HIGH
      : urgencyScore >= 40
        ? REPORT_STRINGS.RISK_MODERATE
        : REPORT_STRINGS.RISK_LOW;
  const riskColor =
    urgencyScore >= 70
      ? 'text-red-600 dark:text-red-400'
      : urgencyScore >= 40
        ? 'text-orange-600 dark:text-orange-400'
        : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className={`text-4xl font-bold ${riskColor}`}>{urgencyScore}/100</div>
        <div className={`text-sm font-semibold ${riskColor}`}>{riskLevel}</div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {REPORT_STRINGS.POSTURE_SCORE_LABEL}
        </p>
      </div>

      <div className="max-w-sm mx-auto">
        <RadarChart scores={domainScores} />
      </div>

      {track === 'enterprise' && complianceGapCount !== undefined && complianceGapCount > 0 && (
        <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 p-4 text-center">
          <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">
            {complianceGapCount}
          </span>
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
            {REPORT_STRINGS.COMPLIANCE_GAPS_DETECTED}
          </p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
          {REPORT_STRINGS.FINDINGS_HEADING} ({(findings ?? []).length})
        </h3>
        <div className="space-y-3">
          {(findings ?? []).map((f, i) => (
            <FindingCard key={`${f.domain}-${i}`} finding={f} locked={true} />
          ))}
        </div>
      </div>
    </div>
  );
}
