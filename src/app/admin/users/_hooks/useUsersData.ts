'use client';

/**
 * ViewModel hook for admin users — fetch, filter by track, search (debounced), paginate.
 * Uses AbortController to cancel stale requests and clean up on unmount.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserEntry, UsersResult } from '@/lib/admin/users-service';
import { USERS_PAGE, SEARCH_DEBOUNCE_MS, ADMIN_PAGE_SIZE } from '@/config/admin-strings';

export type { UserEntry };

export interface UsersData {
  users: UserEntry[];
  total: number;
  loading: boolean;
  error: string | null;
  trackFilter: string;
  search: string;
  page: number;
  setTrackFilter: (t: string) => void;
  setSearch: (s: string) => void;
  setPage: (p: number) => void;
  refresh: () => void;
}

/** Exported for unit testing — builds query string from current filter state. */
export function buildUsersParams(opts: {
  track: string;
  search: string;
  page: number;
  limit: number;
}): string {
  const p = new URLSearchParams();
  if (opts.track) p.set('track', opts.track);
  if (opts.search) p.set('search', opts.search);
  p.set('page', String(opts.page));
  p.set('limit', String(opts.limit));
  return p.toString();
}

const PAGE_SIZE = ADMIN_PAGE_SIZE;
export { PAGE_SIZE as USERS_PAGE_SIZE };

export function useUsersData(): UsersData {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackFilter, setTrackFilterRaw] = useState('');
  const [search, setSearchRaw] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPageRaw] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setLoading(true);
    setError(null);
    try {
      const qs = buildUsersParams({
        track: trackFilter,
        search: debouncedSearch,
        page,
        limit: PAGE_SIZE,
      });
      const res = await fetch(`/api/admin/users?${qs}`, { signal });
      if (!res.ok) {
        setError(USERS_PAGE.ERR_LOAD_FAILED);
        return;
      }
      const data: UsersResult = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(USERS_PAGE.ERR_LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  }, [trackFilter, debouncedSearch, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data fetch triggered by filter change
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const setTrackFilter = useCallback((t: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setTrackFilterRaw(t);
    setPageRaw(1);
  }, []);

  const setSearch = useCallback((s: string) => {
    setSearchRaw(s);
    setPageRaw(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(s);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const setPage = useCallback((p: number) => {
    setPageRaw(p);
  }, []);

  return {
    users,
    total,
    loading,
    error,
    trackFilter,
    search,
    page,
    setTrackFilter,
    setSearch,
    setPage,
    refresh: load,
  };
}
