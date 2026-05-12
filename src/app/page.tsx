import { APP, CTA } from '@/config/strings';

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">{APP.NAME}</h1>
      <p className="mt-4 text-lg text-slate-600 text-center max-w-2xl">{APP.TAGLINE}</p>
      <p className="mt-2 text-sm text-slate-500 text-center max-w-xl">{APP.DESCRIPTION}</p>

      <div className="mt-10 flex flex-col sm:flex-row gap-4">
        <a
          href="/questionnaire"
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
        >
          {CTA.HNI}
        </a>
        <a
          href="/questionnaire"
          className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 transition-colors"
        >
          {CTA.ENTERPRISE}
        </a>
      </div>
    </main>
  );
}
