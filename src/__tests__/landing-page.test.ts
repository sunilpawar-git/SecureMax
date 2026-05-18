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
