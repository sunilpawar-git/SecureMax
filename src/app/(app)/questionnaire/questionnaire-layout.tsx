'use client';

/**
 * Presentational shell for the active questionnaire (no fetch logic — that stays
 * in questionnaire-service.ts per (app)/CLAUDE.md). Owns only responsive layout:
 *  - Mobile (<md): small radar above a scrollable QuestionCard; the card renders
 *    its own fixed bottom CTA bar (choice) or inline Continue (text_input).
 *  - Desktop (≥md): 60/40 grid with a sticky sidebar (radar + legend + trust).
 */

import { LockClosedIcon } from '@heroicons/react/24/outline';
import { QUESTIONNAIRE } from '@/config/strings';
import { RadarChart } from '@/components/chart/radar-chart';
import { QuestionCard } from './question-card';
import type { QuestionNode, RadarScores } from './types';

interface QuestionnaireLayoutProps {
  question: QuestionNode;
  onSubmit: (answer: string | string[]) => void;
  isLoading: boolean;
  questionNumber: number;
  radarScores: RadarScores;
  error: string | null;
}

function TrustSignal() {
  return (
    <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <LockClosedIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{QUESTIONNAIRE.TRUST_SIGNAL}</span>
    </p>
  );
}

export function QuestionnaireLayout({
  question,
  onSubmit,
  isLoading,
  questionNumber,
  radarScores,
  error,
}: QuestionnaireLayoutProps) {
  return (
    <div className="min-h-[calc(100vh-3rem)] bg-gray-50 dark:bg-slate-900 p-4">
      <div className="max-w-4xl mx-auto md:grid md:grid-cols-5 md:gap-6">
        {/* Mobile radar (above the card) */}
        <div className="md:hidden mb-4 mx-auto w-[160px]">
          <RadarChart scores={radarScores} size="sm" showLegend={false} />
        </div>

        {/* Main column — 60% on desktop */}
        <div className="md:col-span-3">
          <QuestionCard
            question={question}
            onSubmit={onSubmit}
            isLoading={isLoading}
            questionNumber={questionNumber}
          />
          {error && <p className="text-red-600 dark:text-red-400 text-sm mt-2">{error}</p>}
          <div className="md:hidden mt-6 mb-24">
            <TrustSignal />
          </div>
        </div>

        {/* Desktop sidebar — 40% */}
        <aside className="hidden md:block md:col-span-2">
          <div className="sticky top-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400">
              {QUESTIONNAIRE.SECURITY_SCORE}
            </h3>
            <RadarChart scores={radarScores} size="lg" showLegend />
            <TrustSignal />
          </div>
        </aside>
      </div>
    </div>
  );
}
