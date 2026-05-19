import { AppLayoutShell } from '@/components/AppLayoutShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutShell>{children}</AppLayoutShell>;
}
