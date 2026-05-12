/**
 * Admin LinkedIn post draft endpoint.
 * v1: generates placeholder draft. Production: Gemini 2.5 Pro.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const articleUrl = body.article_url || '';

  const draft = [
    '🔒 Security Insight from Raivan Global\n',
    'Our latest threat intelligence analysis reveals important trends',
    'in physical security that every enterprise should consider.\n',
    `Source: ${articleUrl}\n`,
    '#PhysicalSecurity #SecurityAudit #RaivanGlobal #ESRM',
  ].join('\n');

  return NextResponse.json({ draft, generated_at: new Date().toISOString() });
}
