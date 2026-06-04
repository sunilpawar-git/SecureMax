/**
 * Dark mode foundation tests — Phase 1.
 * Verifies font pipeline fix and root dark shell are correctly wired.
 */

import * as fs from 'fs';
import * as path from 'path';
import { COLORS } from '@/config/colors';

const SRC_ROOT = path.resolve(__dirname, '..');

describe('Font pipeline (globals.css)', () => {
  const css = fs.readFileSync(path.join(SRC_ROOT, 'app/globals.css'), 'utf-8');

  it('wires --font-sans to --font-inter (not geist)', () => {
    expect(css).toContain('--font-sans: var(--font-inter)');
    expect(css).not.toContain('--font-geist-sans');
  });

  it('does not hardcode body font-family', () => {
    expect(css).not.toMatch(/font-family:\s*Arial/);
  });

  it('has no unused CSS variable declarations (lean globals)', () => {
    // --background and --foreground were removed as dead code (body uses Tailwind dark: classes instead)
    expect(css).not.toContain('--background');
    expect(css).not.toContain('--foreground');
    expect(css).not.toContain('--font-geist-mono');
  });
});

describe('Root layout dark shell (layout.tsx)', () => {
  const layout = fs.readFileSync(path.join(SRC_ROOT, 'app/layout.tsx'), 'utf-8');

  it('body includes font-sans class', () => {
    expect(layout).toContain('font-sans');
  });

  it('body includes dark background', () => {
    expect(layout).toContain('dark:bg-slate-900');
  });

  it('body includes dark text', () => {
    expect(layout).toContain('dark:text-slate-100');
  });

  it('still has light defaults', () => {
    expect(layout).toContain('bg-white');
    expect(layout).toContain('text-slate-900');
  });
});

describe('COLORS SSOT dark tokens', () => {
  it('dark object exists', () => {
    expect(COLORS.dark).toBeDefined();
  });

  it('has required keys', () => {
    expect(COLORS.dark.background).toBeDefined();
    expect(COLORS.dark.card).toBeDefined();
    expect(COLORS.dark.border).toBeDefined();
    expect(COLORS.dark.text).toBeDefined();
    expect(COLORS.dark.hover).toBeDefined();
  });

  it('values are valid hex colors', () => {
    Object.values(COLORS.dark).forEach((val) => {
      expect(val).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});
