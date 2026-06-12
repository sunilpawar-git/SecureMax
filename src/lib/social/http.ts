/**
 * Shared HTTP helpers for social publisher adapters.
 */

import { logger } from '@/lib/logger';
import type { SocialPublishResult } from './types';

export const STEP_TIMEOUT_MS = 15_000;

export async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STEP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Log a failed platform step (status + truncated detail, never tokens). */
export async function failStep(
  platform: string,
  step: string,
  res: Response,
): Promise<SocialPublishResult> {
  const detail = await res.text().catch(() => '');
  logger.error(`${platform} ${step} failed`, `${platform}-publisher`, {
    status: res.status,
    detail: detail.slice(0, 300),
  });
  return { success: false, error: `${platform} ${step} failed (${res.status})` };
}

/** Wrap unexpected errors (timeouts, network) into a failure result. */
export function errorResult(platform: string, err: unknown): SocialPublishResult {
  const timedOut = err instanceof Error && err.name === 'AbortError';
  logger.error(`${platform} publish error`, `${platform}-publisher`, {
    detail: timedOut ? 'timeout' : String(err),
  });
  return {
    success: false,
    error: timedOut ? `${platform} request timed out` : `${platform} request failed`,
  };
}
