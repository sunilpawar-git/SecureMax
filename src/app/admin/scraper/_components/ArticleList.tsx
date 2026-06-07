'use client';

/**
 * Article list — displays threat intel articles with tags and delete button.
 */

import type { Article } from '../_hooks/useScraperData';

interface ArticleListProps {
  articles: Article[];
  total: number;
  onDelete: (id: string) => void;
}

export function ArticleList({ articles, total, onDelete }: ArticleListProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
      <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Articles ({total})</h3>
      <div className="space-y-3">
        {articles.map((a) => {
          const safeUrl = a.url.startsWith('http') ? a.url : '#';
          const tags = (a.domainTags ?? []) as string[];
          const iTags = (a.industryTags ?? []) as string[];
          return (
            <div
              key={a.id}
              className="border-b border-slate-100 dark:border-slate-700 pb-3 last:border-0"
            >
              <div className="flex items-start justify-between gap-2">
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sm text-blue-700 dark:text-blue-400 hover:underline"
                >
                  {a.title}
                </a>
                {!a.usedInReports && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          'Delete this article from the knowledge base? This cannot be undone.',
                        )
                      ) {
                        onDelete(a.id);
                      }
                    }}
                    className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 shrink-0"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                {a.summary}
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((tag) => (
                  <span
                    key={`d-${tag}`}
                    className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
                {iTags.map((tag) => (
                  <span
                    key={`i-${tag}`}
                    className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {a.source}
                {a.scrapedAt ? ` · ${new Date(a.scrapedAt).toLocaleDateString()}` : ''}
                {a.usedInReports && (
                  <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                    Used in reports
                  </span>
                )}
              </p>
            </div>
          );
        })}
        {articles.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">No articles found.</p>
        )}
      </div>
    </div>
  );
}
