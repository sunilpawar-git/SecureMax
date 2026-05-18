'use client';

/**
 * Audit log table — displays admin actions with type badges and timestamps.
 */

import { ACTION_TYPE_STYLES } from '@/config/admin-colors';
import type { AuditLogEntry } from '@/lib/admin/audit-service';

interface AuditTableProps {
  entries: AuditLogEntry[];
}

export function AuditTable({ entries }: AuditTableProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">No audit log entries found.</p>;
  }

  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Action</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Entity</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Entity ID</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Admin</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Time</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_TYPE_STYLES[e.actionType] ?? 'bg-gray-100 text-gray-800'}`}
                >
                  {e.actionType.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">{e.entityType}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600">
                {e.entityId.slice(0, 12)}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[140px]">
                {e.adminEmail ?? '—'}
              </td>
              <td className="px-4 py-3 text-xs text-slate-400">
                {new Date(e.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
