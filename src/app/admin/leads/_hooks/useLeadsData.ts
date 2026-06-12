'use client';

/**
 * ViewModel hook for leads pipeline — fetches, filters, and mutates leads.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string | null;
  designation: string | null;
  facilitiesCount: number | null;
  sourceSessionId: string | null;
  couponCode: string | null;
  sessionPaid: boolean | null;
  status: string;
  followUpDueAt: string | null;
  lastEmailSentAt: string | null;
  createdAt: string;
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
}

export interface LeadsData {
  leads: Lead[];
  total: number;
  loading: boolean;
  error: string | null;
  statusFilter: string;
  searchQuery: string;
  setStatusFilter: (s: string) => void;
  setSearchQuery: (q: string) => void;
  updateStatus: (leadId: string, newStatus: string) => Promise<boolean>;
  sendEmail: (leadId: string, subject: string, body: string) => Promise<boolean>;
  markPaid: (leadId: string, invoiceRef?: string) => Promise<boolean>;
  refresh: () => void;
}

export function useLeadsData(): LeadsData {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (searchQuery) params.set('search', searchQuery);
    try {
      const res = await fetch(`/api/admin/leads?${params}`, { signal });
      if (!res.ok) throw new Error('Failed');
      const data: LeadsResponse = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Failed to load leads');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on filter change
    void load();
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  const updateStatus = useCallback(
    async (leadId: string, newStatus: string) => {
      const res = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, newStatus }),
      });
      if (res.ok) {
        await load();
        return true;
      }
      return false;
    },
    [load],
  );

  const sendEmail = useCallback(
    async (leadId: string, subject: string, body: string) => {
      const res = await fetch('/api/admin/leads/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, subject, body }),
      });
      if (res.ok) {
        await load();
        return true;
      }
      return false;
    },
    [load],
  );

  const markPaid = useCallback(
    async (leadId: string, invoiceRef?: string) => {
      const res = await fetch('/api/admin/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_paid', leadId, ...(invoiceRef && { invoiceRef }) }),
      });
      if (res.ok) {
        await load();
        return true;
      }
      return false;
    },
    [load],
  );

  return {
    leads,
    total,
    loading,
    error,
    statusFilter,
    searchQuery,
    setStatusFilter,
    setSearchQuery,
    updateStatus,
    sendEmail,
    markPaid,
    refresh: load,
  };
}
