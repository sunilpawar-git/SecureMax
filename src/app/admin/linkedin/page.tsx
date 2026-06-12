'use client';

import { useEffect, useRef, useState } from 'react';
import { DraftQueue } from './_components/DraftQueue';
import { PostingActions } from './_components/PostingActions';
import { ServiceHealthBanner } from './_components/ServiceHealthBanner';
import { useServiceHealth } from './_hooks/useServiceHealth';
import { LINKEDIN_STRINGS } from '@/config/admin-strings';

interface Article {
  id: string;
  title: string;
  url: string;
  summary: string;
  domain_tags?: string[];
  source: string;
}

export default function LinkedInPage() {
  const health = useServiceHealth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draftPost, setDraftPost] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  // Direct posting state — draftId links the editor text to its LinkedinPost row
  const [draftId, setDraftId] = useState<string | null>(null);
  const [postState, setPostState] = useState<'idle' | 'posting' | 'success' | 'error'>('idle');
  const [postError, setPostError] = useState<string | null>(null);
  const fullPost = draftPost + (hashtags.length ? '\n\n' + hashtags.join(' ') : '');
  const charCount = fullPost.length;

  // H3 fix: store timer id to clear on unmount
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    fetch('/api/admin/threat-intel?limit=50')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { articles?: Article[] } | null) => {
        if (data) setArticles(data.articles ?? []);
      })
      .catch(() => {
        /* non-critical */
      });
  }, []);

  const toggleArticle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateDraft = async () => {
    if (selectedIds.size === 0) return;
    setIsGenerating(true);
    setDraftPost('');
    setHashtags([]);
    setGenerateError(null);
    try {
      const res = await fetch('/api/admin/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          post_text?: string;
          hashtags?: string[];
          draftId?: string | null;
        };
        setDraftPost(data.post_text ?? '');
        setHashtags(data.hashtags ?? []);
        setDraftId(data.draftId ?? null);
        setPostState('idle');
      } else {
        const errData = await res.json().catch(() => ({}));
        setGenerateError((errData as { error?: string }).error ?? `Draft failed (${res.status})`);
      }
    } catch {
      setGenerateError('Network error. Is the AI service running?');
    } finally {
      setIsGenerating(false);
    }
  };

  // H2 fix: handle clipboard rejection; H3 fix: clear timer on unmount
  const copyToClipboard = async () => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(fullPost);
      setCopied(true);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
      // Audit trail: log copied post to DB (fire-and-forget — non-blocking)
      void fetch('/api/admin/linkedin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postText: fullPost }),
      });
    } catch {
      setCopyError('Clipboard copy failed — please select and copy manually.');
    }
  };

  const postToLinkedIn = async () => {
    setPostState('posting');
    setPostError(null);
    try {
      const res = await fetch('/api/admin/linkedin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', id: draftId ?? undefined, postText: fullPost }),
      });
      if (res.ok) {
        const okData = (await res.json().catch(() => ({}))) as { bookkeepingFailed?: boolean };
        setPostState('success');
        setPostError(okData.bookkeepingFailed ? LINKEDIN_STRINGS.BOOKKEEPING_WARNING : null);
      } else {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        setPostError(errData.error ?? LINKEDIN_STRINGS.POST_ERROR);
        setPostState('error');
      }
    } catch {
      setPostError(LINKEDIN_STRINGS.POST_ERROR);
      setPostState('error');
    }
  };

  // DraftQueue Repost/Edit — pre-fill the editor with a queued draft
  const useDraft = (text: string, id: string) => {
    setDraftPost(text);
    setHashtags([]);
    setDraftId(id);
    setPostState('idle');
    setPostError(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        LinkedIn Post Workflow
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Select threat intel articles, generate an AI-drafted post, then copy to LinkedIn.
      </p>

      <ServiceHealthBanner health={health} />

      <DraftQueue onUseDraft={useDraft} />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h3 className="font-medium text-slate-900 dark:text-slate-100">
            1. Select Articles ({selectedIds.size} selected)
          </h3>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {articles.map((a) => (
              <label
                key={a.id}
                className={`flex items-start gap-2 p-2 rounded cursor-pointer text-sm ${
                  selectedIds.has(a.id)
                    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(a.id)}
                  onChange={() => toggleArticle(a.id)}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{a.title}</span>
                  <div className="flex gap-1 mt-1">
                    {(a.domain_tags ?? []).map((t) => (
                      <span
                        key={`domain-${t}`}
                        className="px-1 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </label>
            ))}
            {articles.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                No articles yet. Run the scraper to populate threat intelligence.
              </p>
            )}
          </div>
          <button
            onClick={() => {
              void generateDraft();
            }}
            disabled={selectedIds.size === 0 || isGenerating}
            className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-sm
              font-medium hover:bg-slate-900 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Draft'}
          </button>
          {generateError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{generateError}</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h3 className="font-medium text-slate-900 dark:text-slate-100">2. Review and Copy</h3>
          <textarea
            value={draftPost}
            onChange={(e) => setDraftPost(e.target.value)}
            rows={10}
            className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm resize-none
              bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100
              placeholder-slate-400 dark:placeholder-slate-500"
            placeholder={isGenerating ? 'Generating...' : 'AI-generated draft will appear here...'}
            disabled={isGenerating}
          />
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hashtags.map((h) => (
                <span
                  key={h}
                  className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs rounded"
                >
                  {h}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{charCount > 0 ? `${charCount} / 1,300 chars` : ''}</span>
            {charCount > 1300 && (
              <span className="text-red-600 dark:text-red-400 font-medium">Over limit!</span>
            )}
          </div>
          {copyError && <p className="text-xs text-red-600 dark:text-red-400">{copyError}</p>}
          <PostingActions
            draftPost={draftPost}
            isGenerating={isGenerating}
            copied={copied}
            postState={postState}
            postError={postError}
            onCopy={() => {
              void copyToClipboard();
            }}
            onPost={() => {
              void postToLinkedIn();
            }}
          />
        </div>
      </div>
    </div>
  );
}
