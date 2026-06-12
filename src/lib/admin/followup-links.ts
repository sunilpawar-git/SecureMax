/**
 * Client-safe follow-up action URL builders — no Prisma/server imports, so
 * admin client components can share the exact logic the service layer exposes.
 */

import { FOLLOWUP_STRINGS } from '@/config/admin-strings';

/** WhatsApp deep link; with no phone it falls back to the share-target picker. */
export function buildWhatsAppUrl(phone: string): string {
  const encoded = encodeURIComponent(FOLLOWUP_STRINGS.WHATSAPP_MESSAGE);
  return `https://wa.me/${phone}?text=${encoded}`;
}
