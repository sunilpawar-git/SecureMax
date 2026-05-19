'use client';

/**
 * Admin HNI Follow-up page — lists users who downloaded reports
 * but haven't booked a physical audit. Actions: email or WhatsApp.
 */

import { useEffect, useState } from 'react';
import { FOLLOWUP_STRINGS, ADMIN_EMAIL_TEMPLATES } from '@/config/admin-strings';
import { FOLLOWUP_STATUS_STYLES } from '@/config/admin-colors';

function buildWhatsAppUrl(phone: string): string {
  const encoded = encodeURIComponent(FOLLOWUP_STRINGS.WHATSAPP_MESSAGE);
  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

interface FollowUpItem {
  sessionId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  downloadedAt: string | null;
  followupDueAt: string | null;
  status: 'overdue' | 'due_today' | 'upcoming';
  track: string;
}

export default function FollowUpPage() {
  const [items, setItems] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFollowUps() {
      try {
        const res = await fetch('/api/admin/followup');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setItems(data.items ?? []);
      } catch {
        setError(FOLLOWUP_STRINGS.LOAD_ERROR);
      } finally {
        setLoading(false);
      }
    }
    fetchFollowUps();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{FOLLOWUP_STRINGS.PAGE_TITLE}</h1>
        <p className="text-sm text-slate-500 mt-1">{FOLLOWUP_STRINGS.PAGE_DESCRIPTION}</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-2">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400 py-8 text-center">Loading...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">{FOLLOWUP_STRINGS.EMPTY_STATE}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  {FOLLOWUP_STRINGS.COL_USER}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  {FOLLOWUP_STRINGS.COL_DOWNLOADED}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  {FOLLOWUP_STRINGS.COL_FOLLOWUP_DUE}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  {FOLLOWUP_STRINGS.COL_ACTION}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <FollowUpRow key={item.sessionId} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FollowUpRow({ item }: { item: FollowUpItem }) {
  const rowClass = FOLLOWUP_STATUS_STYLES[item.status] ?? '';

  return (
    <tr className={rowClass}>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-slate-900">
          {item.userName ?? FOLLOWUP_STRINGS.UNKNOWN_USER}
        </div>
        <div className="text-xs text-slate-500">{item.userEmail}</div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {item.downloadedAt ? new Date(item.downloadedAt).toLocaleDateString() : '-'}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {item.followupDueAt ? new Date(item.followupDueAt).toLocaleDateString() : '-'}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <a
            href={`mailto:${item.userEmail}?subject=${encodeURIComponent(ADMIN_EMAIL_TEMPLATES.FOLLOW_UP_SUBJECT)}`}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            {FOLLOWUP_STRINGS.EMAIL_CTA}
          </a>
          <a
            href={buildWhatsAppUrl('')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-green-600 hover:text-green-800"
          >
            {FOLLOWUP_STRINGS.WHATSAPP_CTA}
          </a>
        </div>
      </td>
    </tr>
  );
}
