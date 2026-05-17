'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { APP } from '@/config/strings';

type DownloadState = 'loading' | 'ready' | 'downloading' | 'error' | 'payment_required' | 'pending_approval';

export default function ReportDownloadPage() {
  const params = useParams();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : (params.sessionId ?? '');
  const [state, setState] = useState<DownloadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [auditSessionId, setAuditSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    async function checkAccess() {
      try {
        const res = await fetch(`/api/report?action=status&report_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 402) {
            setState('payment_required');
          } else if (res.status === 403) {
            setState('pending_approval');
          } else {
            setState('error');
            setError(data.error || 'Could not verify report access');
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
          setError('Report is not ready yet.');
        }
      } catch {
        setState('error');
        setError('Network error. Please try again.');
      }
    }

    checkAccess();
  }, [sessionId]);

  const handleDownload = useCallback(async () => {
    setState('downloading');
    try {
      const res = await fetch(`/api/report?action=full&report_id=${encodeURIComponent(sessionId)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState('error');
        setError(data.error || 'Download failed');
        return;
      }

      const contentType = res.headers.get('Content-Type') ?? '';
      if (!contentType.includes('application/pdf')) {
        setState('error');
        setError('Unexpected response from server. Please retry.');
        return;
      }

      const arrayBuffer = await res.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Validate PDF magic bytes (%PDF) before saving
      const isPdf =
        bytes[0] === 0x25 && // %
        bytes[1] === 0x50 && // P
        bytes[2] === 0x44 && // D
        bytes[3] === 0x46;   // F

      if (!isPdf) {
        setState('error');
        setError('Received an invalid PDF file. Please contact support.');
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
      setError('Download failed. Please try again.');
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-xl font-bold text-slate-900">{APP.NAME}</h1>

        {state === 'loading' && (
          <p className="text-sm text-slate-500">Verifying report access...</p>
        )}

        {state === 'ready' && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <p className="text-sm text-slate-600">Your report is ready.</p>
            <button
              onClick={handleDownload}
              className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
            >
              Download PDF Report
            </button>
          </div>
        )}

        {state === 'downloading' && (
          <p className="text-sm text-slate-500">Downloading your report...</p>
        )}

        {state === 'payment_required' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Payment required to access the full report.</p>
            <a
              href={`/payment/${auditSessionId ?? sessionId}`}
              className="block w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
            >
              Unlock Full Report
            </a>
          </div>
        )}

        {state === 'pending_approval' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Your enterprise report is pending approval. Our team will unlock it after your proposal is processed.
            </p>
            <p className="text-xs text-slate-400">You will be notified when the report is ready for download.</p>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-3">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={() => window.location.reload()} className="text-sm text-emerald-700 underline">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
