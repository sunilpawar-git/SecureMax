'use client';

/**
 * Filter panel for threat intel articles — domain, source, search.
 */

import { CPP_DOMAINS } from '@/config/strings';
import { SCRAPER_SOURCE_OPTIONS } from '@/config/admin-strings';

interface FilterPanelProps {
  search: string;
  domains: string[];
  source: string;
  onSearchChange: (s: string) => void;
  onDomainsChange: (d: string[]) => void;
  onSourceChange: (s: string) => void;
}

const DOMAIN_OPTIONS = Object.values(CPP_DOMAINS).map((d) => d.code);
const SOURCE_OPTIONS = ['', ...SCRAPER_SOURCE_OPTIONS];

export function FilterPanel({
  search, domains, source,
  onSearchChange, onDomainsChange, onSourceChange,
}: FilterPanelProps) {
  function toggleDomain(code: string) {
    if (domains.includes(code)) {
      onDomainsChange(domains.filter((d) => d !== code));
    } else {
      onDomainsChange([...domains, code]);
    }
  }

  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <h3 className="font-medium text-slate-900 text-sm">Filters</h3>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search titles..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="text-sm rounded-md border border-slate-300 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 w-48"
        />
        <select
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          className="text-sm rounded-md border border-slate-300 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Sources</option>
          {SOURCE_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DOMAIN_OPTIONS.map((code) => (
          <button
            key={code}
            onClick={() => toggleDomain(code)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              domains.includes(code)
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
            }`}
          >
            {code}
          </button>
        ))}
        {domains.length > 0 && (
          <button
            onClick={() => onDomainsChange([])}
            className="text-xs px-2 py-1 text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
