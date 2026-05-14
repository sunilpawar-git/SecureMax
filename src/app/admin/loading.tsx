/**
 * Admin loading skeleton — shown during route transitions.
 */

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded" />
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 flex-1 bg-slate-200 rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-slate-200 rounded-lg" />
    </div>
  );
}
