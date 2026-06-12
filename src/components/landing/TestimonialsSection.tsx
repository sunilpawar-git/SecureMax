import { TESTIMONIALS, TRUST_STACK } from '@/config/strings';

export function TestimonialsSection() {
  return (
    <section className="py-20 px-6 bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {TESTIMONIALS.TITLE}
          </h2>
          <span className="inline-block rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-4 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            {TRUST_STACK.METHODOLOGY}
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {/* TODO: replace with real client quote — placeholder testimonials */}
          {TESTIMONIALS.ITEMS.map((t) => (
            <figure
              key={t.author}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4"
            >
              <blockquote className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t.author}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t.context}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
