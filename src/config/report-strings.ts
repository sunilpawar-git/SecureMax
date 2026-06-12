/**
 * SSOT for report-viewer user-facing strings (status / summary / download web
 * pages, FindingCard, FreeSummaryView). Split out of strings.ts to keep that
 * file under the 300-line gate, following the admin-strings / legal-strings
 * precedent. Re-exported from strings.ts so the `@/config/strings` import path
 * stays stable for every consumer.
 */

export const REPORT_STRINGS = {
  RISK_HIGH: 'HIGH RISK',
  RISK_MODERATE: 'MODERATE RISK',
  RISK_LOW: 'LOW RISK',
  POSTURE_SCORE_LABEL: 'Physical Security Posture Score',

  // Finding card (client-side redaction for unpaid reports)
  REDACTED_PLACEHOLDER: '[Unlock full report to view]',
  LOCKED_BANNER_TEXT: 'Unlock full report to see details',

  // Free summary view
  COMPLIANCE_GAPS_DETECTED: 'ISO 27001 / PSARA compliance gaps detected',
  FINDINGS_HEADING: 'Findings',

  // Summary page
  SECURITY_ASSESSMENT: 'Security Assessment',
  FREE_EXEC_SUMMARY: 'Free Executive Summary',
  SUMMARY_LOADING: 'Loading your report summary...',
  SUMMARY_LOAD_ERROR: 'Failed to load summary',
  UNLOCK_ENTERPRISE_TITLE: 'Unlock Full Enterprise Report',
  UNLOCK_ENTERPRISE_DESC:
    'Includes compliance mapping, board-level risk language, and remediation roadmap.',
  UNLOCK_FULL_REPORT: 'Unlock Full Report',
  UNLOCK_FULL_REPORT_DESC: 'Get detailed findings, action roadmap, and threat intelligence.',
  // Conversion nudge — price is appended at render from PAYMENT.AMOUNT_PAISE (SSOT)
  UNLOCK_NUDGE_PREFIX: 'Your full report is ready — unlock for ',

  // Status page
  GENERATION_TIMEOUT: 'Report generation timed out. Please contact support.',
  STATUS_CHECK_FAILED: 'Failed to check status',
  GENERATING: 'Generating your security audit report...',
  GENERATING_HINT: "This usually takes 30-60 seconds. You'll be redirected automatically.",

  // Download page
  ACCESS_VERIFY_FAILED: 'Could not verify report access',
  REPORT_NOT_READY: 'Report is not ready yet.',
  DOWNLOAD_FAILED: 'Download failed',
  UNEXPECTED_RESPONSE: 'Unexpected response from server. Please retry.',
  INVALID_PDF: 'Received an invalid PDF file. Please contact support.',
  DOWNLOAD_FAILED_RETRY: 'Download failed. Please try again.',
  VERIFYING_ACCESS: 'Verifying report access...',
  REPORT_READY: 'Your report is ready.',
  REPORT_FORMAT_LEGEND: 'Report Format',
  FORMAT_EXECUTIVE: 'Executive Brief (1 page)',
  FORMAT_TECHNICAL: 'Technical Annex (full detail)',
  FORMAT_COMPLETE: 'Complete Report',
  DOWNLOAD_PDF: 'Download PDF Report',
  DOWNLOADING: 'Downloading your report...',
  PAYMENT_REQUIRED: 'Payment required to access the full report.',
  PENDING_APPROVAL:
    'Your enterprise report is pending approval. Our team will unlock it after your proposal is processed.',
  PENDING_APPROVAL_HINT: 'You will be notified when the report is ready for download.',

  // Shared
  NETWORK_ERROR: 'Network error. Please try again.',
  RETRY: 'Retry',
} as const;
