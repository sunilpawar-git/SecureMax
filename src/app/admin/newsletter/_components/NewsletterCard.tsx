'use client';

/**
 * View — one newsletter in the review queue: preview image, status badge,
 * cited-article count, per-platform post results, format actions, delete.
 */

/* eslint-disable @next/next/no-img-element -- PNG bytes served by an
   admin-gated API route; next/image optimization cannot fetch it. */

import { useCallback, useRef, useState } from 'react';
import { NEWSLETTER_STRINGS } from '@/config/admin-strings';
import { NEWSLETTER_STATUS_STYLES } from '@/config/admin-colors';
import { PublishModal } from './PublishModal';
import type { NewsletterRow } from '../_hooks/useNewsletterData';

interface Props {
  newsletter: NewsletterRow;
  configured: Record<string, boolean>;
  onDelete: (id: string) => void;
  onPublished: () => void;
  onCopyWhatsApp: (id: string) => Promise<boolean>;
  onFetchEmail: (id: string) => Promise<string | null>;
}

const BTN_BASE = 'px-3 py-1 text-xs font-medium rounded';

export function NewsletterCard({
  newsletter,
  configured,
  onDelete,
  onPublished,
  onCopyWhatsApp,
  onFetchEmail,
}: Props) {
  const [showPublish, setShowPublish] = useState(false);
  const [waCopied, setWaCopied] = useState(false);
  const [emailHtml, setEmailHtml] = useState<string | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const waTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const badge = NEWSLETTER_STATUS_STYLES[newsletter.status] ?? NEWSLETTER_STATUS_STYLES.draft;

  const handleCopyWhatsApp = useCallback(async () => {
    const ok = await onCopyWhatsApp(newsletter.id);
    if (ok) {
      setWaCopied(true);
      if (waTimerRef.current) clearTimeout(waTimerRef.current);
      waTimerRef.current = setTimeout(() => setWaCopied(false), 2000);
    }
  }, [newsletter.id, onCopyWhatsApp]);

  const handlePreviewEmail = useCallback(async () => {
    const html = await onFetchEmail(newsletter.id);
    if (html) {
      setEmailHtml(html);
      setShowEmailPreview(true);
    }
  }, [newsletter.id, onFetchEmail]);

  const handleDownloadEmail = useCallback(() => {
    if (!emailHtml) return;
    const blob = new Blob([emailHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-${newsletter.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [emailHtml, newsletter.id]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex gap-4">
      {/* Thumbnail — click to open full-size in a new tab */}
      <a
        href={`/api/admin/newsletter/${newsletter.id}/image`}
        target="_blank"
        rel="noreferrer"
        title={NEWSLETTER_STRINGS.VIEW_FULL}
        className="shrink-0"
      >
        <img
          src={`/api/admin/newsletter/${newsletter.id}/image`}
          alt={NEWSLETTER_STRINGS.PREVIEW_ALT}
          className="w-40 rounded border border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity cursor-zoom-in"
        />
      </a>
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
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowPublish(true)}
            className={`${BTN_BASE} bg-blue-600 text-white hover:bg-blue-700`}
          >
            {NEWSLETTER_STRINGS.PUBLISH_CTA}
          </button>
          <button
            onClick={() => {
              void handleCopyWhatsApp();
            }}
            className={`${BTN_BASE} ${waCopied ? 'bg-emerald-600' : 'bg-teal-600'} text-white hover:opacity-90`}
          >
            {waCopied ? NEWSLETTER_STRINGS.COPIED : NEWSLETTER_STRINGS.COPY_WHATSAPP}
          </button>
          <button
            onClick={() => {
              void handlePreviewEmail();
            }}
            className={`${BTN_BASE} bg-indigo-600 text-white hover:bg-indigo-700`}
          >
            {NEWSLETTER_STRINGS.PREVIEW_EMAIL}
          </button>
          <a
            href={`/api/admin/newsletter/${newsletter.id}/image`}
            download={`newsletter-${newsletter.id}.png`}
            className={`${BTN_BASE} bg-slate-600 text-white hover:bg-slate-700`}
          >
            {NEWSLETTER_STRINGS.DOWNLOAD}
          </a>
          <button
            onClick={() => {
              if (window.confirm(NEWSLETTER_STRINGS.DELETE_CONFIRM)) onDelete(newsletter.id);
            }}
            className={`${BTN_BASE} bg-red-600 text-white hover:bg-red-700`}
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

      {showEmailPreview && emailHtml && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEmailPreview(false);
          }}
          role="presentation"
        >
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {NEWSLETTER_STRINGS.PREVIEW_EMAIL}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadEmail}
                  className={`${BTN_BASE} bg-slate-600 text-white hover:bg-slate-700`}
                >
                  {NEWSLETTER_STRINGS.DOWNLOAD_EMAIL}
                </button>
                <button
                  onClick={() => setShowEmailPreview(false)}
                  className={`${BTN_BASE} text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100`}
                >
                  {NEWSLETTER_STRINGS.CLOSE}
                </button>
              </div>
            </div>
            <iframe
              srcDoc={emailHtml}
              sandbox=""
              title="Email preview"
              className="flex-1 w-full border-0 rounded-b-lg bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
