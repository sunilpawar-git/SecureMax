'use client';

/**
 * Email compose modal — sends a custom email to a lead via the admin API.
 */

import { useState } from 'react';
import { ADMIN_EMAIL_TEMPLATES } from '@/config/admin-strings';
import type { Lead } from '../_hooks/useLeadsData';

interface EmailModalProps {
  lead: Lead;
  onSend: (leadId: string, subject: string, body: string) => Promise<boolean>;
  onClose: () => void;
}

export function EmailModal({ lead, onSend, onClose }: EmailModalProps) {
  const [subject, setSubject] = useState<string>(ADMIN_EMAIL_TEMPLATES.FOLLOW_UP_SUBJECT);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setError(null);
    const ok = await onSend(lead.id, subject, body);
    setSending(false);
    if (ok) {
      onClose();
    } else {
      setError('Failed to send email. Please try again.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Send Email</h2>
        <p className="text-sm text-slate-500 mb-4">
          To: {lead.email ?? 'No email'} ({lead.company})
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email-subject" className="text-sm font-medium text-slate-700">
              Subject
            </label>
            <input
              id="email-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              maxLength={200}
              required
            />
          </div>
          <div>
            <label htmlFor="email-body" className="text-sm font-medium text-slate-700">
              Body
            </label>
            <textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              maxLength={5000}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !subject.trim() || !body.trim()}
              className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
