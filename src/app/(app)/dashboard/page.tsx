'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { APP } from '@/config/strings';

interface SessionSummary {
  id: string;
  status: string;
  track: string;
  paid: boolean;
  reportReady: boolean;
  questionsAnswered: number;
  createdAt: string;
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
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{APP.NAME} — Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Your security assessments</p>
        </div>

        <Link
          href="/questionnaire"
          className="block w-full rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50 p-6 text-center hover:border-emerald-400 transition-colors"
        >
          <span className="text-emerald-700 font-medium">Start New Assessment</span>
        </Link>

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Loading...</p>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">No assessments yet. Start one above.</p>
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
  const statusColor =
    {
      completed: 'bg-emerald-100 text-emerald-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      abandoned: 'bg-slate-100 text-slate-600',
    }[session.status] ?? 'bg-slate-100 text-slate-600';

  const href =
    session.paid && session.reportReady
      ? `/report/${session.id}/download`
      : session.reportReady
        ? `/report/${session.id}/summary`
        : session.status === 'in_progress'
          ? `/questionnaire?session=${encodeURIComponent(session.id)}&track=${encodeURIComponent(session.track)}`
          : `/report/${session.id}/status`;

  return (
    <Link
      href={href}
      className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900 capitalize">{session.track}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
              {session.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {session.questionsAnswered} questions &middot;{' '}
            {new Date(session.createdAt).toLocaleDateString()}
          </p>
        </div>
        <svg
          className="w-5 h-5 text-slate-400"
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
