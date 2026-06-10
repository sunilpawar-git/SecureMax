/**
 * SSOT for the admin API Keys page — labels, statuses, token-age warning.
 * Split out of admin-strings.ts (300-line gate), following the
 * analytics-strings precedent. Re-exported from admin-strings.ts so
 * `@/config/admin-strings` stays the import path.
 */

export const API_KEYS_STRINGS = {
  TITLE: 'API Keys',
  SUBTITLE: 'Manage third-party provider keys. Values are encrypted at rest and never displayed.',
  ADD_KEY: 'Add Key',
  COL_PROVIDER: 'Provider',
  COL_STATUS: 'Status',
  COL_PREVIEW: 'Key',
  COL_CREATED: 'Created',
  COL_ROTATED: 'Last Rotated',
  COL_ACTION: 'Action',
  ROTATE: 'Rotate',
  STATUS_LABEL: { active: 'Active', rotated: 'Rotated', revoked: 'Revoked' } as Record<
    string,
    string
  >,
  MASK_PREFIX: '\u2022\u2022\u2022\u2022',
  MODAL_TITLE: 'Add API key',
  PROVIDER_LABEL: 'Provider',
  KEY_LABEL: 'Key value',
  KEY_PLACEHOLDER: 'Paste the key — stored encrypted, never shown again',
  SAVE: 'Save Key',
  CANCEL: 'Cancel',
  ROTATE_TITLE: 'Rotate key',
  ROTATE_BODY: 'The current key is marked rotated and the new value becomes active immediately.',
  NEW_KEY_LABEL: 'New key value',
  CONFIRM_ROTATE: 'Confirm Rotation',
  EMPTY: 'No API keys stored yet.',
  ERR_LOAD: 'Failed to load API keys',
  ERR_SAVE: 'Failed to save key',
  LINKEDIN_EXPIRY_WARNING: 'LinkedIn token expires soon — rotate before day 60.',
} as const;

/** LinkedIn tokens live ~60 days; warn at 50 (see CLAUDE.md LinkedIn section). */
export const LINKEDIN_TOKEN_WARN_AGE_DAYS = 50;
