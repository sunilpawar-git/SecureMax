import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { LEGAL } from '@/config/legal-strings';

export const metadata: Metadata = {
  title: LEGAL.TERMS.TITLE,
};

export default function TermsPage() {
  return <LegalDocument doc={LEGAL.TERMS} />;
}
