'use client';

/**
 * ViewModel — fetches admin service-health booleans once on mount.
 * Returns null while loading or on fetch failure (banner renders nothing).
 */

import { useEffect, useState } from 'react';

export interface ServiceHealth {
  aiServiceReachable: boolean;
  aiServiceAuthOk: boolean;
  linkedinConfigured: boolean;
}

export function useServiceHealth(): ServiceHealth | null {
  const [health, setHealth] = useState<ServiceHealth | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/health')
      .then((res) => (res.ok ? (res.json() as Promise<ServiceHealth>) : null))
      .then((data) => {
        if (!cancelled && data) setHealth(data);
      })
      .catch(() => {
        /* non-critical — banner simply does not render */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return health;
}
