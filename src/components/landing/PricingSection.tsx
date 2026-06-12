import Link from 'next/link';
import { PRICING } from '@/config/strings';

function FeatureList({ features }: { features: readonly string[] }) {
  return (
    <ul className="space-y-2 text-left">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span aria-hidden className="text-emerald-600 mt-0.5">
            ✓
          </span>
          {f}
        </li>
      ))}
    </ul>
  );
}

export function PricingSection() {
  return (
    <section className="py-20 px-6 bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{PRICING.TITLE}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{PRICING.SUBTITLE}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-xl border-2 border-emerald-600 bg-white dark:bg-slate-800 p-8 text-center space-y-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {PRICING.HNI_TITLE}
            </h3>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              {PRICING.HNI_PRICE}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{PRICING.HNI_DESC}</p>
            <FeatureList features={PRICING.HNI_FEATURES} />
            <Link
              href="/auth/signin?track=hni"
              className="block rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
            >
              {PRICING.HNI_CTA}
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center space-y-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {PRICING.ENTERPRISE_TITLE}
            </h3>
            <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              {PRICING.ENTERPRISE_PRICE}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{PRICING.ENTERPRISE_DESC}</p>
            <FeatureList features={PRICING.ENTERPRISE_FEATURES} />
            <Link
              href="/auth/signin?track=enterprise"
              className="block rounded-lg border border-slate-300 dark:border-slate-600 px-6 py-3 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {PRICING.ENTERPRISE_CTA}
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          {PRICING.ONE_TIME_NOTE}
        </p>
      </div>
    </section>
  );
}
