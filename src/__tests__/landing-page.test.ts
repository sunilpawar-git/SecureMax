/**
 * Phase 4 — Landing page and trust stack components.
 * Verifies modules export valid functions and landing page integrates them.
 */

import fs from 'fs';
import path from 'path';

describe('Trust stack components export correctly', () => {
  it('HeroSection is a named export function', () => {
    const mod = require('@/components/landing/HeroSection');
    expect(typeof mod.HeroSection).toBe('function');
  });

  it('TrustSignals is a named export function', () => {
    const mod = require('@/components/landing/TrustSignals');
    expect(typeof mod.TrustSignals).toBe('function');
  });

  it('HowItWorks is a named export function', () => {
    const mod = require('@/components/landing/HowItWorks');
    expect(typeof mod.HowItWorks).toBe('function');
  });
});

describe('Landing page integrates trust stack components', () => {
  it('page.tsx imports HeroSection, TrustSignals, HowItWorks', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'page.tsx'),
      'utf-8',
    );
    expect(content).toContain('HeroSection');
    expect(content).toContain('TrustSignals');
    expect(content).toContain('HowItWorks');
  });

  it('landing page exports a default function', () => {
    const mod = require('@/app/page');
    expect(typeof mod.default).toBe('function');
  });
});
