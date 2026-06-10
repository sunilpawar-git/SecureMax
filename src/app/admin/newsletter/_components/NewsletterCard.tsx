'use client';

/**
 * View — one newsletter in the review queue: preview image, status badge,
 * cited-article count, per-platform post results, delete action.
 */

/* eslint-disable @next/next/no-img-element -- PNG bytes served by an
   admin-gated API route; next/image optimization cannot fetch it. */

import { useState } from 'react';
import { NEWSLETTER_STRINGS } from '@/config/admin-strings';
import { NEWSLETTER_STATUS_STYLES } from '@/config/admin-colors';
import { PublishModal } from './PublishModal';
import type { NewsletterRow } from '../_hooks/useNewsletterData';

interface Props {
  newsletter: NewsletterRow;
  configured: Record<string, boolean>;
  onDelete: (id: string) => void;
  onPublished: () => void;
}

export function NewsletterCard({ newsletter, configured, onDelete, onPublished }: Props) {
  const [showPublish, setShowPublish] = useState(false);
  const badge =
    NEWSLETTER_STATUS_STYLES[newsletter.status] ?? NEWSLETTER_STATUS_STYLES.draft;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex gap-4">
      <img
        src={`/api/admin/newsletter/${newsletter.id}/image`}
        alt={NEWSLETTER_STRINGS.PREVIEW_ALT}
        className="w-40 rounded border border-slate-200 dark:border-slate-700 self-start"
      />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
            {newsletter.title}
          </h3>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge}`}>
            {NEWSLETTER_STRINGS.STATUS_LABEL[newsletter.status] ?? newsletter.status}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(newsletter.createdAt).toLocaleString()} · {newsletter.articleIds.length}{' '}
          {NEWSLETTER_STRINGS.ARTICLES_CITED}
        </p>
        {newsletter.posts.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {newsletter.posts.map((p) => (
              <span
                key={p.platform}
                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded"
              >
                {p.platform}: {p.status}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setShowPublish(true)}
            className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {NEWSLETTER_STRINGS.PUBLISH_CTA}
          </button>
          <button
            onClick={() => {
              if (window.confirm(NEWSLETTER_STRINGS.DELETE_CONFIRM)) onDelete(newsletter.id);
            }}
            className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700"
          >
            {NEWSLETTER_STRINGS.DELETE_CTA}
          </button>
        </div>
      </div>
      {showPublish && (
        <PublishModal
          newsletter={newsletter}
          configured={configured}
          onClose={() => setShowPublish(false)}
          onPublished={onPublished}
        />
      )}
    </div>
  );
}
