import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/LegalDocument';
import { LEGAL } from '@/config/legal-strings';

export const metadata: Metadata = {
  title: LEGAL.PRIVACY.TITLE,
};

export default function PrivacyPage() {
  return <LegalDocument doc={LEGAL.PRIVACY} />;
}
