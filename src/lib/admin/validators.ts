/**
 * Zod validation schemas for all admin API inputs.
 * Every admin endpoint must validate through these schemas.
 */

import { z } from 'zod';
import { LEAD_STATUS, ADMIN_ACTION_TYPE, ADMIN_ENTITY_TYPE } from '@/config/admin-strings';
import { CPP_DOMAINS, VALID_TRACKS } from '@/config/strings';

const leadStatusValues = Object.values(LEAD_STATUS) as [string, ...string[]];
const cppDomainCodes: string[] = Object.values(CPP_DOMAINS).map((d) => d.code);

export const LeadStatusUpdateSchema = z.object({
  leadId: z.string().min(1),
  newStatus: z.enum(leadStatusValues),
});

export const LeadEmailSchema = z.object({
  leadId: z.string().min(1),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

export const ReportRegenerateSchema = z.object({
  sessionId: z.string().min(1),
});

export const ReportUnlockSchema = z.object({
  sessionId: z.string().min(1),
});

export const ThreatIntelAddSchema = z.object({
  title: z.string().min(1).max(500),
  url: z.string().url().max(2000),
  summary: z.string().min(10).max(5000),
  domainTags: z
    .array(z.string().refine((v) => cppDomainCodes.includes(v)))
    .min(1)
    .max(7),
  industryTags: z.array(z.string().min(1).max(50)).max(10).default([]),
});

export const ThreatIntelDeleteSchema = z.object({
  articleId: z.string().min(1),
});

export const ThreatIntelFilterSchema = z.object({
  domains: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',') : undefined)),
  industries: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',') : undefined)),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(200).optional(),
  source: z.string().optional(),
  usedInReports: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const SessionForceCloseSchema = z.object({
  sessionId: z.string().min(1),
});

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
});

export const AuditLogFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  actionType: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  format: z.enum(['json', 'csv']).default('json'),
});

/** Internal use / test validation only — no HTTP endpoint ingests this schema directly. */
export const AdminActionSchema = z.object({
  adminId: z.string().min(1),
  actionType: z.enum(Object.values(ADMIN_ACTION_TYPE) as [string, ...string[]]),
  entityType: z.enum(Object.values(ADMIN_ENTITY_TYPE) as [string, ...string[]]),
  entityId: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const LinkedInDraftSchema = z.object({
  article_ids: z.array(z.string().min(1)).min(1).max(10),
});

const validTrackValues = [...VALID_TRACKS] as [string, ...string[]];

export const UserFilterSchema = z.object({
  track: z.enum(validTrackValues).optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type UserFilter = z.infer<typeof UserFilterSchema>;
