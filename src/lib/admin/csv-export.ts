/**
 * CSV export with PII masking.
 * Emails are masked: "joh***@example.com" → first 3 chars + *** + domain.
 */

import type { AuditLogEntry } from './audit-service';

const CSV_HEADERS = ['ID', 'Admin', 'Action', 'Entity Type', 'Entity ID', 'Timestamp'];

export function maskEmail(email: string | null): string {
  if (!email) return '—';
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return '***';
  const visible = email.slice(0, Math.min(3, atIndex));
  return `${visible}***${email.slice(atIndex)}`;
}

function escapeCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function auditLogToCsv(entries: AuditLogEntry[]): string {
  const header = CSV_HEADERS.join(',');
  const rows = entries.map((e) =>
    [
      escapeCell(e.id),
      escapeCell(maskEmail(e.adminEmail)),
      escapeCell(e.actionType),
      escapeCell(e.entityType),
      escapeCell(e.entityId),
      escapeCell(e.createdAt),
    ].join(','),
  );
  return [header, ...rows].join('\n');
}
