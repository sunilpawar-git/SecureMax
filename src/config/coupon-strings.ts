/**
 * SSOT for the coupon system — admin page labels, redemption errors, limits.
 * Split out of admin-strings.ts (300-line gate), following the
 * analytics-strings precedent. Re-exported from admin-strings.ts so
 * `@/config/admin-strings` stays the import path.
 */

export const COUPON_STRINGS = {
  PAGE_TITLE: 'Coupon Codes',
  PAGE_DESCRIPTION: 'Single-use codes that unlock reports without payment (pilot clients)',
  NAV_LABEL: 'Coupons',
  COL_CODE: 'Code',
  COL_STATUS: 'Status',
  COL_NOTE: 'Note',
  COL_CREATED: 'Created',
  COL_EXPIRES: 'Expires',
  COL_REDEEMED_BY: 'Redeemed By',
  COL_ACTION: 'Action',
  STATUS_ACTIVE: 'Active',
  STATUS_REDEEMED: 'Redeemed',
  STATUS_REVOKED: 'Revoked',
  STATUS_EXPIRED: 'Expired',
  FILTER_ALL: 'All Statuses',
  CREATE_CTA: 'New Coupon',
  BULK_CTA: 'Bulk Generate',
  EXPORT_CTA: 'Export CSV',
  REVOKE_CTA: 'Revoke',
  CREATE_MODAL_TITLE: 'Create Coupon',
  BULK_MODAL_TITLE: 'Bulk Generate Coupons',
  NOTE_LABEL: 'Note (optional)',
  NOTE_PLACEHOLDER: 'e.g. For Acme Corp pilot',
  EXPIRES_LABEL: 'Expires (optional)',
  COUNT_LABEL: 'Number of codes (max 500)',
  SUBMIT_CREATE: 'Create',
  SUBMIT_BULK: 'Generate',
  SUBMITTING: 'Working…',
  CANCEL: 'Cancel',
  REVOKE_CONFIRM_TITLE: 'Revoke coupon?',
  REVOKE_CONFIRM_BODY: 'This code can no longer be redeemed. This cannot be undone.',
  EMPTY_STATE: 'No coupons yet',
  LOADING: 'Loading…',
  ERR_LOAD: 'Failed to load coupons',
  ERR_CREATE: 'Failed to create coupon',
  ERR_REVOKE: 'Failed to revoke coupon',
  NEVER_EXPIRES: 'Never',
  TOTAL_LABEL: 'coupons',
  PAGINATION_PREV: '← Previous',
  PAGINATION_NEXT: 'Next →',
  LEAD_COUPON_LABEL: 'Pilot coupon:',
} as const;

export const COUPON_ERR = {
  INVALID_OR_EXPIRED: 'Invalid or expired code',
  RATE_LIMITED: 'Too many attempts. Try again later.',
  NOT_FOUND: 'Coupon not found',
} as const;

export const COUPON_BULK_MAX = 500;
