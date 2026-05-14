/**
 * Admin panel layout — enforces authentication + admin role before rendering.
 * Unauthenticated or non-admin users are redirected to the sign-in page.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { USER_ROLE } from '@/config/strings';
import { AdminNav } from './_components/AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== USER_ROLE.ADMIN) {
    redirect('/auth/signin?callbackUrl=/admin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="max-w-7xl mx-auto p-6">{children}</main>
    </div>
  );
}
