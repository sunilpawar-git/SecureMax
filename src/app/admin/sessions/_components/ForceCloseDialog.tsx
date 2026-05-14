'use client';

/**
 * Confirmation dialog before force-closing a session.
 */

interface ForceCloseDialogProps {
  sessionId: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ForceCloseDialog({ sessionId, onConfirm, onCancel }: ForceCloseDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Force Close Session</h2>
        <p className="text-sm text-slate-600 mb-4">
          This will mark session{' '}
          <span className="font-mono text-xs">{sessionId.slice(0, 8)}...</span>{' '}
          as abandoned. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="text-sm px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="text-sm px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Force Close
          </button>
        </div>
      </div>
    </div>
  );
}
