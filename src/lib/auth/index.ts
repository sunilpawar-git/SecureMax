'use server';

import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { authConfig } from './config';
import { USER_ROLE } from '@/config/strings';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as ReturnType<typeof PrismaAdapter>,
  ...authConfig,
  events: {
    async createUser({ user }) {
      if (user.email === process.env.ADMIN_EMAIL) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: USER_ROLE.ADMIN },
        });
      }
    },
  },
});
