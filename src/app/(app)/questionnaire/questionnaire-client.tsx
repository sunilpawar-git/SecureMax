'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RadarChart } from './radar-chart';
import { QuestionCard } from './question-card';
import { APP, CTA, TRACK, VALID_TRACKS } from '@/config/strings';
import { startSession, resumeSession, submitAnswer } from './questionnaire-service';
import { useReportTrigger } from './use-report-trigger';
import type { QuestionNode, RadarScores, SessionState } from './types';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as Record<string, unknown>).message);
  }
  return 'An unexpected error occurred';
}

export default function QuestionnaireClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-sm text-slate-400">Loading...</p>
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

  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionNode | null>(null);
  const [radarScores, setRadarScores] = useState<RadarScores>({});
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<string | null>(urlTrack);

  const reportTrigger = useReportTrigger(sessionId, sessionState === 'completed');

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

  if (sessionState === 'idle') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{APP.NAME}</h1>
          <p className="text-gray-600">Select your audit track to begin the security assessment.</p>
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
                  ? 'bg-slate-900 ring-2 ring-slate-400'
                  : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              {CTA.ENTERPRISE}
            </button>
          </div>
          {error && (
            <div className="space-y-2">
              <p className="text-red-600 text-sm">{error}</p>
              {sessionId && currentTrack && (
                <button
                  onClick={() => handleResume(sessionId)}
                  className="text-sm text-emerald-700 underline"
                >
                  Resume existing session
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Assessment Complete</h2>
          <p className="text-gray-600">
            You answered {questionsAnswered} questions.
            {reportTrigger.triggered
              ? reportTrigger.error
                ? ` ${reportTrigger.error}`
                : ' Your report is being generated.'
              : ' Initiating report generation...'}
          </p>
          <RadarChart scores={radarScores} />
          {reportTrigger.triggered && !reportTrigger.error && (
            <button
              onClick={() => router.push(`/report/${reportTrigger.reportId ?? sessionId}/status`)}
              className="inline-block rounded-lg bg-emerald-700 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-800 transition-colors"
            >
              View Report Status
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
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
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
        <div className="md:col-span-1">
          <div className="sticky top-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Security Score</h3>
            <RadarChart scores={radarScores} />
          </div>
        </div>
      </div>
    </div>
  );
}
