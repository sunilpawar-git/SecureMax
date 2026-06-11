import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security Intelligence | Raivan Global',
  description:
    'Weekly physical security threat intelligence briefing by Raivan Global — powered by Indian Army Special Forces methodology.',
};

export const revalidate = 3600;

interface Newsletter {
  id: string;
  title: string;
  websiteHtml: string | null;
  executiveSummary: string | null;
  createdAt: Date;
}

async function getLatestNewsletter(): Promise<Newsletter | null> {
  const row = await prisma.newsletter.findFirst({
    where: { status: 'published' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      websiteHtml: true,
      executiveSummary: true,
      createdAt: true,
    },
  });
  return row;
}

export default async function IntelligencePage() {
  const newsletter = await getLatestNewsletter();

  if (!newsletter?.websiteHtml) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h1 className="text-2xl font-bold text-amber-400 mb-4">
            Security Intelligence
          </h1>
          <p className="text-slate-400">
            Our weekly intelligence briefing is being prepared. Check back soon.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div
          className="intelligence-content prose prose-invert prose-amber max-w-none"
          dangerouslySetInnerHTML={{ __html: newsletter.websiteHtml }}
        />
        <p className="mt-12 text-center text-slate-500 text-sm">
          Published{' '}
          {newsletter.createdAt.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>
    </main>
  );
}
