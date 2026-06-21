'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// TODO(deprecate-after-2026-07-21): consent + profile were merged into a
// single /onboarding screen. Kept as a redirect shim for one release cycle
// in case of stale links/bookmarks — remove once the compat window passes.
export default function ProfilePageRedirect() {
  return (
    <Suspense fallback={null}>
      <ProfileRedirect />
    </Suspense>
  );
}

function ProfileRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const track = searchParams.get('track');

  useEffect(() => {
    router.replace(track ? `/onboarding?track=${encodeURIComponent(track)}` : '/onboarding');
  }, [router, track]);

  return null;
}
