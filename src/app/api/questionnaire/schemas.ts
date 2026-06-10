/**
 * Zod schemas for questionnaire API inputs — one per action.
 * Validates at the Next layer before proxying to the FastAPI AI service.
 */

import { z } from 'zod';
import { TRACK, VALIDATION_ERR } from '@/config/strings';
import { validateCuid } from '@/lib/api/validate';

/** Prisma CUID (or UUID) — rejects path traversal / injection. */
const sessionId = z.string().refine(validateCuid, VALIDATION_ERR.INVALID_SESSION_ID);

/** Question-graph node id (e.g. `hni_q1_property_type`) — bounded, typed string. */
const questionId = z.string().trim().min(1, VALIDATION_ERR.REQUIRED_QUESTION_ID).max(200);

/** Answers are a single value or a multi-select list — never an object. */
const answer = z.union([z.string(), z.array(z.string())]);

export const StartSchema = z.object({
  track: z.enum([TRACK.HNI, TRACK.ENTERPRISE], { message: VALIDATION_ERR.INVALID_TRACK }),
  captcha_token: z.string().max(5000).optional(),
});

export const AnswerSchema = z.object({
  session_id: sessionId,
  question_id: questionId,
  answer,
});

export const ResumeSchema = z.object({
  session_id: sessionId,
});

export const AbandonSchema = z.object({
  session_id: sessionId,
});

export type StartInput = z.infer<typeof StartSchema>;
export type AnswerInput = z.infer<typeof AnswerSchema>;
export type ResumeInput = z.infer<typeof ResumeSchema>;
export type AbandonInput = z.infer<typeof AbandonSchema>;
