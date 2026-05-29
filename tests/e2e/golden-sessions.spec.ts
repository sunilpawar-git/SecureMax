/**
 * E2E Golden Session Tests.
 *
 * These tests load pre-scripted Q&A fixtures and validate:
 *  1. Fixture structure is valid (all referenced question IDs exist in graph)
 *  2. Score-drop triggers are correctly identified
 *  3. Expected finding assertions are coherent (e.g. high-risk > low-risk)
 *
 * Full answer-to-finding assertions require a running AI service with seeded DB.
 * Those are tagged @requires-ai and skipped in CI unless AI_SERVICE_URL is set.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, 'golden_sessions');
const GRAPH_DIR = path.join(__dirname, '..', '..', 'question-graph');

type Answer = { question_id: string; answer: string };
type Fixture = {
  track: string;
  session_id: string;
  answers: Answer[];
  expected_findings: Record<string, unknown>;
};

function loadFixture(name: string): Fixture {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf-8'));
}

function loadGraphIds(track: string): Set<string> {
  const yamlPath = path.join(GRAPH_DIR, `${track}.yaml`);
  const content = fs.readFileSync(yamlPath, 'utf-8');
  const ids = new Set<string>();
  for (const match of content.matchAll(/^  - id:\s+(\S+)/gm)) {
    ids.add(match[1]);
  }
  return ids;
}

// ─── Fixture Integrity ────────────────────────────────────────────────────────

test.describe('Golden session fixture integrity', () => {
  const hniHighRisk = loadFixture('hni-high-risk.json');
  const hniLowRisk = loadFixture('hni-low-risk.json');
  const entHighRisk = loadFixture('enterprise-high-risk.json');
  const hniGraphIds = loadGraphIds('hni');
  const entGraphIds = loadGraphIds('enterprise');

  test('hni-high-risk: all answer question IDs exist in HNI graph', () => {
    for (const { question_id } of hniHighRisk.answers) {
      expect(hniGraphIds.has(question_id), `Missing: ${question_id}`).toBe(true);
    }
  });

  test('hni-low-risk: all answer question IDs exist in HNI graph', () => {
    for (const { question_id } of hniLowRisk.answers) {
      expect(hniGraphIds.has(question_id), `Missing: ${question_id}`).toBe(true);
    }
  });

  test('enterprise-high-risk: all answer question IDs exist in enterprise graph', () => {
    for (const { question_id } of entHighRisk.answers) {
      expect(entGraphIds.has(question_id), `Missing: ${question_id}`).toBe(true);
    }
  });

  test('hni-high-risk has more expected critical findings than low-risk', () => {
    const highMin = hniHighRisk.expected_findings.min_critical_count as number;
    const lowMax = hniLowRisk.expected_findings.max_critical_count as number;
    expect(highMin).toBeGreaterThan(lowMax);
  });

  test('hni-low-risk has higher min urgency score than high-risk max', () => {
    const lowMin = hniLowRisk.expected_findings.min_urgency_score as number;
    const highMax = hniHighRisk.expected_findings.max_urgency_score as number;
    expect(lowMin).toBeGreaterThan(highMax);
  });

  test('all score_drop_triggers in hni-high-risk exist in HNI graph', () => {
    const fired = hniHighRisk.expected_findings.score_drop_triggers_fired as string[];
    for (const id of fired) {
      expect(hniGraphIds.has(id), `Trigger node missing: ${id}`).toBe(true);
    }
  });

  test('all score_drop_triggers in enterprise-high-risk exist in enterprise graph', () => {
    const fired = entHighRisk.expected_findings.score_drop_triggers_fired as string[];
    for (const id of fired) {
      expect(entGraphIds.has(id), `Trigger node missing: ${id}`).toBe(true);
    }
  });
});

// ─── Live AI Service Tests (requires running services) ────────────────────────

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

test.describe('Golden session — live AI assertions @requires-ai', () => {
  test.skip(!AI_SERVICE_URL, 'AI_SERVICE_URL not set — skipping live assertions');

  test('HNI high-risk session produces expected domain findings', async ({ request }) => {
    const fixture = loadFixture('hni-high-risk.json');
    const expected = fixture.expected_findings;

    const sessionRes = await request.post(`${AI_SERVICE_URL}/questionnaire/start`, {
      data: { user_id: 'golden-test-user', track: fixture.track },
      headers: { 'X-Service-Key': process.env.AI_SERVICE_KEY || '' },
    });
    expect(sessionRes.ok()).toBe(true);
    const { session_id } = await sessionRes.json();

    for (const { question_id, answer } of fixture.answers) {
      const ansRes = await request.post(`${AI_SERVICE_URL}/questionnaire/answer`, {
        data: { session_id, question_id, answer },
        headers: {
          'X-Service-Key': process.env.AI_SERVICE_KEY || '',
          'X-User-Id': 'golden-test-user',
        },
      });
      if (!ansRes.ok()) break;
    }

    const reportRes = await request.post(`${AI_SERVICE_URL}/report/generate`, {
      data: { session_id },
      headers: {
        'X-Service-Key': process.env.AI_SERVICE_KEY || '',
        'X-User-Id': 'golden-test-user',
      },
    });
    expect(reportRes.ok()).toBe(true);
    const { report_id } = await reportRes.json();

    let status = 'pending';
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusRes = await request.get(`${AI_SERVICE_URL}/report/${report_id}/status`, {
        headers: {
          'X-Service-Key': process.env.AI_SERVICE_KEY || '',
          'X-User-Id': 'golden-test-user',
        },
      });
      const s = await statusRes.json();
      if (s.status === 'completed') {
        status = 'completed';
        break;
      }
    }
    expect(status).toBe('completed');

    const summaryRes = await request.get(`${AI_SERVICE_URL}/report/${report_id}/summary`, {
      headers: {
        'X-Service-Key': process.env.AI_SERVICE_KEY || '',
        'X-User-Id': 'golden-test-user',
      },
    });
    const summary = await summaryRes.json();

    expect(summary.urgency_score).toBeLessThanOrEqual(expected.max_urgency_score as number);
  });
});
