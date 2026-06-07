'use client';

/**
 * Search results dropdown — grouped by entity type.
 */

import Link from 'next/link';
import type { GlobalSearchData } from '../_hooks/useGlobalSearch';

interface SearchDropdownProps {
  data: GlobalSearchData;
}

export function SearchDropdown({ data }: SearchDropdownProps) {
  if (!data.isOpen || !data.query.trim()) return null;

  const { results, hasResults } = data;

  return (
    <div className="absolute top-full mt-1 w-full max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 max-h-[400px] overflow-y-auto">
      {!hasResults && (
        <p className="text-sm text-slate-400 dark:text-slate-500 px-4 py-3">
          No results for &quot;{data.query}&quot;
        </p>
      )}

      {results.users.length > 0 && (
        <Section title="Users">
          {results.users.map((u) => (
            <Link
              key={u.id}
              href={`/admin/sessions?userId=${u.id}`}
              onClick={() => data.setIsOpen(false)}
            >
              <ResultRow label={u.name ?? u.email ?? u.id} sub={u.email} />
            </Link>
          ))}
        </Section>
      )}
      {results.sessions.length > 0 && (
        <Section title="Sessions">
          {results.sessions.map((s) => (
            <Link key={s.id} href="/admin/sessions" onClick={() => data.setIsOpen(false)}>
              <ResultRow label={s.id.slice(0, 12)} sub={`${s.track} · ${s.status}`} />
            </Link>
          ))}
        </Section>
      )}
      {results.leads.length > 0 && (
        <Section title="Leads">
          {results.leads.map((l) => (
            <Link key={l.id} href="/admin/leads" onClick={() => data.setIsOpen(false)}>
              <ResultRow label={l.company} sub={`${l.name} · ${l.status}`} />
            </Link>
          ))}
        </Section>
      )}
      {results.threatIntel.length > 0 && (
        <Section title="Threat Intel">
          {results.threatIntel.map((t) => (
            <Link key={t.id} href="/admin/scraper" onClick={() => data.setIsOpen(false)}>
              <ResultRow label={t.title} sub={t.source} />
            </Link>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b dark:border-slate-700 last:border-0">
      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase px-4 pt-2 pb-1">
        {title}
      </p>
      {children}
    </div>
  );
}

function ResultRow({ label, sub }: { label: string; sub?: string | null }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm">
      <span className="text-slate-700 dark:text-slate-200 truncate">{label}</span>
      {sub && (
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 truncate">{sub}</span>
      )}
    </div>
  );
}
