'use client';

import { useState, useEffect } from 'react';

interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  facilityCount: number;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  proposal_sent: 'bg-indigo-100 text-indigo-800',
  closed_won: 'bg-green-100 text-green-800',
  closed_lost: 'bg-gray-100 text-gray-800',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    async function loadLeads() {
      try {
        const res = await fetch('/api/admin/leads');
        if (res.ok) setLeads(await res.json());
      } catch {
        /* graceful degradation */
      }
    }
    loadLeads();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Enterprise Leads Pipeline</h1>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Company</th>
              <th className="text-left px-4 py-3 font-medium">Contact</th>
              <th className="text-left px-4 py-3 font-medium">Facilities</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{lead.companyName}</td>
                <td className="px-4 py-3">
                  <div>{lead.contactName}</div>
                  <div className="text-gray-500 text-xs">{lead.contactEmail}</div>
                </td>
                <td className="px-4 py-3">{lead.facilityCount}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[lead.status] || ''}`}>
                    {lead.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(lead.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No enterprise leads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
