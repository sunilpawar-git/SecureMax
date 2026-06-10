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
}

export function useNewsletterData(): NewsletterData {
  const [newsletters, setNewsletters] = useState<NewsletterRow[]>([]);
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/newsletter');
      if (!res.ok) throw new Error('Failed');
      const json = (await res.json()) as {
        newsletters?: NewsletterRow[];
        configured?: Record<string, boolean>;
      };
      setNewsletters(json.newsletters ?? []);
      setConfigured(json.configured ?? {});
    } catch {
      setError(NEWSLETTER_STRINGS.ERR_LOAD);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on mount
    void load();
  }, [load]);

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
      await load();
    } catch {
      setError(NEWSLETTER_STRINGS.ERR_GENERATE);
    } finally {
      setGenerating(false);
    }
  }, [load]);

  const remove = useCallback(
    async (id: string) => {
      setError(null);
      try {
        const res = await fetch(`/api/admin/newsletter?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          setError(NEWSLETTER_STRINGS.ERR_DELETE);
          return;
        }
        await load();
      } catch {
        setError(NEWSLETTER_STRINGS.ERR_DELETE);
      }
    },
    [load],
  );

  return { newsletters, configured, loading, generating, error, generateNow, remove, refresh: load };
}
