'use client';

/**
 * ViewModel for the admin newsletter page — list, generate-now with job polling,
 * soft-delete.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { NEWSLETTER_STRINGS } from '@/config/admin-strings';

export interface NewsletterPostRow {
  platform: string;
  status: string;
  postedAt: string | null;
}

export interface NewsletterRow {
  id: string;
  title: string;
  status: string;
  articleIds: string[];
  createdAt: string;
  posts: NewsletterPostRow[];
}

export interface NewsletterData {
  newsletters: NewsletterRow[];
  configured: Record<string, boolean>;
  loading: boolean;
  generating: boolean;
  error: string | null;
  notice: string | null;
  generateNow: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => void;
  copyWhatsApp: (id: string) => Promise<boolean>;
  fetchEmailHtml: (id: string) => Promise<string | null>;
}

const POLL_INTERVAL_MS = 3_000;
const POLL_MAX_MS = 5 * 60_000;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal.aborted) {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function useNewsletterData(): NewsletterData {
  const [newsletters, setNewsletters] = useState<NewsletterRow[]>([]);
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const pollAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch('/api/admin/newsletter', { signal });
        if (!res.ok) throw new Error('Failed');
        const json = (await res.json()) as {
          newsletters?: NewsletterRow[];
          configured?: Record<string, boolean>;
        };
        setNewsletters(json.newsletters ?? []);
        setConfigured(json.configured ?? {});
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(NEWSLETTER_STRINGS.ERR_LOAD);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [refreshKey]);

  const pollJob = useCallback(async (jobId: string, signal: AbortSignal) => {
    const deadline = Date.now() + POLL_MAX_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS, signal);
      const res = await fetch(
        `/api/admin/newsletter?action=status&jobId=${encodeURIComponent(jobId)}`,
        { signal },
      );
      if (!res.ok) continue;
      const body = (await res.json()) as {
        status?: string;
        title?: string | null;
        error_message?: string | null;
      };
      if (body.status === 'completed') {
        setNotice(
          body.title
            ? NEWSLETTER_STRINGS.GENERATE_COMPLETE(body.title)
            : NEWSLETTER_STRINGS.GENERATE_PENDING,
        );
        setRefreshKey((k) => k + 1);
        return;
      }
      if (body.status === 'failed') {
        setError(body.error_message ?? NEWSLETTER_STRINGS.ERR_GENERATE);
        return;
      }
    }
    setNotice(NEWSLETTER_STRINGS.GENERATE_STILL_RUNNING);
    setRefreshKey((k) => k + 1);
  }, []);

  const generateNow = useCallback(async () => {
    pollAbortRef.current?.abort();
    const pollController = new AbortController();
    pollAbortRef.current = pollController;

    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/newsletter?action=generate', { method: 'POST' });
      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        setError(errJson.error ?? NEWSLETTER_STRINGS.ERR_GENERATE);
        return;
      }
      const body = (await res.json()) as { job_id?: string; status?: string };
      if (body.job_id) {
        setNotice(NEWSLETTER_STRINGS.GENERATE_PENDING);
        await pollJob(body.job_id, pollController.signal);
      } else {
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(NEWSLETTER_STRINGS.ERR_GENERATE);
      }
    } finally {
      setGenerating(false);
    }
  }, [pollJob]);

  const remove = useCallback(async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/newsletter?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setError(NEWSLETTER_STRINGS.ERR_DELETE);
        return;
      }
      setRefreshKey((k) => k + 1);
    } catch {
      setError(NEWSLETTER_STRINGS.ERR_DELETE);
    }
  }, []);

  const copyWhatsApp = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(
        `/api/admin/newsletter/${encodeURIComponent(id)}/formats?type=whatsapp`,
      );
      if (!res.ok) return false;
      const json = (await res.json()) as { text?: string };
      if (!json.text) return false;
      await navigator.clipboard.writeText(json.text);
      return true;
    } catch {
      return false;
    }
  }, []);

  const fetchEmailHtml = useCallback(async (id: string): Promise<string | null> => {
    try {
      const res = await fetch(
        `/api/admin/newsletter/${encodeURIComponent(id)}/formats?type=email`,
      );
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }, []);

  return {
    newsletters,
    configured,
    loading,
    generating,
    error,
    notice,
    generateNow,
    remove,
    refresh: () => setRefreshKey((k) => k + 1),
    copyWhatsApp,
    fetchEmailHtml,
  };
}
