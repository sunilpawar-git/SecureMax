/**
 * SSOT for landing-page marketing copy: pricing, FAQ, footer, sample report
 * preview, and demo walkthrough. Split out of strings.ts (300-line gate),
 * following the report-strings / auth-strings precedent. Re-exported from
 * strings.ts so `@/config/strings` stays the single import path.
 */

import { PAYMENT } from './payment';

/** Display price derived from the Razorpay amount — single source of truth. */
const HNI_PRICE_LABEL = `\u20B9${(PAYMENT.AMOUNT_PAISE / 100).toLocaleString('en-IN')}`;

export const PRICING = {
  TITLE: 'Simple, Transparent Pricing',
  SUBTITLE: 'Start free. Pay only when you want the full picture.',
  HNI_PRICE: HNI_PRICE_LABEL,
  HNI_TITLE: 'HNI Residence Audit',
  HNI_DESC: 'Complete digital security audit of your residence, delivered as a private PDF report.',
  HNI_FEATURES: [
    'Free executive summary with posture score',
    'Full report: findings, severity, remediation roadmap',
    'Current threat intelligence for your risk profile',
    'Priority booking for on-site physical audit',
  ],
  HNI_CTA: 'Start Free Assessment',
  ENTERPRISE_TITLE: 'Enterprise Facility Audit',
  ENTERPRISE_PRICE: 'Custom',
  ENTERPRISE_DESC: 'Multi-facility assessments with compliance mapping and board-level reporting.',
  ENTERPRISE_FEATURES: [
    'Everything in the HNI audit',
    'ISO 27001 / PSARA compliance gap analysis',
    'Multi-facility rollout support',
    'Dedicated consultant and proposal',
  ],
  ENTERPRISE_CTA: 'Request a Proposal',
  ONE_TIME_NOTE: 'One-time payment per audit. No subscription.',
} as const;

export const SAMPLE_REPORT = {
  TITLE: 'See What You Get',
  SUBTITLE:
    'Every audit produces a posture score, a seven-domain risk radar, and prioritised findings — here is a preview.',
  WATERMARK: 'SAMPLE',
  CTA: 'Get Your Own Report',
  // Static sample data for the preview — illustrative only, never from a real session
  DEMO_URGENCY_SCORE: 64,
  DEMO_SCORES: {
    'CPP-01': 45,
    'CPP-02': 72,
    'CPP-03': 38,
    'CPP-04': 80,
    'CPP-05': 55,
    'CPP-06': 62,
    'CPP-07': 70,
  } as Record<string, number>,
} as const;

export const DEMO = {
  TITLE: 'From Questions to Action Plan',
  SUBTITLE: 'What happens after you click start',
  STEPS: [
    {
      title: 'Adaptive questionnaire',
      description: 'The AI asks only what matters for your property type — about 12 minutes.',
    },
    {
      title: 'Instant scoring',
      description: 'Watch your security posture build live across the 7 CPP domains.',
    },
    {
      title: 'Findings, ranked',
      description: 'Critical gaps first, each grounded in CPP Seven Precis methodology.',
    },
    {
      title: 'Roadmap in hand',
      description: 'A prioritised action checklist you can hand to your security agency.',
    },
  ],
} as const;

export const TESTIMONIALS = {
  TITLE: 'Trusted by Security-Conscious Clients',
  BADGE: 'CPP Seven Precis Methodology',
  // TODO(launch-blocker): placeholder quotes — replace every item with a real,
  // consented client quote before any pilot traffic reaches the landing page.
  ITEMS: [
    {
      quote:
        'The audit surfaced perimeter gaps our agency had missed for years. The roadmap paid for itself in the first week.',
      author: 'Family Office Principal',
      context: 'South Mumbai residence',
    },
    {
      quote:
        'Finally a security report our board could actually read. The compliance mapping made budgeting straightforward.',
      author: 'VP Operations',
      context: 'Manufacturing, 4 facilities',
    },
    {
      quote:
        'Twelve minutes of questions, and the findings were sharper than our last on-site vendor assessment.',
      author: 'HNI Client',
      context: 'Farmhouse estate, NCR',
    },
  ],
} as const;

export const FAQ = {
  TITLE: 'Frequently Asked Questions',
  ITEMS: [
    {
      q: 'Is the assessment really free?',
      a: 'Yes. The questionnaire and executive summary — posture score and risk radar — are completely free. You pay only if you want the full detailed report.',
    },
    {
      q: 'How long does the assessment take?',
      a: 'About 12 minutes. The AI adapts its questions to your property type, so you never answer anything irrelevant.',
    },
    {
      q: 'What is the CPP Seven Precis methodology?',
      a: 'A professional security framework covering seven domains: physical security, business principles, crisis management, investigations, information security, personnel security, and security management. Every question and finding is grounded in it.',
    },
    {
      q: 'Is my data safe? Do you know where I live?',
      a: 'Your answers are encrypted end-to-end and we never collect your property address or location. Data is stored on India-hosted servers and is private to your account.',
    },
    {
      q: 'What do I get in the paid report?',
      a: 'Detailed findings ranked by severity, each with a recommendation, compliance gap analysis, a remediation roadmap, and current threat intelligence relevant to your profile.',
    },
    {
      q: 'Do you replace my existing security agency?',
      a: 'No. We work alongside your existing agency — the report becomes a precise gap brief you can hand to them.',
    },
    {
      q: 'Can I book a physical on-site audit?',
      a: 'Yes. Paid report holders get priority access to on-site assessments by certified security professionals.',
    },
  ],
} as const;

export const FOOTER = {
  LINKEDIN_LABEL: 'LinkedIn',
  LINKEDIN_URL: 'https://www.linkedin.com/company/raivan-global',
  WHATSAPP_LABEL: 'WhatsApp',
  WHATSAPP_CONTACT: 'https://wa.me/918936995010',
  ADDRESS: 'Raivan Global, Level 4, Cyber Hub, DLF Phase 2, Gurugram, Haryana 122002, India',
} as const;
