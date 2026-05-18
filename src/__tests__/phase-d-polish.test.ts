/**
 * Phase D — Polish and Consistency fixes.
 * TDD: Tests verify fixes are in place.
 */

import fs from 'fs';
import path from 'path';
import { EnterpriseProposalSchema } from '@/lib/payment/schemas';

describe('M-7: Landing CTAs include track query params', () => {
  it('HNI CTA links to /auth/signin?track=hni', () => {
    const content = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'page.tsx'), 'utf-8');
    expect(content).toContain('track=hni');
    expect(content).toContain('track=enterprise');
  });
});

describe('M-12: Dashboard in-progress links include session and track', () => {
  it('resume link includes ?session= and &track= params', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', '(app)', 'dashboard', 'page.tsx'),
      'utf-8',
    );
    expect(content).toContain('?session=');
    expect(content).toContain('&track=');
  });
});

describe('L-1: Payment page does not pass empty onFailure callback', () => {
  it('no empty arrow function for onFailure', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', '(app)', 'payment', '[sessionId]', 'page.tsx'),
      'utf-8',
    );
    expect(content).not.toContain('onFailure: () => {}');
  });
});

describe('L-2: Footer year element has suppressHydrationWarning', () => {
  it('landing page footer uses suppressHydrationWarning', () => {
    const content = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'page.tsx'), 'utf-8');
    expect(content).toContain('suppressHydrationWarning');
  });
});

describe('L-3: .env.example includes scraper/LinkedIn vars', () => {
  it('contains NEWS_API_KEY and LINKEDIN_ACCESS_TOKEN', () => {
    const content = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf-8');
    expect(content).toContain('NEWS_API_KEY');
    expect(content).toContain('LINKEDIN_ACCESS_TOKEN');
  });
});

describe('L-4: No unsafe `as string` cast for params.sessionId', () => {
  const pagePaths = [
    path.join(process.cwd(), 'src', 'app', '(app)', 'payment', '[sessionId]', 'page.tsx'),
    path.join(process.cwd(), 'src', 'app', '(app)', 'report', '[sessionId]', 'status', 'page.tsx'),
    path.join(
      process.cwd(),
      'src',
      'app',
      '(app)',
      'report',
      '[sessionId]',
      'download',
      'page.tsx',
    ),
    path.join(process.cwd(), 'src', 'app', '(app)', 'report', '[sessionId]', 'summary', 'page.tsx'),
  ];

  for (const p of pagePaths) {
    const name = p.split('(app)/')[1];
    it(`${name} does not use "as string" for sessionId`, () => {
      const content = fs.readFileSync(p, 'utf-8');
      expect(content).not.toContain('params.sessionId as string');
    });
  }
});

describe('L-5: Form fields have htmlFor/id association', () => {
  it('enterprise proposal Field component uses htmlFor and id', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', '(app)', 'enterprise', 'proposal', 'page.tsx'),
      'utf-8',
    );
    expect(content).toContain('htmlFor={');
    expect(content).toContain('id={');
  });
});

describe('L-6: Zod trim before min in EnterpriseProposalSchema', () => {
  it('trims whitespace-only inputs before min(1) validation', () => {
    const result = EnterpriseProposalSchema.safeParse({
      companyName: '   ',
      contactName: 'Alice',
      contactEmail: 'alice@test.com',
      facilityCount: 1,
      reportId: 'sess_123',
    });
    expect(result.success).toBe(false);
  });
});
