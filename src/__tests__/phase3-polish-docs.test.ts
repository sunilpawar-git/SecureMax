/**
 * Phase 3 — Polish, CLAUDE.md, Sources Config, DPDPA Consent Version.
 * TDD: Tests assert implementation correctness.
 */

import fs from 'fs';
import path from 'path';
import { DPDPA, VALID_TRACKS } from '@/config/strings';

// ─── 3.1: CLAUDE.md auth policy updated ───────────────────────────────────────

describe('CLAUDE.md documents both auth providers', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'CLAUDE.md'),
    'utf-8',
  );

  it('mentions Google OAuth', () => {
    expect(content).toContain('Google OAuth');
  });

  it('mentions Microsoft Entra ID', () => {
    expect(content).toContain('Microsoft Entra ID');
  });

  it('still prohibits custom password auth', () => {
    expect(content).toContain('no custom password auth');
  });
});

// ─── 3.3: DPDPA consent version tracking ─────────────────────────────────────

describe('DPDPA consent version constants exist', () => {
  it('DPDPA.CONSENT_VERSION is defined', () => {
    expect(DPDPA.CONSENT_VERSION).toBeTruthy();
    expect(typeof DPDPA.CONSENT_VERSION).toBe('string');
  });

  it('DPDPA.CONSENT_PURPOSE is defined', () => {
    expect(DPDPA.CONSENT_PURPOSE).toBeTruthy();
    expect(typeof DPDPA.CONSENT_PURPOSE).toBe('string');
  });
});

describe('Consent API writes version and purpose', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src', 'app', 'api', 'consent', 'route.ts'),
    'utf-8',
  );

  it('imports DPDPA from config/strings', () => {
    expect(content).toContain('DPDPA');
  });

  it('writes consentVersion field', () => {
    expect(content).toContain('consentVersion');
  });

  it('writes consentPurpose field', () => {
    expect(content).toContain('consentPurpose');
  });
});

describe('Consent page displays purpose text', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src', 'app', '(app)', 'onboarding', 'consent', 'page.tsx'),
    'utf-8',
  );

  it('imports DPDPA constants', () => {
    expect(content).toContain('DPDPA');
  });

  it('displays consent description and version', () => {
    expect(content).toContain('DPDPA.CONSENT_DESCRIPTION');
    expect(content).toContain('DPDPA.CONSENT_VERSION');
  });
});

// ─── 3.3b: Prisma schema has consent version fields ──────────────────────────

describe('Prisma schema includes consent version fields', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'prisma', 'schema.prisma'),
    'utf-8',
  );

  it('User model has consentVersion field', () => {
    expect(content).toContain('consentVersion');
  });

  it('User model has consentPurpose field', () => {
    expect(content).toContain('consentPurpose');
  });
});

// ─── 3.4: Dashboard "Start New Assessment" — verify existing ─────────────────

describe('Dashboard page is a valid module', () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), 'src', 'app', '(app)', 'dashboard', 'page.tsx'),
    'utf-8',
  );

  it('exports a default function', () => {
    expect(content).toMatch(/export\s+default\s+(async\s+)?function/);
  });
});
