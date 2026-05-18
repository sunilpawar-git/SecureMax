/**
 * Hook to trigger report generation on questionnaire completion.
 * Extracted from page.tsx — MVVM: logic in hook, view renders.
 */

import { useEffect, useRef, useState } from 'react';

interface ReportTriggerState {
  triggered: boolean;
  reportId: string | null; // job UUID — used for /report/[id]/status|summary|download
  sessionId: string | null; // audit session CUID — used for /payment/[id]
  error: string | null;
}

export function useReportTrigger(
  sessionId: string | null,
  isComplete: boolean,
): ReportTriggerState {
  const [state, setState] = useState<ReportTriggerState>({
    triggered: false,
    reportId: null,
    sessionId: null,
    error: null,
  });
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (!isComplete || !sessionId || hasTriggered.current) return;
    hasTriggered.current = true;

    const controller = new AbortController();

    async function trigger() {
      try {
        const res = await fetch('/api/report?action=generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (!res.ok) {
          setState({
            triggered: true,
            reportId: null,
            sessionId,
            error: data.error || 'Failed to start report generation',
          });
          return;
        }
        setState({
          triggered: true,
          reportId: data.report_id ?? sessionId,
          sessionId,
          error: null,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState({
          triggered: true,
          reportId: null,
          sessionId,
          error: 'Network error — report generation may still proceed',
        });
      }
    }

    trigger();

    return () => {
      controller.abort();
    };
  }, [isComplete, sessionId]);

  return state;
}
