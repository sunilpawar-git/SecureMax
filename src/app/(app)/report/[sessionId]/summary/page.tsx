'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FreeSummaryView } from '@/components/report/FreeSummaryView';
import { APP, CTA, TRACK } from '@/config/strings';
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
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : (params.sessionId ?? '');
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    async function fetchSummary() {
      try {
        const res = await fetch(`/api/report?action=summary&report_id=${encodeURIComponent(sessionId)}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Failed to load summary');
          return;
        }
        setData(json);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading your report summary...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-sm text-red-600">{error || 'Failed to load summary'}</p>
          <button onClick={() => window.location.reload()} className="text-sm text-emerald-700 underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isEnterprise = data.track === TRACK.ENTERPRISE;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">{APP.NAME} — Security Assessment</h1>
          <p className="text-sm text-slate-500 mt-1">Free Executive Summary</p>
        </div>

        <FreeSummaryView
          domainScores={data.domain_scores}
          findings={data.findings}
          urgencyScore={data.urgency_score}
          complianceGapCount={data.compliance_gap_count}
          track={data.track}
        />

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-4">
          {isEnterprise ? (
            <>
              <h3 className="font-semibold text-emerald-900">Unlock Full Enterprise Report</h3>
              <p className="text-sm text-emerald-700">
                Includes compliance mapping, board-level risk language, and remediation roadmap.
              </p>
              <button
                onClick={() => router.push(`/enterprise/proposal?session=${sessionId}`)}
                className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
              >
                {CTA.ENTERPRISE_PROPOSAL}
              </button>
            </>
          ) : (
            <>
              <h3 className="font-semibold text-emerald-900">Unlock Full Report</h3>
              <p className="text-sm text-emerald-700">
                Get detailed findings, action roadmap, and threat intelligence.
              </p>
              <button
                onClick={() => router.push(`/payment/${data.session_id ?? sessionId}`)}
                className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
              >
                Unlock Full Report
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
