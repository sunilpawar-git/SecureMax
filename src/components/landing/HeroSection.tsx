import Link from 'next/link';
import { APP, CTA, TRUST_STACK } from '@/config/strings';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 text-white py-24 px-6">
      <div className="mx-auto max-w-4xl text-center space-y-8">
        <div className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-xs font-medium text-emerald-400">
          {TRUST_STACK.METHODOLOGY}
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
          {APP.TAGLINE}
        </h1>

        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
          {APP.DESCRIPTION}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/signin"
            className="rounded-lg bg-emerald-600 px-8 py-4 text-sm font-semibold text-white
              shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 transition-colors"
          >
            {CTA.HNI}
          </Link>
          <Link
            href="/auth/signin"
            className="rounded-lg border border-slate-500 px-8 py-4 text-sm font-semibold text-white
              hover:bg-white/10 transition-colors"
          >
            {CTA.ENTERPRISE}
          </Link>
        </div>

        <p className="text-xs text-slate-400">{TRUST_STACK.ESTIMATED_TIME} &middot; Free executive summary</p>
      </div>
    </section>
  );
}
