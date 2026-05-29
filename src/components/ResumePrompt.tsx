'use client';

/**
 * Resume/restart interstitial shown when a user navigates to the questionnaire
 * with an existing in-progress session (via dashboard link).
 */

import { RESUME, TRACK_LABEL } from '@/config/strings';
import { TRACK_BADGE_STYLES } from '@/config/colors';

interface ResumePromptProps {
  track: string;
  questionsAnswered: number;
  onResume: () => void;
  onRestart: () => void;
}

export function ResumePrompt({ track, questionsAnswered, onResume, onRestart }: ResumePromptProps) {
  const badgeClass = TRACK_BADGE_STYLES[track] ?? TRACK_BADGE_STYLES.hni;

  const handleRestart = () => {
    if (window.confirm(RESUME.RESTART_CONFIRM)) {
      onRestart();
    }
  };

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6 text-center">
        <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${badgeClass}`}>
          {TRACK_LABEL[track] ?? track}
        </span>

        <h2 className="text-xl font-bold text-slate-900">{RESUME.TITLE}</h2>
        <p className="text-sm text-slate-600">{RESUME.DESCRIPTION}</p>

        <p className="text-sm text-slate-500">
          {questionsAnswered} {RESUME.QUESTIONS_ANSWERED}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full py-3 px-6 bg-emerald-700 text-white rounded-lg font-medium hover:bg-emerald-800 transition-colors"
          >
            {RESUME.RESUME_BTN}
          </button>
          <button
            onClick={handleRestart}
            className="w-full py-3 px-6 bg-white text-slate-600 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            {RESUME.RESTART_BTN}
          </button>
        </div>
      </div>
    </div>
  );
}
