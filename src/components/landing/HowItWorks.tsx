import { TRUST_STACK, LANDING, LANDING_STEPS } from '@/config/strings';

export function HowItWorks() {
  return (
    <section className="py-20 px-6 bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {LANDING.HOW_IT_WORKS_TITLE}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {TRUST_STACK.ESTIMATED_TIME} {LANDING.HOW_IT_WORKS_SUBTITLE_SUFFIX}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {LANDING_STEPS.map((s) => (
            <div key={s.step} className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center text-sm font-bold mb-4">
                {s.step}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {s.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
