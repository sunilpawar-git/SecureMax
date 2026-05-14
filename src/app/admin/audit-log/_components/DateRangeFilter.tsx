'use client';

/**
 * Date range filter for audit log — start/end date inputs.
 */

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}

export function DateRangeFilter({ startDate, endDate, onStartChange, onEndChange }: DateRangeFilterProps) {
  return (
    <div className="flex gap-3 items-center">
      <label className="text-xs text-slate-500">From</label>
      <input type="date" value={startDate} onChange={(e) => onStartChange(e.target.value)}
        className="text-sm rounded-md border border-slate-300 px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500" />
      <label className="text-xs text-slate-500">To</label>
      <input type="date" value={endDate} onChange={(e) => onEndChange(e.target.value)}
        className="text-sm rounded-md border border-slate-300 px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}
