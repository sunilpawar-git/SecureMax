'use client';

import { useState, useEffect } from 'react';

interface ReportEntry {
  id: string;
  sessionId: string;
  track: string;
  status: string;
  createdAt: string;
  unlocked: boolean;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportEntry[]>([]);

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch('/api/admin/reports');
        if (res.ok) setReports(await res.json());
      } catch {
        /* graceful degradation */
      }
    }
    loadReports();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Report Management</h1>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Report ID</th>
              <th className="text-left px-4 py-3 font-medium">Track</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Unlocked</th>
              <th className="text-left px-4 py-3 font-medium">Created</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{report.id.slice(0, 8)}...</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      report.track === 'enterprise' ? 'bg-slate-100' : 'bg-emerald-100'
                    }`}
                  >
                    {report.track}
                  </span>
                </td>
                <td className="px-4 py-3">{report.status}</td>
                <td className="px-4 py-3">{report.unlocked ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(report.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    className="text-xs text-blue-600 hover:underline mr-2 disabled:opacity-50"
                    title="Coming soon — requires DB integration"
                    disabled
                  >
                    Regenerate
                  </button>
                  {!report.unlocked && report.track === 'enterprise' && (
                    <button
                      className="text-xs text-green-600 hover:underline disabled:opacity-50"
                      title="Coming soon — requires DB integration"
                      disabled
                    >
                      Unlock
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No reports generated yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
