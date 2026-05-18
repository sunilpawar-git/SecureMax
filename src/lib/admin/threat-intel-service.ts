/**
 * Threat intel business logic — filter, manual add, soft-delete with protection.
 * All filters (including domain/industry tags) are applied in the DB query so
 * pagination skip/take and total count are always consistent.
 */

import { prisma } from '@/lib/prisma';
import { logAdminAction } from './actions';
import {
  ADMIN_ACTION_TYPE,
  ADMIN_ENTITY_TYPE,
  ADMIN_ERR,
  MANUAL_ARTICLE_RELEVANCE_SCORE,
} from '@/config/admin-strings';
import type { Prisma } from '@/generated/prisma/client';
import crypto from 'crypto';

export interface ThreatIntelFilters {
  domains?: string[];
  industries?: string[];
  startDate?: string;
  endDate?: string;
  search?: string;
  source?: string;
  usedInReports?: boolean;
  page?: number;
  limit?: number;
}

export async function getArticles(filters: ThreatIntelFilters = {}) {
  const {
    domains,
    industries,
    startDate,
    endDate,
    search,
    source,
    usedInReports,
    page = 1,
    limit = 50,
  } = filters;

  const where: Prisma.ThreatIntelWhereInput = { softDeleted: false };

  if (search) where.title = { contains: search, mode: 'insensitive' };
  if (source) where.source = source;
  if (usedInReports !== undefined) where.usedInReports = usedInReports;
  if (startDate || endDate) {
    where.scrapedAt = {};
    if (startDate) where.scrapedAt.gte = new Date(startDate);
    if (endDate) where.scrapedAt.lte = new Date(endDate);
  }

  // Push tag filters into DB — avoids in-memory filtering that breaks pagination.
  // Prisma JsonFilter array_contains checks whether the JSON array contains the value.
  if (domains?.length) {
    where.AND = (where.AND as Prisma.ThreatIntelWhereInput[] | undefined) ?? [];
    (where.AND as Prisma.ThreatIntelWhereInput[]).push({
      OR: domains.map((d) => ({ domainTags: { array_contains: [d] } })),
    });
  }
  if (industries?.length) {
    where.AND = (where.AND as Prisma.ThreatIntelWhereInput[] | undefined) ?? [];
    (where.AND as Prisma.ThreatIntelWhereInput[]).push({
      OR: industries.map((i) => ({ industryTags: { array_contains: [i] } })),
    });
  }

  const [articles, total] = await Promise.all([
    prisma.threatIntel.findMany({
      where,
      orderBy: { scrapedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.threatIntel.count({ where }),
  ]);

  return { articles, total, page, limit };
}

export interface AddArticleResult {
  success: boolean;
  error?: string;
  article?: unknown;
}

export async function addManualArticle(
  data: {
    title: string;
    url: string;
    summary: string;
    domainTags: string[];
    industryTags: string[];
  },
  adminId: string,
): Promise<AddArticleResult> {
  const existing = await prisma.threatIntel.findUnique({ where: { url: data.url } });
  if (existing) return { success: false, error: ADMIN_ERR.DUPLICATE_URL };

  const contentHash = crypto.createHash('sha256').update(data.url).digest('hex');

  const article = await prisma.threatIntel.create({
    data: {
      title: data.title,
      url: data.url,
      summary: data.summary,
      contentHash,
      domainTags: data.domainTags,
      industryTags: data.industryTags,
      source: 'manual',
      relevanceScore: MANUAL_ARTICLE_RELEVANCE_SCORE,
    },
  });

  await logAdminAction({
    adminId,
    actionType: ADMIN_ACTION_TYPE.THREAT_INTEL_ADDED,
    entityType: ADMIN_ENTITY_TYPE.THREAT_INTEL,
    entityId: article.id,
  });

  return { success: true, article };
}

export interface DeleteArticleResult {
  success: boolean;
  error?: string;
}

export async function deleteArticle(
  articleId: string,
  adminId: string,
): Promise<DeleteArticleResult> {
  const article = await prisma.threatIntel.findUnique({ where: { id: articleId } });
  if (!article) return { success: false, error: ADMIN_ERR.THREAT_INTEL_NOT_FOUND };
  if (article.usedInReports) return { success: false, error: ADMIN_ERR.THREAT_INTEL_PROTECTED };

  await prisma.threatIntel.update({
    where: { id: articleId },
    data: { softDeleted: true },
  });

  await logAdminAction({
    adminId,
    actionType: ADMIN_ACTION_TYPE.THREAT_INTEL_DELETED,
    entityType: ADMIN_ENTITY_TYPE.THREAT_INTEL,
    entityId: articleId,
  });

  return { success: true };
}
