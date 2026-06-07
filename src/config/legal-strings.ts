/**
 * SSOT for legal document copy (Privacy Policy, Terms of Service).
 * Kept separate from strings.ts to keep both files small and focused.
 * Rendered by the shared LegalDocument component.
 */

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  TITLE: string;
  UPDATED: string;
  INTRO: string;
  SECTIONS: LegalSection[];
}

const PRIVACY: LegalDoc = {
  TITLE: 'Privacy Policy',
  UPDATED: 'Last updated: May 2026',
  INTRO:
    'This policy explains what personal data Raivan Global collects when you use the security audit service, why we collect it, and the rights you have under the Digital Personal Data Protection Act, 2023 (DPDPA).',
  SECTIONS: [
    {
      heading: 'Data we collect',
      body: [
        'Identity data from your sign-in provider (Google or Microsoft): your name and email address. We never store passwords — authentication is delegated entirely to your provider.',
        'Assessment data: the answers you provide during the security questionnaire, and the audit findings derived from them.',
        'We do not collect your residential address or precise geolocation.',
      ],
    },
    {
      heading: 'How we use your data',
      body: [
        'To generate your physical security audit report, grounded in the CPP Seven Precis methodology.',
        'To enrich findings with current threat intelligence relevant to your profile.',
        'We never sell your data, and we never share it with third parties without your explicit consent.',
      ],
    },
    {
      heading: 'How we protect your data',
      body: [
        'Your questionnaire answers and AI reasoning are encrypted at rest using AES-256-GCM, and all data in transit is protected with TLS 1.3.',
        'Audit session data is isolated per user — there is no cross-tenant access.',
        'Data is hosted on India-based servers.',
      ],
    },
    {
      heading: 'Data retention',
      body: [
        'We retain your assessment data for as long as your account is active so you can revisit your reports.',
        'An immutable audit log of consent and processing events is retained for compliance, with personal identifiers anonymised on erasure.',
      ],
    },
    {
      heading: 'Your rights under DPDPA',
      body: [
        'Right to access the personal data we hold about you.',
        'Right to correction of inaccurate or incomplete data.',
        'Right to erasure: you can request deletion at any time. We soft-delete and anonymise your records while preserving the integrity of the compliance audit trail.',
        'Right to grievance redressal.',
      ],
    },
    {
      heading: 'Contact',
      body: ['For any privacy request or grievance, contact us at support@raivanglobal.com.'],
    },
  ],
};

const TERMS: LegalDoc = {
  TITLE: 'Terms of Service',
  UPDATED: 'Last updated: May 2026',
  INTRO:
    'By using Raivan Global, you agree to these terms. Please read them carefully before starting an assessment.',
  SECTIONS: [
    {
      heading: 'The service',
      body: [
        'Raivan Global provides an AI-assisted physical security self-assessment and an audit report that surfaces potential gaps.',
        'The report is advisory. It is a gap brief intended to complement — not replace — a professional on-site audit or your existing security provider.',
      ],
    },
    {
      heading: 'Acceptable use',
      body: [
        'You agree to provide accurate information and to use the service only for lawful purposes related to assessing premises you are authorised to assess.',
        'You may not attempt to disrupt, reverse-engineer, or gain unauthorised access to the service or other users\u2019 data.',
      ],
    },
    {
      heading: 'Payments',
      body: [
        'Report unlocks for individual (HNI) users are processed securely through Razorpay. We do not store your card details.',
        'Enterprise engagements are handled through a separate proposal and contract.',
      ],
    },
    {
      heading: 'Disclaimer & liability',
      body: [
        'The assessment is provided on an "as is" basis. While grounded in established methodology, it does not guarantee the detection of every vulnerability and creates no guarantee of security.',
        'To the extent permitted by law, Raivan Global is not liable for losses arising from reliance on the report in place of a professional audit.',
      ],
    },
    {
      heading: 'Governing law',
      body: ['These terms are governed by the laws of India.'],
    },
    {
      heading: 'Contact',
      body: ['Questions about these terms? Contact support@raivanglobal.com.'],
    },
  ],
};

export const LEGAL = { PRIVACY, TERMS } as const;

export const LEGAL_LINKS = {
  PRIVACY: { href: '/privacy', label: 'Privacy Policy' },
  TERMS: { href: '/terms', label: 'Terms of Service' },
} as const;
