'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { APP, REPORT_STRINGS } from '@/config/strings';

type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

interface StatusPayload {
  status: ReportStatus;
  progress?: number;
  error?: string;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 120;

export default function ReportStatusPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : (params.sessionId ?? '');
  const [status, setStatus] = useState<StatusPayload>({ status: 'pending' });
  const pollCount = useRef(0);

  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > MAX_POLLS) {
        clearInterval(interval);
        setStatus({
          status: 'failed',
          error: REPORT_STRINGS.GENERATION_TIMEOUT,
        });
        return;
      }

      try {
        const res = await fetch(
          `/api/report?action=status&report_id=${encodeURIComponent(sessionId)}`,
        );
        const data = await res.json();

        if (!res.ok) {
          setStatus({ status: 'failed', error: data.error || REPORT_STRINGS.STATUS_CHECK_FAILED });
          clearInterval(interval);
          return;
        }

        setStatus(data);

        if (data.status === 'completed') {
          clearInterval(interval);
          router.push(`/report/${sessionId}/summary`);
        } else if (data.status === 'failed') {
          clearInterval(interval);
        }
      } catch {
        // Network error — keep polling
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [sessionId, router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{APP.NAME}</h1>

        {status.status === 'failed' ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">{status.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-emerald-700 underline"
            >
              {REPORT_STRINGS.RETRY}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center animate-pulse">
              <svg
                className="w-8 h-8 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {REPORT_STRINGS.GENERATING}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {REPORT_STRINGS.GENERATING_HINT}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
