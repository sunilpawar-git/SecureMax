'use client';

/**
 * ViewModel for the admin newsletter page — list, generate-now, soft-delete.
 */

import { useState, useEffect, useCallback } from 'react';
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
  generateNow: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => void;
  copyWhatsApp: (id: string) => Promise<boolean>;
  fetchEmailHtml: (id: string) => Promise<string | null>;
}

export function useNewsletterData(): NewsletterData {
  const [newsletters, setNewsletters] = useState<NewsletterRow[]>([]);
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // refreshKey is bumped to re-trigger the load effect after mutations
  const [refreshKey, setRefreshKey] = useState(0);

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

  const generateNow = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/newsletter?action=generate', { method: 'POST' });
      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        setError(errJson.error ?? NEWSLETTER_STRINGS.ERR_GENERATE);
        return;
      }
      setRefreshKey((k) => k + 1);
    } catch {
      setError(NEWSLETTER_STRINGS.ERR_GENERATE);
    } finally {
      setGenerating(false);
    }
  }, []);

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
    generateNow,
    remove,
    refresh: () => setRefreshKey((k) => k + 1),
    copyWhatsApp,
    fetchEmailHtml,
  };
}
