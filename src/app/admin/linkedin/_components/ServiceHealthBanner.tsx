'use client';

/**
 * View — actionable warnings for service misconfiguration.
 * Renders nothing when health is unknown (loading) or fully green.
 */

import { HEALTH_STRINGS } from '@/config/admin-strings';
import { HEALTH_WARNING_BANNER } from '@/config/admin-colors';
import type { ServiceHealth } from '../_hooks/useServiceHealth';

export function ServiceHealthBanner({ health }: { health: ServiceHealth | null }) {
  if (!health) return null;

  const warnings: string[] = [];
  if (!health.aiServiceReachable) {
    warnings.push(HEALTH_STRINGS.AI_UNREACHABLE);
  } else if (!health.aiServiceAuthOk) {
    // Auth state is only meaningful when the service is reachable
    warnings.push(HEALTH_STRINGS.AI_AUTH_FAILED);
  }
  if (!health.linkedinConfigured) {
    warnings.push(HEALTH_STRINGS.LINKEDIN_UNCONFIGURED);
  }

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2" role="alert">
      {warnings.map((w) => (
        <p key={w} className={HEALTH_WARNING_BANNER}>
          {w}
        </p>
      ))}
    </div>
  );
}
