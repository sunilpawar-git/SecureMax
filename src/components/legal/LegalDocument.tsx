import Link from 'next/link';
import { APP } from '@/config/strings';
import type { LegalDoc } from '@/config/legal-strings';

/**
 * Presentational renderer for a legal document (Privacy / Terms).
 * Public, server-rendered, content sourced from the legal-strings SSOT.
 */
export function LegalDocument({ doc }: { doc: LegalDoc }) {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6">
      <article className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-2">
          <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            {APP.NAME}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{doc.TITLE}</h1>
          <p className="text-xs text-slate-400">{doc.UPDATED}</p>
          <p className="text-sm text-slate-600 leading-relaxed">{doc.INTRO}</p>
        </header>

        <div className="space-y-6">
          {doc.SECTIONS.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900">{section.heading}</h2>
              {section.body.map((paragraph, i) => (
                <p key={i} className="text-sm text-slate-600 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
