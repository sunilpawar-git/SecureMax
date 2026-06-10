'use client';

/**
 * Copy + direct-post controls for the LinkedIn page (View — no data fetching).
 * Extracted from page.tsx at the 280-line split gate.
 */

import { LINKEDIN_STRINGS } from '@/config/admin-strings';
import { LINKEDIN_POST_SUCCESS_BADGE, LINKEDIN_POST_WARNING_TEXT } from '@/config/admin-colors';

export type PostState = 'idle' | 'posting' | 'success' | 'error';

interface PostingActionsProps {
  draftPost: string;
  isGenerating: boolean;
  copied: boolean;
  postState: PostState;
  postError: string | null;
  onCopy: () => void;
  onPost: () => void;
}

export function PostingActions({
  draftPost,
  isGenerating,
  copied,
  postState,
  postError,
  onCopy,
  onPost,
}: PostingActionsProps) {
  return (
    <>
      {postError && (
        <p
          className={`text-xs ${postState === 'success' ? LINKEDIN_POST_WARNING_TEXT : 'text-red-600 dark:text-red-400'}`}
        >
          {postError}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={onCopy}
          disabled={isGenerating || !draftPost}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm
            font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
        <button
          onClick={onPost}
          disabled={isGenerating || !draftPost || postState === 'posting'}
          className="px-4 py-2 bg-sky-700 text-white rounded-lg text-sm
            font-medium hover:bg-sky-800 disabled:opacity-50"
        >
          {postState === 'posting'
            ? LINKEDIN_STRINGS.POSTING
            : postState === 'error'
              ? LINKEDIN_STRINGS.RETRY
              : LINKEDIN_STRINGS.POST_BUTTON}
        </button>
        {postState === 'success' && (
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded ${LINKEDIN_POST_SUCCESS_BADGE}`}
          >
            {LINKEDIN_STRINGS.POST_SUCCESS}
          </span>
        )}
      </div>
    </>
  );
}
