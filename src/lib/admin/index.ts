/**
 * Admin module barrel export.
 * All admin utilities accessible via '@/lib/admin'.
 */

export { verifyAdmin, forbiddenResponse } from './auth';
export type { AdminSession } from './auth';
export { logAdminAction, getRecentActions } from './actions';
export { sendLeadEmail } from './email';
export { getDashboardStats } from './stats-service';
export type { DashboardStats } from './stats-service';
export { getActionItems } from './action-items-service';
export type { ActionItems } from './action-items-service';
export { getLeads, updateLeadStatus, sendEmailToLead, markLeadSessionPaid } from './leads-service';
export type { LeadFilters, StatusUpdateResult, EmailSendResult } from './leads-service';
export { getReports, regenerateReport, getReportDiff, unlockReport } from './reports-service';
export type { RegenResult, UnlockResult } from './reports-service';
export { compareReports } from './diff-engine';
export type { DiffResult } from './diff-engine';
export {
  getArticles,
  addManualArticle,
  deleteArticle,
  restoreArticle,
} from './threat-intel-service';
export type {
  ThreatIntelFilters,
  AddArticleResult,
  DeleteArticleResult,
} from './threat-intel-service';
export { getSessions, forceCloseSession } from './sessions-service';
export type { SessionFilters, ForceCloseResult } from './sessions-service';
export { globalSearch } from './search-service';
export type { SearchResults } from './search-service';
export { getAuditLog } from './audit-service';
export type { AuditLogFilters, AuditLogEntry } from './audit-service';
export { maskEmail, auditLogToCsv } from './csv-export';
export { logWebhookSuccess, logWebhookFailure } from './webhook-service';
export { buildWhatsAppUrl } from './followup-links';
export { computeFollowUpStatus, getFollowUpList } from './followup-service';
export type { FollowUpItem } from './followup-service';
export {
  getRevenueSplit,
  getFunnelMetrics,
  getSessionHealthMetrics,
  getLinkedInROI,
} from './analytics-service';
export type { RevenueSplit, FunnelStage, SessionHealth, WeeklyRoiPoint } from './analytics-service';
export {
  sendNewLeadAlert,
  sendReportDownloadAlert,
  sendOverdueFollowupDigest,
  sendScraperFailureAlert,
  maybeSendDailyAlerts,
} from './alert-service';
export {
  generateCode,
  isRedeemable,
  displayStatus,
  createSingleCoupon,
  createBulkCoupons,
  createLeadCoupon,
  redeemCoupon,
  revokeCoupon,
  listCoupons,
  couponsToCsv,
} from './coupon-service';
export type { RedeemResult, CouponFilter } from './coupon-service';
export {
  LeadStatusUpdateSchema,
  LeadEmailSchema,
  ReportRegenerateSchema,
  ReportUnlockSchema,
  ThreatIntelAddSchema,
  ThreatIntelDeleteSchema,
  ThreatIntelFilterSchema,
  SessionForceCloseSchema,
  SearchQuerySchema,
  AuditLogFilterSchema,
  AdminActionSchema,
} from './validators';
