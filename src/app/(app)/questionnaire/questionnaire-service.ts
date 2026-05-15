/**
 * Pure async functions for questionnaire API calls.
 * No React state — fully unit-testable with jest + mocked fetch.
 *
 * Session recovery contract:
 *   startSession() — if the server returns 409 (active session exists), it
 *   automatically calls resumeSession() and returns the existing session.
 *   Any other non-OK response throws with the server error message.
 */

import type { QuestionNode, RadarScores } from './types';

export interface ActiveSession {
  sessionId: string;
  currentQuestion: QuestionNode;
  radarScores: RadarScores;
  questionsAnswered: number;
}

export interface AnswerResult {
  nextQuestion: QuestionNode | null;
  radarScores: RadarScores;
  isComplete: boolean;
  aiReasoning: string | null;
  cppCitations: string[];
}

async function apiFetch(url: string, body: object): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Request failed');
  return data;
}

export async function startSession(track: string): Promise<ActiveSession> {
  let data: unknown;
  try {
    data = await apiFetch('/api/questionnaire?action=start', { track });
  } catch (err) {
    // 409 means an active session already exists — resume it transparently.
    if (err instanceof Error && err.message.includes('Active session already exists')) {
      return resumeSession(null, track);
    }
    throw err;
  }
  const d = data as { session_id: string; first_question: QuestionNode; radar_scores: RadarScores };
  return {
    sessionId: d.session_id,
    currentQuestion: d.first_question,
    radarScores: d.radar_scores,
    questionsAnswered: 0,
  };
}

export async function resumeSession(sessionId: string | null, _track?: string): Promise<ActiveSession> {
  const data = await apiFetch('/api/questionnaire?action=resume', { session_id: sessionId });
  const d = data as {
    session_id: string;
    current_question: QuestionNode;
    radar_scores: RadarScores;
    questions_answered: number;
  };
  return {
    sessionId: d.session_id,
    currentQuestion: d.current_question,
    radarScores: d.radar_scores,
    questionsAnswered: d.questions_answered,
  };
}

export async function submitAnswer(
  sessionId: string,
  questionId: string,
  answer: string | string[],
): Promise<AnswerResult> {
  const data = await apiFetch('/api/questionnaire?action=answer', {
    session_id: sessionId,
    question_id: questionId,
    answer,
  });
  const d = data as {
    next_question: QuestionNode | null;
    radar_scores: RadarScores;
    is_complete: boolean;
    ai_reasoning: string | null;
    cpp_citations: string[];
  };
  return {
    nextQuestion: d.next_question ?? null,
    radarScores: d.radar_scores,
    isComplete: d.is_complete,
    aiReasoning: d.ai_reasoning ?? null,
    cppCitations: d.cpp_citations ?? [],
  };
}
