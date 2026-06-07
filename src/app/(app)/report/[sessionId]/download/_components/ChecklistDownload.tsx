'use client';

import { useCallback, useState } from 'react';

interface ChecklistDownloadProps {
  sessionId: string;
  reportId: string;
}

type ButtonState = 'idle' | 'loading' | 'error';

export function ChecklistDownload({ sessionId, reportId }: ChecklistDownloadProps) {
  const [state, setState] = useState<ButtonState>('idle');

  const handleDownload = useCallback(async () => {
    setState('loading');
    try {
      const res = await fetch(
        `/api/report?action=checklist&report_id=${encodeURIComponent(reportId)}`,
      );
      if (!res.ok) {
        setState('error');
        return;
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_checklist_${sessionId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setState('idle');
    } catch {
      setState('error');
    }
  }, [sessionId, reportId]);

  return (
    <button
      onClick={handleDownload}
      disabled={state === 'loading'}
      className="w-full rounded-lg border border-emerald-700 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
    >
      {state === 'loading' ? 'Generating...' : 'Download On-Site Checklist'}
    </button>
  );
}
