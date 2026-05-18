'use client';

/**
 * ViewModel hook for leads pipeline — fetches, filters, and mutates leads.
 */

import { useState, useEffect, useCallback } from 'react';

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string | null;
  designation: string | null;
  facilitiesCount: number | null;
  sourceSessionId: string | null;
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
  refresh: () => void;
}

export function useLeadsData(): LeadsData {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (searchQuery) params.set('search', searchQuery);
    try {
      const res = await fetch(`/api/admin/leads?${params}`);
      if (!res.ok) throw new Error('Failed');
      const data: LeadsResponse = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
    } catch {
      setError('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on filter change
    void load();
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
    refresh: load,
  };
}
