import { TRUST_STACK } from '@/config/strings';

const STEPS = [
  {
    step: '1',
    title: 'Answer the Assessment',
    description: 'AI-guided questionnaire based on CPP Seven Precis methodology. Takes about 12 minutes.',
  },
  {
    step: '2',
    title: 'Get Your Free Summary',
    description: 'Instant executive summary with a security posture score and risk radar across 7 domains.',
  },
  {
    step: '3',
    title: 'Unlock Full Report',
    description: 'Detailed findings, compliance gaps, remediation roadmap, and current threat intelligence.',
  },
  {
    step: '4',
    title: 'Book Physical Audit',
    description: 'Priority access to on-site assessment by certified security professionals.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="mx-auto max-w-4xl">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl font-bold text-slate-900">How It Works</h2>
          <p className="text-sm text-slate-500">
            {TRUST_STACK.ESTIMATED_TIME} to a complete security posture assessment
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div key={s.step} className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center text-sm font-bold mb-4">
                {s.step}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">{s.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
