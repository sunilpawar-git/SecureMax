/**
 * Phase 2 — Privacy Policy & Terms (#1).
 * TDD: written BEFORE the legal content + pages exist.
 */

import fs from 'fs';
import path from 'path';
import { LEGAL, LEGAL_LINKS } from '@/config/legal-strings';

const root = process.cwd();

describe('Legal content SSOT', () => {
  it('defines Privacy and Terms documents with sections', () => {
    expect(LEGAL.PRIVACY.TITLE).toBeTruthy();
    expect(LEGAL.PRIVACY.SECTIONS.length).toBeGreaterThan(0);
    expect(LEGAL.TERMS.TITLE).toBeTruthy();
    expect(LEGAL.TERMS.SECTIONS.length).toBeGreaterThan(0);
  });

  it('privacy policy covers DPDPA rights and encryption', () => {
    const text = JSON.stringify(LEGAL.PRIVACY).toLowerCase();
    expect(text).toContain('erasure');
    expect(text).toContain('aes-256');
  });
});

describe('Legal route files', () => {
  it('privacy and terms page files exist', () => {
    expect(fs.existsSync(path.join(root, 'src', 'app', 'privacy', 'page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src', 'app', 'terms', 'page.tsx'))).toBe(true);
  });
});

describe('Legal links are reachable', () => {
  it('link hrefs resolve to the legal routes', () => {
    expect(LEGAL_LINKS.PRIVACY.href).toBe('/privacy');
    expect(LEGAL_LINKS.TERMS.href).toBe('/terms');
  });

  it('landing footer wires both legal links from the SSOT', () => {
    const content = fs.readFileSync(path.join(root, 'src', 'app', 'page.tsx'), 'utf-8');
    expect(content).toContain('LEGAL_LINKS.PRIVACY');
    expect(content).toContain('LEGAL_LINKS.TERMS');
  });

  it('consent page wires the privacy link from the SSOT', () => {
    const content = fs.readFileSync(
      path.join(root, 'src', 'app', '(app)', 'onboarding', 'consent', 'page.tsx'),
      'utf-8',
    );
    expect(content).toContain('LEGAL_LINKS.PRIVACY');
  });
});
