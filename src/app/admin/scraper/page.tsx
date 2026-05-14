'use client';

import { useEffect, useState } from 'react';

interface ScraperRunResult {
  status: string;
  error?: string;
  stats: {
    fetched: number;
    duplicates: number;
    stored: number;
    gemini_tagged: number;
    errors: string[];
  };
}

interface SourceHealthItem {
  is_healthy: boolean;
  consecutive_failures: number;
  total_articles: number;
  last_success: string | null;
}

interface Article {
  id: string;
  title: string;
  url: string;
  summary: string;
  domain_tags: string[];
  industry_tags: string[];
  source: string;
  scraped_at: string | null;
}

interface HealthResponse {
  sources: Record<string, SourceHealthItem>;
  next_scheduled_run: string | null;
}

export default function ScraperPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<ScraperRunResult | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/scraper?action=health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HealthResponse | null) => { if (data) setHealth(data); })
      .catch(() => { /* non-critical */ });
    fetch('/api/admin/scraper')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { articles?: Article[] } | null) => {
        if (data) setArticles(data.articles ?? []);
      })
      .catch(() => { /* non-critical */ });
  }, []);

  const loadHealth = () => {
    fetch('/api/admin/scraper?action=health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HealthResponse | null) => { if (data) setHealth(data); })
      .catch(() => { /* non-critical */ });
  };

  const loadArticles = () => {
    fetch('/api/admin/scraper')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { articles?: Article[] } | null) => {
        if (data) setArticles(data.articles ?? []);
      })
      .catch(() => { /* non-critical */ });
  };

  const runScraper = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/scraper', { method: 'POST' });
      if (res.ok) {
        setLastResult(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || `Scraper failed with status ${res.status}`);
      }
    } catch (e) {
      setError(`Network error: ${String(e)}`);
    } finally {
      setIsRunning(false);
      loadHealth();
      loadArticles();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Scraper Dashboard</h1>
        <button
          onClick={runScraper}
          disabled={isRunning}
          className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm
            font-medium hover:bg-emerald-800 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run Scraper Now'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {lastResult && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium mb-2">Last Run Results</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Fetched:</span> {lastResult.stats.fetched}
            </div>
            <div>
              <span className="text-gray-500">Stored:</span> {lastResult.stats.stored}
            </div>
            <div>
              <span className="text-gray-500">Duplicates:</span> {lastResult.stats.duplicates}
            </div>
            <div>
              <span className="text-gray-500">AI Tagged:</span> {lastResult.stats.gemini_tagged}
            </div>
          </div>
          {(lastResult.stats?.errors?.length ?? 0) > 0 && (
            <div className="mt-2 text-sm text-red-600">
              Errors: {lastResult.stats.errors.join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-medium mb-3">Source Health</h3>
        {health?.next_scheduled_run && (
          <p className="text-xs text-gray-500 mb-3">
            Next scheduled run: {new Date(health.next_scheduled_run).toLocaleString()}
          </p>
        )}
        <div className="space-y-2">
          {health && Object.entries(health.sources).map(([name, h]) => (
            <div key={name} className="flex items-center justify-between text-sm border-b pb-2">
              <span className="font-medium">{name}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-500">{h.total_articles} articles</span>
                {h.last_success && (
                  <span className="text-xs text-gray-400">
                    Last: {new Date(h.last_success).toLocaleDateString()}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    h.is_healthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {h.is_healthy ? 'Healthy' : `Failed x${h.consecutive_failures}`}
                </span>
              </div>
            </div>
          ))}
          {(!health || Object.keys(health.sources).length === 0) && (
            <p className="text-sm text-gray-400">No source data yet. Run the scraper first.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-medium mb-3">Recent Articles ({articles.length})</h3>
        <div className="space-y-3">
          {articles.map((a) => {
            const safeUrl =
              a.url.startsWith('https://') || a.url.startsWith('http://')
                ? a.url
                : '#';
            return (
            <div key={a.id} className="border-b pb-3 last:border-b-0">
              <a
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sm text-blue-700 hover:underline"
              >
                {a.title}
              </a>
              <p className="text-xs text-gray-600 mt-1">{a.summary}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {a.domain_tags.map((tag) => (
                  <span key={`domain-${tag}`} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded">
                    {tag}
                  </span>
                ))}
                {a.industry_tags.map((tag) => (
                  <span key={`industry-${tag}`} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {a.source} {a.scraped_at ? `· ${new Date(a.scraped_at).toLocaleDateString()}` : ''}
              </p>
            </div>
            );
          })}
          {articles.length === 0 && (
            <p className="text-sm text-gray-400">No articles in database. Run the scraper to populate.</p>
          )}
        </div>
      </div>
    </div>
  );
}
