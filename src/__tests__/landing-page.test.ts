/**
 * Phase 4 — Landing page and trust stack components.
 * Verifies modules export valid functions and landing page integrates them.
 */

import fs from 'fs';
import path from 'path';
import * as HeroSectionModule from '@/components/landing/HeroSection';
import * as TrustSignalsModule from '@/components/landing/TrustSignals';
import * as HowItWorksModule from '@/components/landing/HowItWorks';
import * as LandingPageModule from '@/app/page';
import { LANDING, LANDING_STEPS } from '@/config/strings';

const read = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), 'utf-8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('Trust stack components export correctly', () => {
  it('HeroSection is a named export function', () => {
    expect(typeof HeroSectionModule.HeroSection).toBe('function');
  });

  it('TrustSignals is a named export function', () => {
    expect(typeof TrustSignalsModule.TrustSignals).toBe('function');
  });

  it('HowItWorks is a named export function', () => {
    expect(typeof HowItWorksModule.HowItWorks).toBe('function');
  });
});

describe('Landing page integrates trust stack components', () => {
  it('page.tsx imports HeroSection, TrustSignals, HowItWorks', () => {
    const content = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'page.tsx'), 'utf-8');
    expect(content).toContain('HeroSection');
    expect(content).toContain('TrustSignals');
    expect(content).toContain('HowItWorks');
  });

  it('landing page exports a default function', () => {
    expect(typeof LandingPageModule.default).toBe('function');
  });
});

describe('LANDING SSOT strings (Phase 3)', () => {
  it('all LANDING values are non-empty strings', () => {
    Object.values(LANDING).forEach((val) => {
      expect(typeof val).toBe('string');
      expect(val.trim().length).toBeGreaterThan(0);
    });
  });

  it('LANDING_STEPS has four steps, each with a title and description', () => {
    expect(LANDING_STEPS).toHaveLength(4);
    LANDING_STEPS.forEach((s) => {
      expect(s.step.trim().length).toBeGreaterThan(0);
      expect(s.title.trim().length).toBeGreaterThan(0);
      expect(s.description.trim().length).toBeGreaterThan(0);
    });
  });
});

describe('Landing sections source from SSOT (no hardcoded copy)', () => {
  it('HeroSection uses LANDING.HERO_FREE_SUMMARY, not hardcoded copy', () => {
    const src = stripComments(read('src', 'components', 'landing', 'HeroSection.tsx'));
    expect(src).toContain('LANDING.HERO_FREE_SUMMARY');
    expect(src).not.toContain('Free executive summary');
  });

  it('HowItWorks renders LANDING_STEPS, not an inline STEPS array', () => {
    const src = stripComments(read('src', 'components', 'landing', 'HowItWorks.tsx'));
    expect(src).toContain('LANDING_STEPS');
    expect(src).toContain('LANDING.HOW_IT_WORKS_TITLE');
    expect(src).not.toContain('How It Works<');
    expect(src).not.toContain('const STEPS');
  });

  it('TrustSignals sources headings + signal titles from LANDING', () => {
    const src = stripComments(read('src', 'components', 'landing', 'TrustSignals.tsx'));
    expect(src).toContain('LANDING.TRUST_TITLE');
    expect(src).toContain('LANDING.CPP_DOMAINS_TITLE');
    expect(src).not.toContain('Built on Trust');
    expect(src).not.toContain('Grounded in 7 CPP Security Domains');
    expect(src).not.toContain("'End-to-End Encryption'");
  });
});
