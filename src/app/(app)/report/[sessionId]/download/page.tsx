'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { APP, REPORT_STRINGS } from '@/config/strings';
import { Button } from '@/components/ui/Button';
import { ChecklistDownload } from './_components/ChecklistDownload';

type DownloadState =
  | 'loading'
  | 'ready'
  | 'downloading'
  | 'error'
  | 'payment_required'
  | 'pending_approval';

type ReportMode = 'executive' | 'technical' | 'complete';

export default function ReportDownloadPage() {
  const params = useParams();
  const sessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : (params.sessionId ?? '');
  const [state, setState] = useState<DownloadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [auditSessionId, setAuditSessionId] = useState<string | null>(null);
  const [reportMode, setReportMode] = useState<ReportMode>('complete');

  useEffect(() => {
    if (!sessionId) return;

    async function checkAccess() {
      try {
        const res = await fetch(
          `/api/report?action=status&report_id=${encodeURIComponent(sessionId)}`,
        );
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 402) {
            setState('payment_required');
          } else if (res.status === 403) {
            setState('pending_approval');
          } else {
            setState('error');
            setError(data.error || REPORT_STRINGS.ACCESS_VERIFY_FAILED);
          }
          return;
        }

        if (data.session_id) setAuditSessionId(data.session_id);

        if (data.status === 'completed' && data.downloadable) {
          setState('ready');
        } else if (data.status === 'completed') {
          setState('payment_required');
        } else {
          setState('error');
          setError(REPORT_STRINGS.REPORT_NOT_READY);
        }
      } catch {
        setState('error');
        setError(REPORT_STRINGS.NETWORK_ERROR);
      }
    }

    checkAccess();
  }, [sessionId]);

  const handleDownload = useCallback(async () => {
    setState('downloading');
    try {
      const modeParam = reportMode !== 'complete' ? `&mode=${reportMode}` : '';
      const res = await fetch(
        `/api/report?action=full&report_id=${encodeURIComponent(sessionId)}${modeParam}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState('error');
        setError(data.error || REPORT_STRINGS.DOWNLOAD_FAILED);
        return;
      }

      const contentType = res.headers.get('Content-Type') ?? '';
      if (!contentType.includes('application/pdf')) {
        setState('error');
        setError(REPORT_STRINGS.UNEXPECTED_RESPONSE);
        return;
      }

      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Validate PDF magic bytes (%PDF) before saving
      const isPdf =
        bytes[0] === 0x25 && // %
        bytes[1] === 0x50 && // P
        bytes[2] === 0x44 && // D
        bytes[3] === 0x46; // F

      if (!isPdf) {
        setState('error');
        setError(REPORT_STRINGS.INVALID_PDF);
        return;
      }

      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `raivan_audit_${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setState('ready');
    } catch {
      setState('error');
      setError(REPORT_STRINGS.DOWNLOAD_FAILED_RETRY);
    }
  }, [sessionId, reportMode]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{APP.NAME}</h1>

        {state === 'loading' && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {REPORT_STRINGS.VERIFYING_ACCESS}
          </p>
        )}

        {state === 'ready' && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
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
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {REPORT_STRINGS.REPORT_READY}
            </p>
            <fieldset className="text-left space-y-2 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <legend className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1">
                {REPORT_STRINGS.REPORT_FORMAT_LEGEND}
              </legend>
              {(
                [
                  { value: 'executive', label: REPORT_STRINGS.FORMAT_EXECUTIVE },
                  { value: 'technical', label: REPORT_STRINGS.FORMAT_TECHNICAL },
                  { value: 'complete', label: REPORT_STRINGS.FORMAT_COMPLETE },
                ] as const
              ).map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="report-mode"
                    value={opt.value}
                    checked={reportMode === opt.value}
                    onChange={() => setReportMode(opt.value)}
                    className="accent-emerald-700"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">{opt.label}</span>
                </label>
              ))}
            </fieldset>
            <Button size="lg" className="w-full" onClick={handleDownload}>
              {REPORT_STRINGS.DOWNLOAD_PDF}
            </Button>
            <ChecklistDownload sessionId={sessionId} reportId={sessionId} />
          </div>
        )}

        {state === 'downloading' && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{REPORT_STRINGS.DOWNLOADING}</p>
        )}

        {state === 'payment_required' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {REPORT_STRINGS.PAYMENT_REQUIRED}
            </p>
            <a
              href={`/payment/${auditSessionId ?? sessionId}`}
              className="block w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
            >
              {REPORT_STRINGS.UNLOCK_FULL_REPORT}
            </a>
          </div>
        )}

        {state === 'pending_approval' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {REPORT_STRINGS.PENDING_APPROVAL}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {REPORT_STRINGS.PENDING_APPROVAL_HINT}
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-emerald-700 underline"
            >
              {REPORT_STRINGS.RETRY}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
