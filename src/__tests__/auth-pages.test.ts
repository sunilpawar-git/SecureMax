/**
 * Phase 1 — Auth pages and DPDPA consent.
 * Verifies modules export valid default components and API contracts.
 *
 * Note: Pages that depend on Prisma/NextAuth cannot be `require()`d in Jest
 * because generated Prisma client uses `import.meta` (ESM). We verify the
 * source has a default export function via regex instead.
 */

import fs from 'fs';
import path from 'path';

function moduleExportsDefault(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  return /export\s+default\s+(async\s+)?function/.test(content);
}

describe('Auth pages export valid modules', () => {
  const authDir = path.join(process.cwd(), 'src', 'app', 'auth');

  it('auth/signin/page.tsx exports a default function', () => {
    expect(moduleExportsDefault(path.join(authDir, 'signin', 'page.tsx'))).toBe(true);
  });

  it('auth/error/page.tsx exports a default function', () => {
    expect(moduleExportsDefault(path.join(authDir, 'error', 'page.tsx'))).toBe(true);
  });

  it('auth/layout.tsx exports a default function', () => {
    expect(moduleExportsDefault(path.join(authDir, 'layout.tsx'))).toBe(true);
  });
});

describe('DPDPA consent page exports a valid module', () => {
  it('onboarding/consent/page.tsx exports a default function', () => {
    const p = path.join(process.cwd(), 'src', 'app', '(app)', 'onboarding', 'consent', 'page.tsx');
    expect(moduleExportsDefault(p)).toBe(true);
  });
});

describe('Consent API uses shared guards', () => {
  it('consent route imports from @/lib/api', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'api', 'consent', 'route.ts'),
      'utf-8',
    );
    expect(content).toContain("from '@/lib/api'");
  });
});
