import { FAQ } from '@/config/strings';

/** CSS-only accordion via native details/summary — no client JS needed. */
export function FAQSection() {
  return (
    <section className="py-20 px-6 bg-white dark:bg-slate-800">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center mb-10">
          {FAQ.TITLE}
        </h2>

        <div className="space-y-3">
          {FAQ.ITEMS.map((item) => (
            <details
              key={item.q}
              className="group rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
            >
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {item.q}
                <span
                  aria-hidden
                  className="text-slate-400 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
