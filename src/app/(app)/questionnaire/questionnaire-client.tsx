'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RadarChart } from './radar-chart';
import { QuestionCard } from './question-card';
import { APP, CTA, TRACK, VALID_TRACKS, UI, QUESTIONNAIRE } from '@/config/strings';
import { startSession, resumeSession, submitAnswer } from './questionnaire-service';
import { useReportTrigger } from './use-report-trigger';
import { ResumePrompt } from '@/components/ResumePrompt';
import type { QuestionNode, RadarScores, SessionState } from './types';

function getErrorMessage(err: unknown): string {
  if (process.env.NODE_ENV === 'development') {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
  }
  return 'Something went wrong. Please try again.';
}

export default function QuestionnaireClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-3rem)] bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
          <p className="text-sm text-slate-400 dark:text-slate-500">{UI.LOADING}</p>
        </div>
      }
    >
      <QuestionnaireContent />
    </Suspense>
  );
}

function getTrackFromParams(raw: string | null): string | null {
  if (raw && (VALID_TRACKS as readonly string[]).includes(raw)) return raw;
  return null;
}

function QuestionnaireContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTrack = getTrackFromParams(searchParams.get('track'));
  const urlSessionId = searchParams.get('session');

  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionNode | null>(null);
  const [radarScores, setRadarScores] = useState<RadarScores>({});
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<string | null>(urlTrack);

  const reportTrigger = useReportTrigger(sessionId, sessionState === 'completed');

  useEffect(() => {
    if (!urlSessionId || !urlTrack || sessionState !== 'idle') return;
    let cancelled = false;

    async function prefetchResume() {
      try {
        const session = await resumeSession(urlSessionId!);
        if (cancelled) return;
        setSessionId(session.sessionId);
        setCurrentTrack(urlTrack);
        setQuestionsAnswered(session.questionsAnswered);
        setRadarScores(session.radarScores);
        setCurrentQuestion(session.currentQuestion);
        setSessionState('resume_prompt');
      } catch {
        if (!cancelled) setSessionState('idle');
      }
    }

    prefetchResume();
    return () => {
      cancelled = true;
    };
  }, [urlSessionId, urlTrack, sessionState]);

  const handleStart = useCallback(async (track: string) => {
    setIsLoading(true);
    setError(null);
    setCurrentTrack(track);
    try {
      const session = await startSession(track);
      setSessionId(session.sessionId);
      setCurrentQuestion(session.currentQuestion);
      setRadarScores(session.radarScores);
      setQuestionsAnswered(session.questionsAnswered);
      setSessionState('active');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleResume = useCallback(async (sid: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await resumeSession(sid);
      setSessionId(session.sessionId);
      setCurrentQuestion(session.currentQuestion);
      setRadarScores(session.radarScores);
      setQuestionsAnswered(session.questionsAnswered);
      setSessionState('active');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAnswer = useCallback(
    async (answer: string | string[]) => {
      if (!sessionId || !currentQuestion) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await submitAnswer(sessionId, currentQuestion.id, answer);
        setRadarScores(result.radarScores);
        setQuestionsAnswered((prev) => prev + 1);
        if (result.isComplete) {
          setSessionState('completed');
          setCurrentQuestion(result.nextQuestion);
        } else {
          setCurrentQuestion(result.nextQuestion);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, currentQuestion],
  );

  if (sessionState === 'resume_prompt' && sessionId && currentTrack) {
    return (
      <ResumePrompt
        track={currentTrack}
        questionsAnswered={questionsAnswered}
        onResume={() => handleResume(sessionId)}
        onRestart={() => handleStart(currentTrack)}
      />
    );
  }

  if (sessionState === 'idle') {
    return (
      <div className="min-h-[calc(100vh-3rem)] bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{APP.NAME}</h1>
          <p className="text-gray-600 dark:text-slate-300">{QUESTIONNAIRE.TRACK_PROMPT}</p>
          <div className="grid gap-4">
            <button
              onClick={() => handleStart(TRACK.HNI)}
              disabled={isLoading}
              className={`w-full py-4 px-6 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                currentTrack === TRACK.HNI
                  ? 'bg-emerald-800 ring-2 ring-emerald-400'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {CTA.HNI}
            </button>
            <button
              onClick={() => handleStart(TRACK.ENTERPRISE)}
              disabled={isLoading}
              className={`w-full py-4 px-6 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                currentTrack === TRACK.ENTERPRISE
                  ? 'bg-slate-800 ring-2 ring-slate-400 dark:bg-slate-700 dark:ring-slate-300'
                  : 'bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700'
              }`}
            >
              {CTA.ENTERPRISE}
            </button>
          </div>
          {error && (
            <div className="space-y-2">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              {sessionId && currentTrack && (
                <button
                  onClick={() => handleResume(sessionId)}
                  className="text-sm text-emerald-700 dark:text-emerald-400 underline"
                >
                  {QUESTIONNAIRE.RESUME_EXISTING}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (sessionState === 'completed') {
    return (
      <div className="min-h-[calc(100vh-3rem)] bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{QUESTIONNAIRE.COMPLETE_TITLE}</h2>
          <p className="text-gray-600 dark:text-slate-300">
            You answered {questionsAnswered} questions.
            {reportTrigger.triggered
              ? reportTrigger.error
                ? ` ${reportTrigger.error}`
                : ` ${QUESTIONNAIRE.REPORT_GENERATING}`
              : ` ${QUESTIONNAIRE.REPORT_INITIATING}`}
          </p>
          <RadarChart scores={radarScores} />
          {reportTrigger.triggered && !reportTrigger.error && (
            <button
              onClick={() => router.push(`/report/${reportTrigger.reportId ?? sessionId}/status`)}
              className="inline-block rounded-lg bg-emerald-700 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
            >
              {QUESTIONNAIRE.VIEW_REPORT_STATUS}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-gray-50 dark:bg-slate-900 p-4">
      <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              onSubmit={handleAnswer}
              isLoading={isLoading}
              questionNumber={questionsAnswered + 1}
            />
          )}
          {error && <p className="text-red-600 dark:text-red-400 text-sm mt-2">{error}</p>}
        </div>
        <div className="md:col-span-1">
          <div className="sticky top-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">
              {QUESTIONNAIRE.SECURITY_SCORE}
            </h3>
            <RadarChart scores={radarScores} />
          </div>
        </div>
      </div>
    </div>
  );
}
