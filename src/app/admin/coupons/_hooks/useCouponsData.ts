'use client';

/**
 * ViewModel hook for the coupons admin page — list, create, revoke, export.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { COUPON_STRINGS } from '@/config/admin-strings';

export interface CouponRow {
  id: string;
  code: string;
  status: 'active' | 'redeemed' | 'revoked' | 'expired';
  note: string | null;
  expiresAt: string | null;
  redeemedAt: string | null;
  redeemedByEmail: string | null;
  sessionId: string | null;
  createdAt: string;
}

interface CouponsResponse {
  coupons: CouponRow[];
  total: number;
  page: number;
  limit: number;
}

export interface CouponsData {
  coupons: CouponRow[];
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  setPage: (p: number) => void;
  createCoupons: (
    mode: 'single' | 'bulk',
    opts: { count?: number; note?: string; expiresAt?: string },
  ) => Promise<string[] | null>;
  revoke: (code: string) => Promise<boolean>;
  exportCsvUrl: string;
  refresh: () => void;
}

export function useCouponsData(): CouponsData {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    params.set('page', String(page));
    try {
      const res = await fetch(`/api/admin/coupons?${params}`, { signal });
      if (!res.ok) throw new Error('Failed');
      const data: CouponsResponse = await res.json();
      setCoupons(data.coupons);
      setTotal(data.total);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(COUPON_STRINGS.ERR_LOAD);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on filter change
    void load();
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  const createCoupons = useCallback(
    async (
      mode: 'single' | 'bulk',
      opts: { count?: number; note?: string; expiresAt?: string },
    ): Promise<string[] | null> => {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, ...opts }),
      });
      if (!res.ok) return null;
      const data: { coupons: Array<{ code: string }> } = await res.json();
      await load();
      return data.coupons.map((c) => c.code);
    },
    [load],
  );

  const revoke = useCallback(
    async (code: string) => {
      const res = await fetch(`/api/admin/coupons/${encodeURIComponent(code)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await load();
        return true;
      }
      return false;
    },
    [load],
  );

  const exportParams = new URLSearchParams({ format: 'csv' });
  if (statusFilter) exportParams.set('status', statusFilter);

  return {
    coupons,
    total,
    page,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    setPage,
    createCoupons,
    revoke,
    exportCsvUrl: `/api/admin/coupons?${exportParams}`,
    refresh: load,
  };
}
