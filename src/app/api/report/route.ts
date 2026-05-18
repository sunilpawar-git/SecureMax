/**
 * Report API routes — proxies to FastAPI AI service.
 * POST /api/report?action=generate
 * GET /api/report?action=status|summary|full&report_id=X
 */

import { NextRequest } from 'next/server';
import { requireAuth, unauthorizedResponse, apiSuccess, apiError, validateCuid } from '@/lib/api';
import { aiServiceFetch, AIServiceError } from '@/lib/ai-service';
import { REDACTED_PLACEHOLDER } from '@/components/report/FindingCard';

interface ReportFinding {
  domain: string;
  domain_name: string;
  severity: string;
  question: string;
  answer: string;
  recommendation: string;
}

interface SummaryPayload {
  findings?: ReportFinding[];
  [key: string]: unknown;
}

function redactFindings(payload: SummaryPayload): SummaryPayload {
  if (!payload.findings) return payload;
  return {
    ...payload,
    findings: payload.findings.map((f) => ({
      ...f,
      answer: REDACTED_PLACEHOLDER,
      recommendation: REDACTED_PLACEHOLDER,
    })),
  };
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return unauthorizedResponse();

  const action = request.nextUrl.searchParams.get('action');

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid or missing JSON body');
  }

  try {
    if (action === 'generate') {
      const result = await aiServiceFetch('/report/generate', {
        body: { session_id: body.session_id },
        userId: session.user.id,
      });
      return apiSuccess(result);
    }
    return apiError('Invalid action');
  } catch (error) {
    if (error instanceof AIServiceError) {
      return apiError(error.message, error.statusCode);
    }
    return apiError('Internal server error', 500);
  }
}

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return unauthorizedResponse();

  const action = request.nextUrl.searchParams.get('action');
  const reportId = request.nextUrl.searchParams.get('report_id');

  if (!reportId) {
    return apiError('report_id required');
  }

  if (!validateCuid(reportId)) {
    return apiError('Invalid report_id format', 400);
  }

  try {
    switch (action) {
      case 'status': {
        const result = await aiServiceFetch(`/report/${reportId}/status`, {
          method: 'GET',
          userId: session.user.id,
        });
        return apiSuccess(result);
      }
      case 'summary': {
        const result = await aiServiceFetch<SummaryPayload>(`/report/${reportId}/summary`, {
          method: 'GET',
          userId: session.user.id,
        });
        return apiSuccess(redactFindings(result));
      }
      case 'full': {
        const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY ?? '';
        const pdfRes = await fetch(`${AI_SERVICE_URL}/report/${reportId}/full`, {
          method: 'GET',
          headers: {
            'X-Service-Key': AI_SERVICE_KEY,
            'X-User-Id': session.user.id,
          },
        });
        if (!pdfRes.ok) {
          return apiError('Failed to retrieve report', pdfRes.status);
        }
        const pdfBytes = await pdfRes.arrayBuffer();
        return new Response(pdfBytes, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="audit_report_${reportId}.pdf"`,
            'Cache-Control': 'no-store',
          },
        });
      }
      default:
        return apiError('Invalid action. Use: status, summary, full');
    }
  } catch (error) {
    if (error instanceof AIServiceError) {
      return apiError(error.message, error.statusCode);
    }
    return apiError('Internal server error', 500);
  }
}
