import Link from 'next/link';
import { FreeSummaryView } from '@/components/report/FreeSummaryView';
import { SAMPLE_REPORT, TRACK } from '@/config/strings';

/**
 * Sample report teaser — reuses the real FreeSummaryView (urgency score +
 * radar chart) with illustrative static data, blurred and watermarked so it
 * reads as a preview, not a live report.
 */
export function SampleReportPreview() {
  return (
    <section className="py-20 px-6 bg-white dark:bg-slate-800">
      <div className="mx-auto max-w-2xl">
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {SAMPLE_REPORT.TITLE}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{SAMPLE_REPORT.SUBTITLE}</p>
        </div>

        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 p-8 overflow-hidden">
          <div aria-hidden className="pointer-events-none select-none blur-[2px] opacity-70">
            <FreeSummaryView
              domainScores={SAMPLE_REPORT.DEMO_SCORES}
              findings={[]}
              urgencyScore={SAMPLE_REPORT.DEMO_URGENCY_SCORE}
              track={TRACK.HNI}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rotate-[-20deg] text-5xl font-black tracking-[0.3em] text-slate-300/60 dark:text-slate-600/60">
              {SAMPLE_REPORT.WATERMARK}
            </span>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link
            href="/auth/signin"
            className="inline-block rounded-lg bg-emerald-700 px-8 py-4 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
          >
            {SAMPLE_REPORT.CTA}
          </Link>
        </div>
      </div>
    </section>
  );
}
