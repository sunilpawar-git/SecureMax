/**
 * Tests for admin Zod validation schemas.
 */

import { ADMIN_ACTION_TYPE, ADMIN_ENTITY_TYPE } from '@/config/admin-strings';
import {
  LeadStatusUpdateSchema,
  LeadEmailSchema,
  ReportRegenerateSchema,
  ThreatIntelAddSchema,
  ThreatIntelDeleteSchema,
  SessionForceCloseSchema,
  SearchQuerySchema,
  AuditLogFilterSchema,
  AdminActionSchema,
  UserFilterSchema,
} from '@/lib/admin/validators';

describe('LeadStatusUpdateSchema', () => {
  it('accepts valid input', () => {
    const result = LeadStatusUpdateSchema.safeParse({
      leadId: 'clx123',
      newStatus: 'contacted',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty leadId', () => {
    const result = LeadStatusUpdateSchema.safeParse({
      leadId: '',
      newStatus: 'contacted',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = LeadStatusUpdateSchema.safeParse({
      leadId: 'clx123',
      newStatus: 'invalid_status',
    });
    expect(result.success).toBe(false);
  });
});

describe('LeadEmailSchema', () => {
  it('accepts valid email input', () => {
    const result = LeadEmailSchema.safeParse({
      leadId: 'clx123',
      subject: 'Follow Up',
      body: 'Hello, checking in on the proposal.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty subject', () => {
    const result = LeadEmailSchema.safeParse({
      leadId: 'clx123',
      subject: '',
      body: 'Hello.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects overly long body', () => {
    const result = LeadEmailSchema.safeParse({
      leadId: 'clx123',
      subject: 'Test',
      body: 'x'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

describe('ThreatIntelAddSchema', () => {
  it('accepts valid article', () => {
    const result = ThreatIntelAddSchema.safeParse({
      title: 'Security Breach at Warehouse',
      url: 'https://example.com/article',
      summary: 'A major breach occurred affecting warehouse security systems.',
      domainTags: ['CPP-01'],
      industryTags: ['warehouse'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid URL', () => {
    const result = ThreatIntelAddSchema.safeParse({
      title: 'Test',
      url: 'not-a-url',
      summary: 'This is a test summary for validation.',
      domainTags: ['CPP-01'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid CPP domain tag', () => {
    const result = ThreatIntelAddSchema.safeParse({
      title: 'Test',
      url: 'https://example.com/article',
      summary: 'This is a test summary for validation.',
      domainTags: ['INVALID-TAG'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty domainTags', () => {
    const result = ThreatIntelAddSchema.safeParse({
      title: 'Test',
      url: 'https://example.com/article',
      summary: 'This is a test summary for validation.',
      domainTags: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('SessionForceCloseSchema', () => {
  it('accepts valid session ID', () => {
    const result = SessionForceCloseSchema.safeParse({ sessionId: 'clx456' });
    expect(result.success).toBe(true);
  });

  it('rejects empty session ID', () => {
    const result = SessionForceCloseSchema.safeParse({ sessionId: '' });
    expect(result.success).toBe(false);
  });
});

describe('SearchQuerySchema', () => {
  it('accepts valid search query', () => {
    const result = SearchQuerySchema.safeParse({ q: 'acme' });
    expect(result.success).toBe(true);
  });

  it('rejects empty query', () => {
    const result = SearchQuerySchema.safeParse({ q: '' });
    expect(result.success).toBe(false);
  });

  it('rejects overly long query', () => {
    const result = SearchQuerySchema.safeParse({ q: 'x'.repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe('AdminActionSchema', () => {
  it('accepts valid admin action', () => {
    const result = AdminActionSchema.safeParse({
      adminId: 'admin123',
      actionType: ADMIN_ACTION_TYPE.LEAD_STATUS_CHANGED,
      entityType: ADMIN_ENTITY_TYPE.LEAD,
      entityId: 'lead456',
      metadata: { oldStatus: 'new', newStatus: 'contacted' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid action type', () => {
    const result = AdminActionSchema.safeParse({
      adminId: 'admin123',
      actionType: 'nonexistent_action',
      entityType: ADMIN_ENTITY_TYPE.LEAD,
      entityId: 'lead456',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid entity type', () => {
    const result = AdminActionSchema.safeParse({
      adminId: 'admin123',
      actionType: ADMIN_ACTION_TYPE.EMAIL_SENT,
      entityType: 'nonexistent_entity',
      entityId: 'lead456',
    });
    expect(result.success).toBe(false);
  });
});

describe('ReportRegenerateSchema', () => {
  it('accepts valid session ID', () => {
    const result = ReportRegenerateSchema.safeParse({ sessionId: 'sess123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty session ID', () => {
    const result = ReportRegenerateSchema.safeParse({ sessionId: '' });
    expect(result.success).toBe(false);
  });
});

describe('AuditLogFilterSchema', () => {
  it('accepts valid date range filter', () => {
    const result = AuditLogFilterSchema.safeParse({
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T23:59:59.000Z',
      page: 1,
      limit: 50,
      format: 'json',
    });
    expect(result.success).toBe(true);
  });

  it('accepts csv format', () => {
    const result = AuditLogFilterSchema.safeParse({ format: 'csv' });
    expect(result.success).toBe(true);
  });

  it('defaults to json format', () => {
    const result = AuditLogFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.format).toBe('json');
    }
  });
});

describe('ThreatIntelDeleteSchema', () => {
  it('accepts valid article ID', () => {
    const result = ThreatIntelDeleteSchema.safeParse({ articleId: 'art123' });
    expect(result.success).toBe(true);
  });

  it('rejects empty article ID', () => {
    const result = ThreatIntelDeleteSchema.safeParse({ articleId: '' });
    expect(result.success).toBe(false);
  });
});

describe('UserFilterSchema', () => {
  it('accepts valid hni track', () => {
    const result = UserFilterSchema.safeParse({ track: 'hni' });
    expect(result.success).toBe(true);
  });

  it('accepts valid enterprise track', () => {
    const result = UserFilterSchema.safeParse({ track: 'enterprise' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown track value', () => {
    const result = UserFilterSchema.safeParse({ track: 'sme' });
    expect(result.success).toBe(false);
  });

  it('defaults page to 1 when absent', () => {
    const result = UserFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.page).toBe(1);
  });

  it('defaults limit to 50 when absent', () => {
    const result = UserFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(50);
  });

  it('rejects limit above 100 (boundary)', () => {
    const result = UserFilterSchema.safeParse({ limit: '101' });
    expect(result.success).toBe(false);
  });

  it('accepts limit of exactly 100', () => {
    const result = UserFilterSchema.safeParse({ limit: '100' });
    expect(result.success).toBe(true);
  });

  it('rejects search string exceeding 200 characters', () => {
    const result = UserFilterSchema.safeParse({ search: 'x'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('accepts search string of exactly 200 characters', () => {
    const result = UserFilterSchema.safeParse({ search: 'x'.repeat(200) });
    expect(result.success).toBe(true);
  });

  it('trims leading and trailing whitespace from search', () => {
    const result = UserFilterSchema.safeParse({ search: '  alice  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.search).toBe('alice');
  });

  it('accepts absent search (optional)', () => {
    const result = UserFilterSchema.safeParse({ page: 1, limit: 10 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.search).toBeUndefined();
  });
});
