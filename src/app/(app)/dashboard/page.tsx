'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { APP, NAV, UI, DASHBOARD, TRACK_LABEL, SESSION_STATUS_LABEL } from '@/config/strings';
import { SESSION_STATUS_STYLES } from '@/config/admin-colors';

/** Matches the shape returned by GET /api/dashboard/sessions */
interface SessionSummary {
  id: string;
  status: string;
  track: string;
  paid: boolean;
  reportReady: boolean;
  questionsAnswered: number;
  createdAt: string;
  reportJobId: string | null;
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/dashboard/sessions');
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions ?? []);
        }
      } catch {
        // Silently fail — user sees empty state
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {APP.NAME} — {NAV.DASHBOARD}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{DASHBOARD.SUBTITLE}</p>
        </div>

        <Link
          href="/questionnaire"
          className="block w-full rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 p-6 text-center hover:border-emerald-400 transition-colors"
        >
          <span className="text-emerald-700 dark:text-emerald-300 font-medium">{NAV.START_AUDIT}</span>
        </Link>

        {loading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">{UI.LOADING}</p>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <p className="text-sm">{DASHBOARD.EMPTY_STATE}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session }: { session: SessionSummary }) {
  const statusColor = SESSION_STATUS_STYLES[session.status] ?? 'bg-slate-100 text-slate-600';

  const reportId = session.reportJobId ?? session.id;
  const href =
    session.paid && session.reportReady
      ? `/report/${reportId}/download`
      : session.reportReady
        ? `/report/${reportId}/summary`
        : session.status === 'in_progress'
          ? `/questionnaire?session=${encodeURIComponent(session.id)}&track=${encodeURIComponent(session.track)}`
          : `/report/${reportId}/status`;

  return (
    <Link
      href={href}
      className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {TRACK_LABEL[session.track] ?? session.track}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
              {SESSION_STATUS_LABEL[session.status] ?? session.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {session.questionsAnswered} {DASHBOARD.QUESTIONS_SUFFIX} &middot;{' '}
            {new Date(session.createdAt).toLocaleDateString()}
          </p>
        </div>
        <svg
          className="w-5 h-5 text-slate-400 dark:text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  );
}
