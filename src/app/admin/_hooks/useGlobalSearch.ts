'use client';

/**
 * ViewModel hook for global admin search — debounced cross-entity search.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { SEARCH_DEBOUNCE_MS } from '@/config/admin-strings';

interface SearchResults {
  users: { id: string; email: string | null; name: string | null }[];
  sessions: { id: string; track: string; status: string; userEmail: string | null }[];
  leads: { id: string; company: string; name: string; status: string }[];
  threatIntel: { id: string; title: string; source: string }[];
}

const EMPTY: SearchResults = { users: [], sessions: [], leads: [], threatIntel: [] };

export interface GlobalSearchData {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResults;
  isOpen: boolean;
  setIsOpen: (b: boolean) => void;
  hasResults: boolean;
}

export function useGlobalSearch(): GlobalSearchData {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(EMPTY); return; }
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear on empty query
      setResults(EMPTY); setIsOpen(false);
      return;
    }
    timerRef.current = setTimeout(() => {
      search(query);
      setIsOpen(true);
    }, SEARCH_DEBOUNCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, search]);

  const hasResults =
    results.users.length > 0 ||
    results.sessions.length > 0 ||
    results.leads.length > 0 ||
    results.threatIntel.length > 0;

  return { query, setQuery, results, isOpen, setIsOpen, hasResults };
}
