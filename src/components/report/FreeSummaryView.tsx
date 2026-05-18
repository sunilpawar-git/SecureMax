'use client';

import { RadarChart } from '@/app/(app)/questionnaire/radar-chart';
import { FindingCard, type Finding } from './FindingCard';
import type { RadarScores } from '@/app/(app)/questionnaire/types';

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
    urgencyScore >= 70 ? 'HIGH RISK' : urgencyScore >= 40 ? 'MODERATE RISK' : 'LOW RISK';
  const riskColor =
    urgencyScore >= 70
      ? 'text-red-600'
      : urgencyScore >= 40
        ? 'text-orange-600'
        : 'text-emerald-600';

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className={`text-4xl font-bold ${riskColor}`}>{urgencyScore}/100</div>
        <div className={`text-sm font-semibold ${riskColor}`}>{riskLevel}</div>
        <p className="text-sm text-slate-500">Physical Security Posture Score</p>
      </div>

      <div className="max-w-sm mx-auto">
        <RadarChart scores={domainScores} />
      </div>

      {track === 'enterprise' && complianceGapCount !== undefined && complianceGapCount > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-center">
          <span className="text-2xl font-bold text-orange-700">{complianceGapCount}</span>
          <p className="text-sm text-orange-600 mt-1">ISO 27001 / PSARA compliance gaps detected</p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Findings ({(findings ?? []).length})
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
