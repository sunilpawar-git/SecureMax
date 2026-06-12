'use client';

/**
 * Client-side idle detector for the admin panel.
 * After ADMIN_IDLE.TIMEOUT_MS without user activity the admin is signed out;
 * a warning banner appears ADMIN_IDLE.WARN_BEFORE_MS earlier with an option
 * to stay signed in. Any activity (mouse, keyboard, scroll, touch) resets
 * both timers.
 *
 * Note: this is a client-side guard only — it cannot replace server-side
 * session expiry (P4 backlog item).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import { ADMIN_IDLE } from '@/config/admin-strings';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

export function IdleLogout() {
  const [showWarning, setShowWarning] = useState(false);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Arms the timers without touching state — safe to call from the mount effect.
  const armTimers = useCallback(() => {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    warnTimer.current = setTimeout(
      () => setShowWarning(true),
      ADMIN_IDLE.TIMEOUT_MS - ADMIN_IDLE.WARN_BEFORE_MS,
    );
    logoutTimer.current = setTimeout(() => {
      void signOut({ callbackUrl: '/auth/signin?callbackUrl=/admin' });
    }, ADMIN_IDLE.TIMEOUT_MS);
  }, []);

  const resetTimers = useCallback(() => {
    setShowWarning(false);
    armTimers();
  }, [armTimers]);

  useEffect(() => {
    armTimers();
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, resetTimers, { passive: true });
    }
    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, resetTimers);
      }
      if (warnTimer.current) clearTimeout(warnTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, [armTimers, resetTimers]);

  if (!showWarning) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/80 p-4 shadow-lg"
    >
      <p className="text-sm text-amber-900 dark:text-amber-100">{ADMIN_IDLE.WARNING_MESSAGE}</p>
      <button
        onClick={resetTimers}
        className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-200 underline"
      >
        {ADMIN_IDLE.STAY_SIGNED_IN}
      </button>
    </div>
  );
}
