'use client';

/**
 * Users table — pure View, no data-fetching, no side effects.
 * Displays enriched user rows: avatar, track, role, session metrics.
 */

import Link from 'next/link';
import { TRACK_BADGE_STYLES, PAID_STATUS_STYLES, ROLE_BADGE_STYLES } from '@/config/admin-colors';
import { USERS_PAGE } from '@/config/admin-strings';
import { USER_ROLE, TRACK_LABEL } from '@/config/strings';
import type { UserEntry } from '../_hooks/useUsersData';

interface UsersTableProps {
  users: UserEntry[];
}

/** Exported for unit testing. Future timestamps (clock skew) return 'Today'. */
export function formatRelativeDate(iso: string | null, neverLabel: string): string {
  if (!iso) return neverLabel;
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return 'Today';
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

/** Exported for unit testing. Formats as DD/MM/YYYY in UTC to avoid timezone drift. */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function UserAvatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : email[0].toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">
        {initials}
      </div>
      <div className="min-w-0">
        {name && (
          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{name}</p>
        )}
        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{email}</p>
      </div>
    </div>
  );
}

export function UsersTable({ users }: UsersTableProps) {
  if (users.length === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
        {USERS_PAGE.EMPTY_STATE}
      </p>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              {USERS_PAGE.COL_USER}
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              {USERS_PAGE.COL_TRACK}
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              {USERS_PAGE.COL_ROLE}
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              {USERS_PAGE.COL_SESSIONS}
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              {USERS_PAGE.COL_PAID}
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              {USERS_PAGE.COL_LAST_ACTIVE}
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              {USERS_PAGE.COL_JOINED}
            </th>
            <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
              {USERS_PAGE.COL_ACTION}
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              className="border-b dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <td className="px-4 py-3 max-w-[200px]">
                <UserAvatar name={u.name} email={u.email} />
              </td>
              <td className="px-4 py-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${TRACK_BADGE_STYLES[u.track] ?? ''}`}
                >
                  {TRACK_LABEL[u.track] ?? u.track.toUpperCase()}
                </span>
              </td>
              <td className="px-4 py-3">
                {u.role === USER_ROLE.ADMIN && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE_STYLES.admin}`}
                  >
                    {USERS_PAGE.ROLE_ADMIN_LABEL}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                {u.sessionCount}
              </td>
              <td className="px-4 py-3">
                {u.paidSessionCount > 0 ? (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAID_STATUS_STYLES.paid}`}
                  >
                    {u.paidSessionCount}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {USERS_PAGE.PAID_NONE}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
                {formatRelativeDate(u.lastActiveAt, USERS_PAGE.NEVER)}
              </td>
              <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
                {formatShortDate(u.joinedAt)}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/sessions?userId=${encodeURIComponent(u.id)}`}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  {USERS_PAGE.VIEW_SESSIONS}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
