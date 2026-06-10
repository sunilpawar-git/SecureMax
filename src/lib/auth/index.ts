import NextAuth from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { authConfig } from './config';
import { handleJwt } from './callbacks';
import { logAdminLogin } from './login-audit';
import { USER_ROLE } from '@/config/strings';
import { env } from '@/lib/env';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account, trigger, session }) {
      // On first sign-in both user and account are populated by OAuth.
      // Upsert the user row and hydrate the JWT with DB-sourced fields.
      if (user?.email && account) {
        const isAdminEmail = !!env.ADMIN_EMAIL && user.email === env.ADMIN_EMAIL;
        const dbUser = await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            // Re-sync role on every sign-in: if ADMIN_EMAIL env changes, existing users get promoted/demoted.
            role: isAdminEmail ? USER_ROLE.ADMIN : undefined,
          },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            role: isAdminEmail ? USER_ROLE.ADMIN : USER_ROLE.USER,
          },
        });
        if (dbUser.role === USER_ROLE.ADMIN) {
          await logAdminLogin(dbUser.id, account.provider);
        }
        const hydratedToken: JWT = {
          ...token,
          sub: dbUser.id,
          role: dbUser.role,
          track: dbUser.track,
          consentAt: dbUser.consentAt ? dbUser.consentAt.toISOString() : null,
        };
        return hydratedToken;
      }
      // Session update triggered by client-side useSession().update() — e.g. after consent.
      // SECURITY: only allow whitelisted mutable fields. Never merge role, sub, or email
      // from the client — those must come from the DB on sign-in only.
      if (trigger === 'update' && session) {
        const safe = session as Partial<{ consentAt: string; track: string }>;
        const updated: Partial<JWT> = {};
        if (typeof safe.consentAt === 'string') updated.consentAt = safe.consentAt;
        if (typeof safe.track === 'string') updated.track = safe.track;
        return { ...token, ...updated };
      }
      // Subsequent requests: delegate to the pure callback helper
      return handleJwt(token, user ?? undefined);
    },
  },
});
