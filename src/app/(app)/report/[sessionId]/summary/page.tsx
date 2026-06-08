'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FreeSummaryView } from '@/components/report/FreeSummaryView';
import { Button } from '@/components/ui/Button';
import { APP, CTA, TRACK, REPORT_STRINGS } from '@/config/strings';
import type { Finding } from '@/components/report/FindingCard';
import type { RadarScores } from '@/app/(app)/questionnaire/types';

interface SummaryData {
  domain_scores: RadarScores;
  findings: Finding[];
  urgency_score: number;
  compliance_gap_count?: number;
  track: string;
  session_id?: string; // audit session CUID for payment URL (may differ from URL job ID)
}

export default function ReportSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : (params.sessionId ?? '');
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    async function fetchSummary() {
      try {
        const res = await fetch(
          `/api/report?action=summary&report_id=${encodeURIComponent(sessionId)}`,
        );
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || REPORT_STRINGS.SUMMARY_LOAD_ERROR);
          return;
        }
        setData(json);
      } catch {
        setError(REPORT_STRINGS.NETWORK_ERROR);
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{REPORT_STRINGS.SUMMARY_LOADING}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error || REPORT_STRINGS.SUMMARY_LOAD_ERROR}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-emerald-700 underline"
          >
            {REPORT_STRINGS.RETRY}
          </button>
        </div>
      </div>
    );
  }

  const isEnterprise = data.track === TRACK.ENTERPRISE;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {APP.NAME} — {REPORT_STRINGS.SECURITY_ASSESSMENT}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {REPORT_STRINGS.FREE_EXEC_SUMMARY}
          </p>
        </div>

        <FreeSummaryView
          domainScores={data.domain_scores}
          findings={data.findings}
          urgencyScore={data.urgency_score}
          complianceGapCount={data.compliance_gap_count}
          track={data.track}
        />

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/30 p-6 text-center space-y-4">
          {isEnterprise ? (
            <>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-300">
                {REPORT_STRINGS.UNLOCK_ENTERPRISE_TITLE}
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {REPORT_STRINGS.UNLOCK_ENTERPRISE_DESC}
              </p>
              <Button
                size="lg"
                className="w-full"
                onClick={() => router.push(`/enterprise/proposal?session=${sessionId}`)}
              >
                {CTA.ENTERPRISE_PROPOSAL}
              </Button>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-300">
                {REPORT_STRINGS.UNLOCK_FULL_REPORT}
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {REPORT_STRINGS.UNLOCK_FULL_REPORT_DESC}
              </p>
              <Button
                size="lg"
                className="w-full"
                onClick={() => router.push(`/payment/${data.session_id ?? sessionId}`)}
              >
                {REPORT_STRINGS.UNLOCK_FULL_REPORT}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
