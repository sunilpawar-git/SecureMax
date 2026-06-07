/**
 * Phase 1 — Server-side validation on questionnaire endpoints (#3).
 * TDD: tests written BEFORE schemas + route refactor.
 *
 * Rule 9: each test asserts a specific malformed input is rejected at the
 * Next layer (422) and that the AI service is NOT called — so removing the
 * guard makes the test fail.
 */

import {
  StartSchema,
  AnswerSchema,
  ResumeSchema,
  AbandonSchema,
} from '@/app/api/questionnaire/schemas';

// ─── Pure schema tests (no mocks) ─────────────────────────────────────────────

describe('StartSchema', () => {
  it('accepts a valid hni track', () => {
    expect(StartSchema.safeParse({ track: 'hni' }).success).toBe(true);
  });
  it('accepts a valid enterprise track', () => {
    expect(StartSchema.safeParse({ track: 'enterprise' }).success).toBe(true);
  });
  it('rejects an unknown track', () => {
    expect(StartSchema.safeParse({ track: 'corporate' }).success).toBe(false);
  });
  it('rejects a missing track', () => {
    expect(StartSchema.safeParse({}).success).toBe(false);
  });
});

describe('AnswerSchema', () => {
  const VALID_SESSION = 'clh1234567890abcdefghijklm';

  it('accepts a string answer', () => {
    const r = AnswerSchema.safeParse({
      session_id: VALID_SESSION,
      question_id: 'hni_q1_property_type',
      answer: 'villa',
    });
    expect(r.success).toBe(true);
  });
  it('accepts a string[] answer (multi-select)', () => {
    const r = AnswerSchema.safeParse({
      session_id: VALID_SESSION,
      question_id: 'hni_q3_perimeter',
      answer: ['cctv', 'guards'],
    });
    expect(r.success).toBe(true);
  });
  it('rejects an object answer (prototype-pollution / injection guard)', () => {
    const r = AnswerSchema.safeParse({
      session_id: VALID_SESSION,
      question_id: 'hni_q1',
      answer: { __proto__: 'x' },
    });
    expect(r.success).toBe(false);
  });
  it('rejects a path-traversal session_id', () => {
    const r = AnswerSchema.safeParse({
      session_id: '../../admin',
      question_id: 'hni_q1',
      answer: 'villa',
    });
    expect(r.success).toBe(false);
  });
  it('rejects a missing question_id', () => {
    const r = AnswerSchema.safeParse({ session_id: VALID_SESSION, answer: 'villa' });
    expect(r.success).toBe(false);
  });
});

describe('ResumeSchema / AbandonSchema', () => {
  it('accept a valid session_id', () => {
    const id = 'clh1234567890abcdefghijklm';
    expect(ResumeSchema.safeParse({ session_id: id }).success).toBe(true);
    expect(AbandonSchema.safeParse({ session_id: id }).success).toBe(true);
  });
  it('reject an invalid session_id', () => {
    expect(ResumeSchema.safeParse({ session_id: 'abc' }).success).toBe(false);
    expect(AbandonSchema.safeParse({ session_id: 'abc/def' }).success).toBe(false);
  });
});

// ─── Route integration tests (mocked auth + AI service + prisma) ───────────────

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/ai-service', () => ({
  aiServiceFetch: jest.fn(),
  AIServiceError: class AIServiceError extends Error {},
}));
jest.mock('@/lib/prisma', () => ({
  prisma: { auditSession: { count: jest.fn().mockResolvedValue(0) } },
}));

import { auth } from '@/lib/auth';
import { aiServiceFetch } from '@/lib/ai-service';
import type { NextRequest } from 'next/server';

const mockAuth = auth as unknown as jest.Mock;
const mockAiFetch = aiServiceFetch as unknown as jest.Mock;

function makeReq(action: string, body: unknown): NextRequest {
  return {
    nextUrl: { searchParams: new URLSearchParams(`action=${action}`) },
    json: async () => body,
  } as unknown as NextRequest;
}

describe('POST /api/questionnaire — validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'u@test.com',
        role: 'user',
        track: 'hni',
        consentAt: '2026-01-01',
      },
    });
    mockAiFetch.mockResolvedValue({ ok: true });
  });

  it('rejects an invalid answer payload with 422 and never calls the AI service', async () => {
    const { POST } = await import('@/app/api/questionnaire/route');
    const res = await POST(makeReq('answer', { session_id: 'bad', answer: {} }));
    expect(res.status).toBe(422);
    expect(mockAiFetch).not.toHaveBeenCalled();
  });

  it('rejects an unknown track on start with 422', async () => {
    const { POST } = await import('@/app/api/questionnaire/route');
    const res = await POST(makeReq('start', { track: 'corporate' }));
    expect(res.status).toBe(422);
    expect(mockAiFetch).not.toHaveBeenCalled();
  });

  it('rejects an unknown action without touching the AI service', async () => {
    const { POST } = await import('@/app/api/questionnaire/route');
    const res = await POST(makeReq('delete', {}));
    expect(res.status).toBe(400);
    expect(mockAiFetch).not.toHaveBeenCalled();
  });

  it('forwards a valid answer to the AI service', async () => {
    const { POST } = await import('@/app/api/questionnaire/route');
    const res = await POST(
      makeReq('answer', {
        session_id: 'clh1234567890abcdefghijklm',
        question_id: 'hni_q1_property_type',
        answer: 'villa',
      }),
    );
    expect(res.status).toBe(200);
    expect(mockAiFetch).toHaveBeenCalledTimes(1);
  });
});
