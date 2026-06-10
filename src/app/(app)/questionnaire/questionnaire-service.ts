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

function getStoredSessionId(track: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(`questionnaire_session_${track}`);
    }
    if (typeof global !== 'undefined') {
      const globalWithStorage = global as typeof globalThis & { localStorage?: Storage };
      if (globalWithStorage.localStorage) {
        return globalWithStorage.localStorage.getItem(`questionnaire_session_${track}`);
      }
    }
  } catch {
    // localStorage might be unavailable
  }
  return null;
}

function storeSessionId(track: string, sessionId: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`questionnaire_session_${track}`, sessionId);
    } else if (typeof global !== 'undefined') {
      const globalWithStorage = global as typeof globalThis & { localStorage?: Storage };
      if (globalWithStorage.localStorage) {
        globalWithStorage.localStorage.setItem(`questionnaire_session_${track}`, sessionId);
      }
    }
  } catch {
    // localStorage might be unavailable
  }
}

function clearStoredSessionId(track: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(`questionnaire_session_${track}`);
    } else if (typeof global !== 'undefined') {
      const globalWithStorage = global as typeof globalThis & { localStorage?: Storage };
      if (globalWithStorage.localStorage) {
        globalWithStorage.localStorage.removeItem(`questionnaire_session_${track}`);
      }
    }
  } catch {
    // localStorage might be unavailable
  }
}

async function apiFetch(url: string, body: object): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const errorMsg =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as Record<string, unknown>).error)
        : 'Request failed';
    const err = new Error(errorMsg) as Error & Record<string, unknown>;
    err.statusCode = res.status;
    if (typeof data === 'object' && data !== null && 'session_id' in data) {
      err.sessionId = String((data as Record<string, unknown>).session_id);
    }
    throw err;
  }
  return data;
}

export async function startSession(track: string, captchaToken?: string): Promise<ActiveSession> {
  let data: unknown;
  try {
    data = await apiFetch('/api/questionnaire?action=start', {
      track,
      ...(captchaToken ? { captcha_token: captchaToken } : {}),
    });
  } catch (err) {
    // 409 means an active session already exists — try to resume it transparently.
    if (err instanceof Error && (err as unknown as Record<string, unknown>).statusCode === 409) {
      const serverSessionId = (err as unknown as Record<string, unknown>).sessionId as
        | string
        | undefined;
      const cachedSessionId = serverSessionId || getStoredSessionId(track);
      if (cachedSessionId) {
        try {
          const resumed = await resumeSession(cachedSessionId);
          storeSessionId(track, resumed.sessionId);
          return resumed;
        } catch {
          clearStoredSessionId(track);
          throw err;
        }
      }
    }
    throw err;
  }
  const d = data as { session_id: string; first_question: QuestionNode; radar_scores: RadarScores };
  const session = {
    sessionId: d.session_id,
    currentQuestion: d.first_question,
    radarScores: d.radar_scores,
    questionsAnswered: 0,
  };

  // Cache the session ID for recovery on reload
  storeSessionId(track, d.session_id);

  return session;
}

export async function resumeSession(sessionId: string | null): Promise<ActiveSession> {
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
