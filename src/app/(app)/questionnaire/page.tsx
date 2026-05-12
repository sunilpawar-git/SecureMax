'use client';

import { useState, useCallback, useMemo } from 'react';
import { RadarChart } from './radar-chart';
import { QuestionCard } from './question-card';
import { APP, CTA } from '@/config/strings';
import type { QuestionNode, RadarScores, SessionState } from './types';

export default function QuestionnairePage() {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionNode | null>(null);
  const [radarScores, setRadarScores] = useState<RadarScores>({});
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate a consistent user ID for this session
  const userId = useMemo(() => {
    if (typeof window === 'undefined') return 'server-user';
    const stored = sessionStorage.getItem('audit-user-id');
    if (stored) return stored;
    // Generate unique user ID using crypto for better entropy
    const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(4)));
    const randomStr = randomBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    const newId = `user-${randomStr}`;
    sessionStorage.setItem('audit-user-id', newId);
    return newId;
  }, []);

  const startSession = useCallback(async (track: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/questionnaire?action=start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({ track }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessionId(data.session_id);
      setCurrentQuestion(data.first_question);
      setRadarScores(data.radar_scores);
      setSessionState('active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const submitAnswer = useCallback(async (answer: string | string[]) => {
    if (!sessionId || !currentQuestion) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/questionnaire?action=answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: currentQuestion.id,
          answer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRadarScores(data.radar_scores);
      setQuestionsAnswered((prev) => prev + 1);
      if (data.is_complete) {
        setSessionState('completed');
        setCurrentQuestion(data.next_question || null);
      } else {
        setCurrentQuestion(data.next_question);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, currentQuestion, userId]);

  if (sessionState === 'idle') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{APP.NAME}</h1>
          <p className="text-gray-600">
            Select your audit track to begin the security assessment.
          </p>
          <div className="grid gap-4">
            <button
              onClick={() => startSession('hni')}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-emerald-700 text-white rounded-lg font-semibold
                hover:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              {CTA.HNI}
            </button>
            <button
              onClick={() => startSession('enterprise')}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-slate-800 text-white rounded-lg font-semibold
                hover:bg-slate-900 transition-colors disabled:opacity-50"
            >
              {CTA.ENTERPRISE}
            </button>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
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
            You answered {questionsAnswered} questions. Your report is being generated.
          </p>
          <RadarChart scores={radarScores} />
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
              onSubmit={submitAnswer}
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
