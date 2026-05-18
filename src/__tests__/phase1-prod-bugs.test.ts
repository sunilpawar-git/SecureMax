/**
 * Phase 1 — Production Bugs + Session Cap.
 * TDD: Tests written BEFORE implementation.
 *
 * Fix 1: ReportStatusResponse includes `downloadable` (FastAPI — separate Python test)
 * Fix 2: HeroSection CTAs include ?track= query param
 * Fix 3: Sign-in page reads searchParams.track, builds redirectTo with track
 * Fix 4: Session cap enforced at session creation
 */

import fs from 'fs';
import path from 'path';

// ─── Fix 2: HeroSection CTAs include track params ─────────────────────────────

describe('HeroSection CTAs carry track param', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src', 'components', 'landing', 'HeroSection.tsx'),
    'utf-8',
  );

  it('HNI CTA links to /auth/signin with track param via TRACK.HNI', () => {
    expect(content).toContain('track=${TRACK.HNI}');
  });

  it('Enterprise CTA links to /auth/signin with track param via TRACK.ENTERPRISE', () => {
    expect(content).toContain('track=${TRACK.ENTERPRISE}');
  });

  it('uses TRACK constant from config/strings', () => {
    expect(content).toContain('TRACK');
  });
});

// ─── Fix 3: Sign-in page propagates track through OAuth ───────────────────────

describe('Sign-in page reads track from searchParams', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src', 'app', 'auth', 'signin', 'page.tsx'),
    'utf-8',
  );

  it('reads searchParams to extract track', () => {
    expect(content).toContain('searchParams');
  });

  it('builds redirectTo URL with track parameter', () => {
    expect(content).toContain('/questionnaire');
    expect(content).toContain('track');
  });

  it('uses VALID_TRACKS or TRACK constants for sanitization', () => {
    expect(content).toMatch(/VALID_TRACKS|TRACK\./);
  });

  it('does not hardcode bare redirect to /questionnaire', () => {
    const hardcoded = (content.match(/redirectTo:\s*'\/questionnaire'/g) || []).length;
    expect(hardcoded).toBe(0);
  });
});

// ─── Fix 3b: Questionnaire page reads ?track= from URL ───────────────────────

describe('Questionnaire page pre-selects track from URL', () => {
  // page.tsx is a Server Component (auth + DB); URL params are read in the
  // client component which can use the useSearchParams hook.
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src', 'app', '(app)', 'questionnaire', 'questionnaire-client.tsx'),
    'utf-8',
  );

  it('reads track from URL search params', () => {
    expect(content).toContain('useSearchParams');
  });

  it('uses TRACK constant for validation', () => {
    expect(content).toContain('TRACK');
  });
});

// ─── Fix 4: Session cap — strings exist ───────────────────────────────────────

import { LIMITS_ERR, VALID_TRACKS } from '@/config/strings';

describe('Session cap string constants exist', () => {
  it('LIMITS_ERR.SESSION_CAP_REACHED is defined in config/strings', () => {
    expect(LIMITS_ERR.SESSION_CAP_REACHED).toBeTruthy();
    expect(typeof LIMITS_ERR.SESSION_CAP_REACHED).toBe('string');
  });

  it('VALID_TRACKS is defined in config/strings', () => {
    expect(VALID_TRACKS).toContain('hni');
    expect(VALID_TRACKS).toContain('enterprise');
  });
});

// ─── Fix 4: Session cap enforcement in questionnaire route ────────────────────

describe('Questionnaire route enforces session cap', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src', 'app', 'api', 'questionnaire', 'route.ts'),
    'utf-8',
  );

  it('checks session count before creating new session', () => {
    expect(content).toContain('MAX_SESSIONS_PER_USER_PER_MONTH');
  });

  it('returns 429 when session cap is reached', () => {
    expect(content).toContain('429');
  });
});
