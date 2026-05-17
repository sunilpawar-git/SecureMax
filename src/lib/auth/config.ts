/**
 * NextAuth.js configuration — Google + optionally Microsoft Entra ID.
 * A provider is only registered when its credentials are present and non-placeholder.
 * Email is the canonical identity across all providers.
 */

import type { NextAuthConfig } from 'next-auth';
import type { Provider } from '@auth/core/providers';
import Google from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import { handleJwt, handleSession, isAuthorized } from './callbacks';

function isRealValue(val: string | undefined): val is string {
  return !!val && !val.startsWith('your-');
}

const providers: Provider[] = [];

if (isRealValue(process.env.GOOGLE_CLIENT_ID) && isRealValue(process.env.GOOGLE_CLIENT_SECRET)) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (isRealValue(process.env.AZURE_AD_CLIENT_ID) && isRealValue(process.env.AZURE_AD_CLIENT_SECRET)) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
    }),
  );
}

export const authConfig: NextAuthConfig = {
  providers,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      return isAuthorized(role, isLoggedIn, request.nextUrl.pathname);
    },
    jwt({ token, user }) {
      return handleJwt(token, user ?? undefined);
    },
    session({ session, token }) {
      const updated = handleSession(
        {
          id: '',
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: '',
          track: '',
          consentAt: null,
        },
        token,
      );
      return {
        ...session,
        user: { ...session.user, ...updated },
      };
    },
  },
  session: { strategy: 'jwt' },
};
