'use client';

/**
 * Admin newsletter review page — thin orchestrator over useNewsletterData
 * (MVVM). Weekly drafts arrive via cron; Generate Now creates one on demand.
 */

import { useNewsletterData } from './_hooks/useNewsletterData';
import { NewsletterCard } from './_components/NewsletterCard';
import { NEWSLETTER_STRINGS } from '@/config/admin-strings';
import { UI } from '@/config/strings';

export default function NewsletterPage() {
  const data = useNewsletterData();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {NEWSLETTER_STRINGS.PAGE_TITLE}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {NEWSLETTER_STRINGS.PAGE_DESCRIPTION}
          </p>
        </div>
        <button
          onClick={() => {
            void data.generateNow();
          }}
          disabled={data.generating}
          className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-50 shrink-0"
        >
          {data.generating ? NEWSLETTER_STRINGS.GENERATING : NEWSLETTER_STRINGS.GENERATE_CTA}
        </button>
      </div>

      {data.notice && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{data.notice}</p>
      )}
      {data.error && <p className="text-sm text-red-600 dark:text-red-400">{data.error}</p>}

      {data.loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{UI.LOADING}</p>
      ) : data.newsletters.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          {NEWSLETTER_STRINGS.EMPTY_STATE}
        </p>
      ) : (
        <div className="space-y-4">
          {data.newsletters.map((n) => (
            <NewsletterCard
              key={n.id}
              newsletter={n}
              configured={data.configured}
              onDelete={(id) => {
                void data.remove(id);
              }}
              onPublished={data.refresh}
              onCopyWhatsApp={data.copyWhatsApp}
              onFetchEmail={data.fetchEmailHtml}
            />
          ))}
        </div>
      )}
    </div>
  );
}
