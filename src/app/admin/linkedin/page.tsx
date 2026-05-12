'use client';

import { useState } from 'react';

export default function LinkedInPage() {
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [draftPost, setDraftPost] = useState('');
  const [copied, setCopied] = useState(false);

  const generateDraft = async () => {
    setDraftPost('Loading AI-generated draft...');
    try {
      const res = await fetch('/api/admin/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_url: selectedArticle }),
      });
      if (res.ok) {
        const data = await res.json();
        setDraftPost(data.draft || 'Failed to generate draft.');
      }
    } catch {
      setDraftPost('Error generating draft. Try again.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draftPost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">LinkedIn Post Workflow</h1>
      <p className="text-sm text-gray-500">
        Generate AI-drafted posts from threat intel articles. Copy and paste to LinkedIn.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-4 space-y-3">
          <h3 className="font-medium">1. Select Source Article</h3>
          <input
            type="url"
            placeholder="Paste article URL or select from threat intel..."
            value={selectedArticle || ''}
            onChange={(e) => setSelectedArticle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={generateDraft}
            disabled={!selectedArticle}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm
              font-medium hover:bg-slate-900 disabled:opacity-50"
          >
            Generate Draft
          </button>
        </div>

        <div className="bg-white rounded-lg border p-4 space-y-3">
          <h3 className="font-medium">2. Review and Copy</h3>
          <textarea
            value={draftPost}
            onChange={(e) => setDraftPost(e.target.value)}
            rows={8}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
            placeholder="AI-generated draft will appear here..."
          />
          <button
            onClick={copyToClipboard}
            disabled={!draftPost}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm
              font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
