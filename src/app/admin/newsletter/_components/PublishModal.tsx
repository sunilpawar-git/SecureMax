'use client';

/**
 * View — publish a newsletter to selected social platforms. Unconfigured
 * platforms (missing API keys) and platforms already posted are disabled.
 * One caption is applied to every selected platform.
 */

import { useState, useEffect, useRef } from 'react';
import {
  NEWSLETTER_PLATFORMS,
  NEWSLETTER_POST_STATUS,
  NEWSLETTER_STRINGS,
} from '@/config/admin-strings';
import type { NewsletterRow } from '../_hooks/useNewsletterData';

interface PlatformResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

interface Props {
  newsletter: NewsletterRow;
  configured: Record<string, boolean>;
  onClose: () => void;
  onPublished: () => void;
}

export function PublishModal({ newsletter, configured, onClose, onPublished }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [caption, setCaption] = useState(newsletter.title);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<Record<string, PlatformResult> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const postedPlatforms = new Set(
    newsletter.posts
      .filter((p) => p.status === NEWSLETTER_POST_STATUS.POSTED)
      .map((p) => p.platform),
  );

  const toggle = (platform: string) => {
    setSelected((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform],
    );
  };

  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const captions = Object.fromEntries(selected.map((p) => [p, caption]));
      const res = await fetch(`/api/admin/newsletter/${newsletter.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: selected, captions }),
      });
      if (!res.ok) {
        setError(NEWSLETTER_STRINGS.ERR_PUBLISH);
        return;
      }
      const json = (await res.json()) as { results?: Record<string, PlatformResult> };
      setResults(json.results ?? {});
      setSelected([]);
      const anySuccess = Object.values(json.results ?? {}).some((r) => r.success);
      if (anySuccess) onPublished();
    } catch {
      setError(NEWSLETTER_STRINGS.ERR_PUBLISH);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-modal-title"
        tabIndex={-1}
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 outline-none"
      >
        <h2 id="publish-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {NEWSLETTER_STRINGS.PUBLISH_MODAL_TITLE}
        </h2>

        <div className="space-y-2">
          {NEWSLETTER_PLATFORMS.map((platform) => {
            const isConfigured = configured[platform] ?? false;
            const alreadyPosted = postedPlatforms.has(platform);
            const disabled = !isConfigured || alreadyPosted;
            return (
              <label
                key={platform}
                className={`flex items-center gap-2 text-sm ${
                  disabled
                    ? 'text-slate-400 dark:text-slate-500'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(platform)}
                  disabled={disabled}
                  onChange={() => toggle(platform)}
                  className="rounded"
                />
                {NEWSLETTER_STRINGS.PLATFORM_LABEL[platform] ?? platform}
                {alreadyPosted && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    {NEWSLETTER_STRINGS.RESULT_POSTED}
                  </span>
                )}
                {!isConfigured && !alreadyPosted && (
                  <span className="text-xs">({NEWSLETTER_STRINGS.KEYS_MISSING})</span>
                )}
              </label>
            );
          })}
        </div>

        <label className="block text-sm text-slate-700 dark:text-slate-200">
          {NEWSLETTER_STRINGS.CAPTION_LABEL}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            maxLength={3000}
            className="mt-1 w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2 text-sm"
          />
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {results && (
          <ul className="text-sm space-y-1">
            {Object.entries(results).map(([platform, r]) => (
              <li
                key={platform}
                className={
                  r.success
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                {NEWSLETTER_STRINGS.PLATFORM_LABEL[platform] ?? platform}:{' '}
                {r.success ? NEWSLETTER_STRINGS.RESULT_POSTED : r.error}
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
          >
            {NEWSLETTER_STRINGS.CLOSE}
          </button>
          <button
            onClick={publish}
            disabled={selected.length === 0 || publishing}
            className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {publishing ? NEWSLETTER_STRINGS.PUBLISHING : NEWSLETTER_STRINGS.PUBLISH_SUBMIT}
          </button>
        </div>
      </div>
    </div>
  );
}
