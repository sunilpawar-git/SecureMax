/**
 * TDD: Session recovery logic in the questionnaire service layer.
 *
 * Tests written BEFORE implementation. Each test asserts the specific
 * branching behaviour that was broken in production:
 *
 *  1. startSession() on 409 → auto-resumes (returns resume payload, not an error).
 *  2. startSession() on other errors → throws with the server error message.
 *  3. resumeSession() returns normalised ActiveSession.
 *  4. submitAnswer() returns next question id on a normal advance.
 *  5. submitAnswer() returns is_complete=true when the server says so.
 */

import {
  startSession,
  resumeSession,
  submitAnswer,
  type ActiveSession,
  type AnswerResult,
} from '@/app/(app)/questionnaire/questionnaire-service';

// ─── fixtures ─────────────────────────────────────────────────────────────────

const Q1 = {
  id: 'hni_q1_property_type',
  domain: 'CPP-07',
  text: 'What type of property are we auditing today?',
  question_type: 'single_choice',
  options: ['Villa', 'Apartment'],
  score_drop_trigger: false,
};

const Q2 = {
  id: 'hni_q3_incident_history',
  domain: 'CPP-01',
  text: 'Any security incident in the past 12 months?',
  question_type: 'single_choice',
  options: ['Yes', 'No'],
  score_drop_trigger: false,
};

const RADAR = { 'CPP-01': 100, 'CPP-07': 100 };
const SESSION_ID = 'test-session-abc';

// ─── mock helpers ─────────────────────────────────────────────────────────────

function mockFetch(...responses: Array<{ ok: boolean; status?: number; body: object }>) {
  let call = 0;
  global.fetch = jest.fn().mockImplementation(() => {
    const r = responses[call] ?? responses[responses.length - 1];
    call++;
    return Promise.resolve({
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 400),
      json: () => Promise.resolve(r.body),
    });
  });
}

afterEach(() => jest.restoreAllMocks());

// ─── 1. 409 on start → auto-resume ───────────────────────────────────────────

describe('startSession — 409 triggers automatic resume', () => {
  let mockLocalStorage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
  };

  beforeEach(() => {
    const store: Record<string, string> = {};
    mockLocalStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    };
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, writable: true, configurable: true });
  });

  it('returns a valid ActiveSession when start gets 409 followed by successful resume', async () => {
    mockFetch(
      {
        ok: false,
        status: 409,
        body: { error: 'Active session already exists. Resume or abandon it first.' },
      },
      {
        ok: true,
        body: {
          session_id: SESSION_ID,
          current_question: Q1,
          radar_scores: RADAR,
          questions_answered: 2,
        },
      },
    );

    // Pre-populate localStorage with a session ID (simulating a previous session)
    mockLocalStorage.setItem(`questionnaire_session_hni`, SESSION_ID);

    const result: ActiveSession = await startSession('hni');

    expect(result.sessionId).toBe(SESSION_ID);
    expect(result.currentQuestion.id).toBe(Q1.id);
    expect(result.radarScores).toEqual(RADAR);
    expect(result.questionsAnswered).toBe(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('makes the second call to the resume endpoint', async () => {
    mockFetch(
      { ok: false, status: 409, body: { error: 'Active session already exists. Resume or abandon it first.' } },
      { ok: true, body: { session_id: SESSION_ID, current_question: Q1, radar_scores: RADAR, questions_answered: 0 } },
    );

    mockLocalStorage.setItem(`questionnaire_session_hni`, SESSION_ID);
    await startSession('hni');

    const resumeCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(resumeCall[0]).toContain('action=resume');
  });
});

// ─── 2. Non-409 errors are thrown ─────────────────────────────────────────────

describe('startSession — non-409 errors throw', () => {
  it('throws with server message on 500', async () => {
    mockFetch({ ok: false, status: 500, body: { error: 'Internal server error' } });

    await expect(startSession('hni')).rejects.toThrow('Internal server error');
  });

  it('throws with server message on 401', async () => {
    mockFetch({ ok: false, status: 401, body: { error: 'Authentication required' } });

    await expect(startSession('hni')).rejects.toThrow('Authentication required');
  });
});

// ─── 3. resumeSession returns normalised ActiveSession ────────────────────────

describe('resumeSession', () => {
  it('returns ActiveSession from the resume payload', async () => {
    mockFetch({
      ok: true,
      body: {
        session_id: SESSION_ID,
        current_question: Q2,
        radar_scores: RADAR,
        questions_answered: 3,
      },
    });

    const result: ActiveSession = await resumeSession(SESSION_ID);

    expect(result.sessionId).toBe(SESSION_ID);
    expect(result.currentQuestion.id).toBe(Q2.id);
    expect(result.questionsAnswered).toBe(3);
  });

  it('throws when resume returns 404', async () => {
    mockFetch({ ok: false, status: 404, body: { error: 'Session not found' } });

    await expect(resumeSession('bad-id')).rejects.toThrow('Session not found');
  });
});

// ─── 4. submitAnswer advances to the correct next question ────────────────────

describe('submitAnswer', () => {
  it('returns next question id matching next_question.id from the response', async () => {
    mockFetch({
      ok: true,
      body: {
        next_question: Q2,
        radar_scores: RADAR,
        is_complete: false,
        ai_branched: false,
        ai_reasoning: null,
        cpp_citations: [],
      },
    });

    const result: AnswerResult = await submitAnswer(SESSION_ID, Q1.id, 'Villa');

    expect(result.nextQuestion?.id).toBe(Q2.id);
    expect(result.isComplete).toBe(false);
    expect(result.radarScores).toEqual(RADAR);
  });

  it('sends session_id, question_id, and answer in the request body', async () => {
    mockFetch({
      ok: true,
      body: { next_question: Q2, radar_scores: RADAR, is_complete: false, ai_branched: false, ai_reasoning: null, cpp_citations: [] },
    });

    await submitAnswer(SESSION_ID, Q1.id, 'Villa');

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.session_id).toBe(SESSION_ID);
    expect(body.question_id).toBe(Q1.id);
    expect(body.answer).toBe('Villa');
  });
});

// ─── 5. submitAnswer marks complete ──────────────────────────────────────────

describe('submitAnswer — completion', () => {
  it('returns isComplete=true and nextQuestion=null when server signals completion', async () => {
    mockFetch({
      ok: true,
      body: {
        next_question: null,
        radar_scores: RADAR,
        is_complete: true,
        ai_branched: false,
        ai_reasoning: null,
        cpp_citations: [],
      },
    });

    const result: AnswerResult = await submitAnswer(SESSION_ID, Q1.id, 'Villa');

    expect(result.isComplete).toBe(true);
    expect(result.nextQuestion).toBeNull();
  });

  it('throws when server returns an error on answer submission', async () => {
    mockFetch({ ok: false, status: 400, body: { error: 'Expected answer for hni_q3_incident_history, got hni_q3_guard_count' } });

    await expect(submitAnswer(SESSION_ID, 'hni_q3_guard_count', 'Yes')).rejects.toThrow(
      'Expected answer for hni_q3_incident_history, got hni_q3_guard_count',
    );
  });
});
