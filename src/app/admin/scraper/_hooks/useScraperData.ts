'use client';

/**
 * ViewModel hook for scraper dashboard — health, articles, run history, threat intel.
 */

import { useState, useEffect, useCallback } from 'react';

interface SourceHealthItem {
  is_healthy: boolean;
  consecutive_failures: number;
  total_articles: number;
  last_success: string | null;
}

interface HealthResponse {
  sources: Record<string, SourceHealthItem>;
  next_scheduled_run: string | null;
}

export interface Article {
  id: string;
  title: string;
  url: string;
  summary: string;
  domainTags: string[];
  industryTags: string[];
  source: string;
  usedInReports: boolean;
  softDeleted: boolean;
  scrapedAt: string | null;
}

interface ArticlesResponse {
  articles: Article[];
  total: number;
}

export interface ScraperData {
  health: HealthResponse | null;
  articles: Article[];
  totalArticles: number;
  isRunning: boolean;
  error: string | null;
  filters: { search: string; domains: string[]; source: string };
  showDeleted: boolean;
  setShowDeleted: (v: boolean) => void;
  setSearch: (s: string) => void;
  setDomains: (d: string[]) => void;
  setSource: (s: string) => void;
  runScraper: () => Promise<void>;
  addArticle: (data: Record<string, unknown>) => Promise<boolean>;
  deleteArticle: (id: string) => Promise<boolean>;
  restoreArticle: (id: string) => Promise<boolean>;
  refresh: () => void;
}

export function useScraperData(): ScraperData {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [totalArticles, setTotalArticles] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [source, setSource] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const loadHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/scraper?action=health');
      if (res.ok) setHealth(await res.json());
    } catch {
      /* non-critical */
    }
  }, []);

  const loadArticles = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (domains.length) params.set('domains', domains.join(','));
    if (source) params.set('source', source);
    if (showDeleted) params.set('showDeleted', 'true');
    try {
      const res = await fetch(`/api/admin/threat-intel?${params}`);
      if (res.ok) {
        const data: ArticlesResponse = await res.json();
        setArticles(data.articles ?? []);
        setTotalArticles(data.total ?? 0);
      }
    } catch {
      /* non-critical */
    }
  }, [search, domains, source, showDeleted]);

  const refresh = useCallback(() => {
    loadHealth();
    loadArticles();
  }, [loadHealth, loadArticles]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      await refresh();
    };
    void fetchData();
    return () => controller.abort();
  }, [refresh]);

  const runScraper = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/scraper', { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? 'Scraper failed');
      }
    } catch (e) {
      setError(`Network error: ${String(e)}`);
    } finally {
      setIsRunning(false);
      refresh();
    }
  }, [refresh]);

  const addArticle = useCallback(
    async (data: Record<string, unknown>) => {
      const res = await fetch('/api/admin/threat-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await loadArticles();
        return true;
      }
      return false;
    },
    [loadArticles],
  );

  const deleteArticleFn = useCallback(
    async (id: string) => {
      const res = await fetch('/api/admin/threat-intel', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: id }),
      });
      if (res.ok) {
        await loadArticles();
        return true;
      }
      return false;
    },
    [loadArticles],
  );

  const restoreArticleFn = useCallback(
    async (id: string) => {
      const res = await fetch('/api/admin/threat-intel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', articleId: id }),
      });
      if (res.ok) {
        await loadArticles();
        return true;
      }
      return false;
    },
    [loadArticles],
  );

  return {
    health,
    articles,
    totalArticles,
    isRunning,
    error,
    filters: { search, domains, source },
    showDeleted,
    setShowDeleted,
    setSearch,
    setDomains,
    setSource,
    runScraper,
    addArticle,
    deleteArticle: deleteArticleFn,
    restoreArticle: restoreArticleFn,
    refresh,
  };
}
