/**
 * Shared test constants for E2E — mirrors src/config/strings.ts values.
 * Kept separate to avoid importing app code in Playwright tests.
 */

export const TRACK = {
  HNI: 'hni',
  ENTERPRISE: 'enterprise',
} as const;

export const TEST_TIMEOUT = {
  NAVIGATION: 10_000,
  REPORT_GENERATION: 120_000,
  API_CALL: 30_000,
} as const;
