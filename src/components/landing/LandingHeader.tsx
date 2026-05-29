import Link from 'next/link';
import { APP, NAV } from '@/config/strings';
import { LANDING_HEADER_STYLES } from '@/config/colors';

/**
 * Public landing page header — no session, no client hooks.
 * Separate from AppHeader (which is for authenticated (app) routes).
 *
 * Responsibilities (SRP):
 * - Show brand logo linking to /
 * - Show "Sign In" for returning users / admins
 *
 * Not responsible for:
 * - Session state (public page — no useSession)
 * - Navigation between app routes (AppHeader handles that)
 */
export function LandingHeader() {
  return (
    <header className={LANDING_HEADER_STYLES.header}>
      <div className={LANDING_HEADER_STYLES.nav}>
        <Link href="/" className={LANDING_HEADER_STYLES.logo}>
          {APP.NAME}
        </Link>
        <Link href="/auth/signin" className={LANDING_HEADER_STYLES.signInLink}>
          {NAV.SIGN_IN}
        </Link>
      </div>
    </header>
  );
}
