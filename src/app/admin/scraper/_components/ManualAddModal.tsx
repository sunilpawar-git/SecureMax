'use client';

/**
 * Manual article add modal — admin pastes URL + title + summary, selects CPP domains.
 */

import { useState } from 'react';
import { CPP_DOMAINS } from '@/config/strings';

interface ManualAddModalProps {
  onAdd: (data: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
}

const DOMAIN_OPTIONS = Object.values(CPP_DOMAINS).map((d) => d.code);

export function ManualAddModal({ onAdd, onClose }: ManualAddModalProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDomain(code: string) {
    setSelectedDomains((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim() || !summary.trim() || selectedDomains.length === 0) return;
    setSubmitting(true);
    setError(null);
    const ok = await onAdd({
      title,
      url,
      summary,
      domainTags: selectedDomains,
      industryTags: [],
    });
    setSubmitting(false);
    if (ok) onClose();
    else setError('Failed to add article. Check for duplicate URL.');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Manual Article</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            required
            maxLength={500}
          />
          <input
            type="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full text-sm rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            required
            maxLength={2000}
          />
          <textarea
            placeholder="Summary (min 10 chars)"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            className="w-full text-sm rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            required
            minLength={10}
            maxLength={5000}
          />
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">
              CPP Domains (select at least 1)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DOMAIN_OPTIONS.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleDomain(code)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    selectedDomains.includes(code)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedDomains.length === 0}
              className="text-sm px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Adding...' : 'Add Article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
