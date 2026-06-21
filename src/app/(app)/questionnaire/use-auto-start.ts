/**
 * Hook to auto-start a session from a URL `track` param, skipping the
 * HNI/Enterprise picker when the user already chose a track on the landing
 * page. Mirrors the hasTriggered-ref pattern in use-report-trigger.ts.
 */

import { useEffect, useRef } from 'react';
import type { SessionState } from './types';

export function useAutoStart(
  urlTrack: string | null,
  urlSessionId: string | null,
  sessionState: SessionState,
  handleStart: (track: string) => void,
): void {
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (hasTriggered.current) return;
    if (!urlTrack || urlSessionId || sessionState !== 'idle') return;
    hasTriggered.current = true;
    handleStart(urlTrack);
  }, [urlTrack, urlSessionId, sessionState, handleStart]);
}
