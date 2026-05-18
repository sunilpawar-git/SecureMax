import NextAuth from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { authConfig } from './config';
import { handleJwt } from './callbacks';
import { USER_ROLE } from '@/config/strings';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account, trigger, session }) {
      // On first sign-in both user and account are populated by OAuth.
      // Upsert the user row and hydrate the JWT with DB-sourced fields.
      if (user?.email && account) {
        const dbUser = await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.email === process.env.ADMIN_EMAIL ? USER_ROLE.ADMIN : USER_ROLE.USER,
          },
        });
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
      // Merge any fields passed to update() directly into the token so the proxy sees them
      // immediately without waiting for a full re-login.
      if (trigger === 'update' && session) {
        return { ...token, ...(session as Partial<JWT>) };
      }
      // Subsequent requests: delegate to the pure callback helper
      return handleJwt(token, user ?? undefined);
    },
  },
});
