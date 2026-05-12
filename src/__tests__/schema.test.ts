/**
 * Phase 1 tests — verify Prisma schema integrity against plan spec.
 * Tests parse the schema file directly to confirm table structure.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf-8');

function getModelBlock(modelName: string): string {
  const regex = new RegExp(`model ${modelName} \\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = schema.match(regex);
  return match ? match[1] : '';
}

function hasField(model: string, field: string): boolean {
  return getModelBlock(model).includes(field);
}

describe('Schema — required models exist', () => {
  const requiredModels = [
    'User',
    'Account',
    'Session',
    'AuditSession',
    'SessionEvent',
    'QuestionNode',
    'CppChunk',
    'ThreatIntel',
    'LinkedinPost',
    'ReportArtifact',
    'EnterpriseLead',
  ];

  requiredModels.forEach((model) => {
    it(`model ${model} exists`, () => {
      expect(schema).toContain(`model ${model}`);
    });
  });
});

describe('Schema — User model', () => {
  it('has email as unique', () => {
    expect(getModelBlock('User')).toContain('@unique');
    expect(hasField('User', 'email')).toBe(true);
  });

  it('has role with default user', () => {
    expect(getModelBlock('User')).toContain('@default("user")');
  });

  it('has track with default hni', () => {
    expect(getModelBlock('User')).toContain('@default("hni")');
  });

  it('has white-label fields', () => {
    expect(hasField('User', 'orgName')).toBe(true);
    expect(hasField('User', 'logoUrl')).toBe(true);
  });

  it('has DPDPA consent timestamp', () => {
    expect(hasField('User', 'consentAt')).toBe(true);
  });

  it('supports soft-delete via anonymisation', () => {
    expect(hasField('User', 'anonymisedAt')).toBe(true);
  });
});

describe('Schema — AuditSession model', () => {
  it('has dual-track support', () => {
    expect(hasField('AuditSession', 'track')).toBe(true);
    expect(hasField('AuditSession', 'propertyType')).toBe(true);
    expect(hasField('AuditSession', 'facilityType')).toBe(true);
  });

  it('has graph cursor', () => {
    expect(hasField('AuditSession', 'currentNodeId')).toBe(true);
  });

  it('has domain and module scores', () => {
    expect(hasField('AuditSession', 'domainScores')).toBe(true);
    expect(hasField('AuditSession', 'moduleScores')).toBe(true);
  });

  it('has payment tracking', () => {
    expect(hasField('AuditSession', 'paid')).toBe(true);
    expect(hasField('AuditSession', 'razorpayOrderId')).toBe(true);
  });

  it('has enterprise NDA and report unlock', () => {
    expect(hasField('AuditSession', 'ndaAcceptedAt')).toBe(true);
    expect(hasField('AuditSession', 'enterpriseReportUnlocked')).toBe(true);
  });

  it('has report immutability guard', () => {
    expect(hasField('AuditSession', 'downloadedAt')).toBe(true);
  });

  it('has follow-up tracking', () => {
    expect(hasField('AuditSession', 'postDownloadFollowupAt')).toBe(true);
  });
});

describe('Schema — SessionEvent model', () => {
  it('has encrypted answer field', () => {
    expect(hasField('SessionEvent', 'answerEncrypted')).toBe(true);
  });

  it('has encrypted AI reasoning', () => {
    expect(hasField('SessionEvent', 'aiReasoningEncrypted')).toBe(true);
  });

  it('has idempotency constraint on (session, question)', () => {
    expect(getModelBlock('SessionEvent')).toContain('@@unique([sessionId, questionNodeId])');
  });

  it('has CPP citations and compliance tags', () => {
    expect(hasField('SessionEvent', 'cppCitations')).toBe(true);
    expect(hasField('SessionEvent', 'complianceTags')).toBe(true);
  });

  it('has score deltas for radar chart', () => {
    expect(hasField('SessionEvent', 'domainScoreDelta')).toBe(true);
    expect(hasField('SessionEvent', 'moduleScoreDelta')).toBe(true);
  });

  it('supports soft-delete via anonymisation', () => {
    expect(hasField('SessionEvent', 'anonymisedAt')).toBe(true);
  });
});

describe('Schema — QuestionNode model', () => {
  it('has track field for dual-track support', () => {
    expect(hasField('QuestionNode', 'track')).toBe(true);
    expect(getModelBlock('QuestionNode')).toContain('@default("both")');
  });

  it('has module tag for enterprise modules', () => {
    expect(hasField('QuestionNode', 'moduleTag')).toBe(true);
  });

  it('has version for SSOT seed updates', () => {
    expect(hasField('QuestionNode', 'version')).toBe(true);
  });

  it('has terminal flag for graph completion', () => {
    expect(hasField('QuestionNode', 'isTerminal')).toBe(true);
  });
});

describe('Schema — CppChunk model', () => {
  it('has vector(768) embedding for Gemini text-embedding-004', () => {
    expect(getModelBlock('CppChunk')).toContain('vector(768)');
  });

  it('has content hash for idempotent seeding', () => {
    expect(hasField('CppChunk', 'contentHash')).toBe(true);
    expect(getModelBlock('CppChunk')).toContain('@unique');
  });
});

describe('Schema — ThreatIntel model', () => {
  it('has URL unique constraint', () => {
    const block = getModelBlock('ThreatIntel');
    expect(block).toContain('url');
    expect(block).toContain('@unique');
  });

  it('has content hash for dedup', () => {
    expect(hasField('ThreatIntel', 'contentHash')).toBe(true);
  });

  it('has domain and industry tags', () => {
    expect(hasField('ThreatIntel', 'domainTags')).toBe(true);
    expect(hasField('ThreatIntel', 'industryTags')).toBe(true);
  });

  it('supports soft delete', () => {
    expect(hasField('ThreatIntel', 'softDeleted')).toBe(true);
  });
});

describe('Schema — ReportArtifact model', () => {
  it('has encrypted PDF storage', () => {
    expect(hasField('ReportArtifact', 'pdfEncrypted')).toBe(true);
  });

  it('has audit urgency score', () => {
    expect(hasField('ReportArtifact', 'auditUrgencyScore')).toBe(true);
  });

  it('has peer benchmark percentile', () => {
    expect(hasField('ReportArtifact', 'peerBenchmarkPctile')).toBe(true);
  });

  it('has compliance gap count for enterprise', () => {
    expect(hasField('ReportArtifact', 'complianceGapCount')).toBe(true);
  });
});

describe('Schema — EnterpriseLead model', () => {
  it('has all CRM fields', () => {
    expect(hasField('EnterpriseLead', 'name')).toBe(true);
    expect(hasField('EnterpriseLead', 'company')).toBe(true);
    expect(hasField('EnterpriseLead', 'facilitiesCount')).toBe(true);
    expect(hasField('EnterpriseLead', 'preferredContact')).toBe(true);
    expect(hasField('EnterpriseLead', 'sourceSessionId')).toBe(true);
  });

  it('has status with default new', () => {
    expect(getModelBlock('EnterpriseLead')).toContain('@default("new")');
  });
});

describe('Schema — security constraints', () => {
  it('uses pgvector extension', () => {
    expect(schema).toContain('pgvector');
  });

  it('session events are column-level encrypted', () => {
    const block = getModelBlock('SessionEvent');
    expect(block).toContain('answer_encrypted');
    expect(block).toContain('ai_reasoning_encrypted');
  });

  it('report PDF is stored as encrypted bytes', () => {
    expect(hasField('ReportArtifact', 'pdfEncrypted')).toBe(true);
    expect(getModelBlock('ReportArtifact')).toContain('Bytes');
  });

  it('no plaintext PII fields in session events', () => {
    const block = getModelBlock('SessionEvent');
    expect(block).not.toMatch(/\banswer\b\s+String/);
    expect(block).not.toMatch(/\baiReasoning\b\s+String/);
  });
});
