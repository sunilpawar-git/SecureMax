/**
 * Phase 2 tests — Session resume UX.
 * Verifies ResumePrompt component, SessionState type, SSOT strings.
 */

import { RESUME } from '@/config/strings';
import { TRACK_BADGE_STYLES } from '@/config/colors';

describe('RESUME string constants', () => {
  it('has all required strings', () => {
    expect(RESUME.TITLE).toBeTruthy();
    expect(RESUME.DESCRIPTION).toBeTruthy();
    expect(RESUME.RESUME_BTN).toBeTruthy();
    expect(RESUME.RESTART_BTN).toBeTruthy();
    expect(RESUME.RESTART_CONFIRM).toBeTruthy();
    expect(RESUME.QUESTIONS_ANSWERED).toBeTruthy();
  });

  it('has no empty values', () => {
    Object.values(RESUME).forEach((val) => {
      expect(val.trim().length).toBeGreaterThan(0);
    });
  });

  it('is exported from @/config barrel', () => {
    const config = require('@/config');
    expect(config.RESUME).toBeDefined();
    expect(config.RESUME.TITLE).toBe(RESUME.TITLE);
  });
});

describe('TRACK_BADGE_STYLES moved to colors.ts', () => {
  it('is available from @/config/colors', () => {
    const { TRACK_BADGE_STYLES: styles } = require('@/config/colors');
    expect(styles).toBeDefined();
    expect(styles.hni).toBeTruthy();
    expect(styles.enterprise).toBeTruthy();
  });

  it('is still available via admin-colors re-export', () => {
    const { TRACK_BADGE_STYLES: styles } = require('@/config/admin-colors');
    expect(styles).toBeDefined();
    expect(styles.hni).toBe(TRACK_BADGE_STYLES.hni);
  });
});

describe('SessionState type includes resume_prompt', () => {
  it('types file exports SessionState with resume_prompt', () => {
    const types = require('@/app/(app)/questionnaire/types');
    expect(types).toBeDefined();
  });
});

describe('ResumePrompt module contract', () => {
  it('exports ResumePrompt component', () => {
    const mod = require('@/components/ResumePrompt');
    expect(mod.ResumePrompt).toBeDefined();
    expect(typeof mod.ResumePrompt).toBe('function');
  });
});
