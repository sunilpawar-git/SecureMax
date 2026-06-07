'use client';

/**
 * Users page — thin MVVM orchestrator. No data-fetching logic here.
 */

import { useUsersData, USERS_PAGE_SIZE } from './_hooks/useUsersData';
import { UsersTable } from './_components/UsersTable';
import { USERS_PAGE } from '@/config/admin-strings';
import { TRACK, TRACK_LABEL } from '@/config/strings';

const TRACK_OPTIONS = [
  { value: '', label: USERS_PAGE.FILTER_ALL_TRACKS },
  { value: TRACK.HNI, label: TRACK_LABEL[TRACK.HNI] },
  { value: TRACK.ENTERPRISE, label: TRACK_LABEL[TRACK.ENTERPRISE] },
];

export default function UsersPage() {
  const data = useUsersData();
  const totalPages = Math.ceil(data.total / USERS_PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {USERS_PAGE.TITLE}
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            {USERS_PAGE.DESCRIPTION}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select
            value={data.trackFilter}
            onChange={(e) => data.setTrackFilter(e.target.value)}
            className="text-sm rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
          >
            {TRACK_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={data.search}
            onChange={(e) => data.setSearch(e.target.value)}
            placeholder={USERS_PAGE.FILTER_SEARCH_PLACEHOLDER}
            className="text-sm rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100 w-56"
          />
          <span className="text-sm text-slate-400 dark:text-slate-500 self-center">
            {data.total} {USERS_PAGE.TOTAL_LABEL}
          </span>
        </div>
      </div>

      {data.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md px-4 py-2">
          {data.error}
        </p>
      )}
      {data.loading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">{USERS_PAGE.LOADING}</p>
      ) : (
        <UsersTable users={data.users} />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            onClick={() => data.setPage(data.page - 1)}
            disabled={data.page === 1}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            {USERS_PAGE.PAGINATION_PREV}
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Page {data.page} of {totalPages}
          </span>
          <button
            onClick={() => data.setPage(data.page + 1)}
            disabled={data.page === totalPages}
            className="text-sm px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            {USERS_PAGE.PAGINATION_NEXT}
          </button>
        </div>
      )}
    </div>
  );
}
