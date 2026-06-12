import { DEMO } from '@/config/strings';

/** Step-by-step walkthrough — pure CSS, no animation library. */
export function DemoWalkthroughSection() {
  return (
    <section className="py-20 px-6 bg-white dark:bg-slate-800">
      <div className="mx-auto max-w-4xl">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{DEMO.TITLE}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{DEMO.SUBTITLE}</p>
        </div>

        <ol className="relative space-y-8 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-emerald-200 dark:before:bg-emerald-900 sm:max-w-xl sm:mx-auto">
          {DEMO.STEPS.map((step, i) => (
            <li key={step.title} className="relative pl-12">
              <span className="absolute left-0 top-0 w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {step.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
