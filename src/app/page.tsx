import { HeroSection } from '@/components/landing/HeroSection';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { TrustSignals } from '@/components/landing/TrustSignals';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { DemoWalkthroughSection } from '@/components/landing/DemoWalkthroughSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { SampleReportPreview } from '@/components/landing/SampleReportPreview';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { APP, CTA, TRUST_STACK, FOOTER } from '@/config/strings';
import { LEGAL_LINKS } from '@/config/legal-strings';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main>
        <HeroSection />
        <HowItWorks />
        <DemoWalkthroughSection />
        <PricingSection />
        <SampleReportPreview />
        <TestimonialsSection />
        <FAQSection />
        <TrustSignals />

        <section className="py-20 px-6 bg-white dark:bg-slate-800">
          <div className="mx-auto max-w-2xl text-center space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {CTA.FREE_ASSESSMENT}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{TRUST_STACK.HNI_PRIVACY}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signin?track=hni"
                className="rounded-lg bg-emerald-700 px-8 py-4 text-sm font-semibold text-white
                hover:bg-emerald-800 transition-colors"
              >
                {CTA.HNI}
              </Link>
              <Link
                href="/auth/signin?track=enterprise"
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-8 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100
                hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {CTA.ENTERPRISE}
              </Link>
            </div>
          </div>
        </section>

        <footer className="py-8 px-6 border-t border-slate-100 dark:border-slate-700">
          <div className="mx-auto max-w-4xl space-y-4 text-xs text-slate-400 dark:text-slate-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p suppressHydrationWarning>
                &copy; {new Date().getFullYear()} {APP.NAME}. All rights reserved.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  href={LEGAL_LINKS.PRIVACY.href}
                  className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {LEGAL_LINKS.PRIVACY.label}
                </Link>
                <Link
                  href={LEGAL_LINKS.TERMS.href}
                  className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {LEGAL_LINKS.TERMS.label}
                </Link>
                <a
                  href={`mailto:${APP.SUPPORT_EMAIL}`}
                  className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {APP.SUPPORT_EMAIL}
                </a>
                <a
                  href={FOOTER.LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {FOOTER.LINKEDIN_LABEL}
                </a>
                <a
                  href={FOOTER.WHATSAPP_CONTACT}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {FOOTER.WHATSAPP_LABEL}
                </a>
                <span>{TRUST_STACK.CREDENTIAL}</span>
              </div>
            </div>
            <p className="text-center sm:text-left">{FOOTER.ADDRESS}</p>
          </div>
        </footer>
      </main>
    </>
  );
}
