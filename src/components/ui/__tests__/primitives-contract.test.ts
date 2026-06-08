/**
 * Contract tests for the UI primitives (node env — reads source files).
 *
 * Enforces the Phase 1 SSOT rule: primitive components carry NO raw Tailwind
 * color classes — every color must originate from config/colors.ts. Also
 * verifies the style maps exist and that SEVERITY_STYLES was relocated out of
 * FindingCard into config/colors.ts.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { BUTTON_STYLES, CARD_STYLES, BADGE_STYLES, SEVERITY_STYLES } from '@/config/colors';
import { SEVERITY } from '@/config/strings';

const UI_DIR = join(__dirname, '..');

// Matches Tailwind color utilities like bg-emerald-700, text-slate-100,
// border-red-200, ring-emerald-600, text-white. Excludes non-color tokens
// (text-sm, rounded-lg, min-h-[44px], animate-spin, px-4, etc.).
const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|' +
  'teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const RAW_COLOR_CLASS = new RegExp(
  `\\b(?:bg|text|border|ring|ring-offset|from|via|to|fill|stroke|divide|outline|decoration|placeholder|accent|caret)-(?:(?:${PALETTE})-\\d{2,3}|white|black)\\b`,
);

describe('primitive files contain no raw color classes', () => {
  it.each(['Button.tsx', 'Card.tsx', 'Badge.tsx'])('%s sources colors only from config', (file) => {
    const src = readFileSync(join(UI_DIR, file), 'utf8');
    expect(src).not.toMatch(RAW_COLOR_CLASS);
  });
});

describe('SSOT style maps are defined in config/colors.ts', () => {
  it('BUTTON_STYLES has base, all variants, and all sizes', () => {
    expect(BUTTON_STYLES.base).toBeTruthy();
    expect(Object.keys(BUTTON_STYLES.variant)).toEqual(
      expect.arrayContaining(['primary', 'secondary', 'ghost', 'destructive']),
    );
    expect(Object.keys(BUTTON_STYLES.size)).toEqual(expect.arrayContaining(['sm', 'md', 'lg']));
  });

  it('CARD_STYLES and BADGE_STYLES expose their variants', () => {
    expect(Object.keys(CARD_STYLES)).toEqual(expect.arrayContaining(['default', 'flat']));
    expect(Object.keys(BADGE_STYLES)).toEqual(
      expect.arrayContaining(['emerald', 'slate', 'amber']),
    );
  });
});

describe('SEVERITY_STYLES relocated to config/colors.ts', () => {
  it('covers every severity level', () => {
    for (const level of Object.values(SEVERITY)) {
      expect(SEVERITY_STYLES[level]).toBeTruthy();
    }
  });

  it('is no longer defined locally inside FindingCard', () => {
    const findingCard = readFileSync(join(__dirname, '../../report/FindingCard.tsx'), 'utf8');
    expect(findingCard).not.toMatch(/const\s+SEVERITY_STYLES/);
    expect(findingCard).toMatch(/import\s+\{\s*SEVERITY_STYLES\s*\}\s+from\s+'@\/config\/colors'/);
  });
});
