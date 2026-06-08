'use client';

/**
 * Shares questionnaire progress (track + current question number) from the deep
 * questionnaire client up to the slim AppHeader, which is rendered by the layout
 * shell far above it in the tree.
 *
 * The provider sits in `(app)/layout.tsx` so AppLayoutShell can read the meta
 * and pass it to AppHeader as props (keeping AppHeader prop-driven/testable).
 * The questionnaire client writes the meta via `useAppHeaderMeta().setMeta` and
 * clears it on unmount.
 */
import { createContext, useContext, useMemo, useState } from 'react';

export interface AppHeaderMeta {
  track: string | null;
  questionNumber: number | null;
}

interface AppHeaderContextValue extends AppHeaderMeta {
  setMeta: (meta: AppHeaderMeta) => void;
}

const EMPTY_META: AppHeaderMeta = { track: null, questionNumber: null };

const AppHeaderContext = createContext<AppHeaderContextValue | null>(null);

export function AppHeaderProvider({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<AppHeaderMeta>(EMPTY_META);
  const value = useMemo<AppHeaderContextValue>(() => ({ ...meta, setMeta }), [meta]);
  return <AppHeaderContext.Provider value={value}>{children}</AppHeaderContext.Provider>;
}

export function useAppHeaderMeta(): AppHeaderContextValue {
  const ctx = useContext(AppHeaderContext);
  if (!ctx) throw new Error('useAppHeaderMeta must be used within an AppHeaderProvider');
  return ctx;
}
