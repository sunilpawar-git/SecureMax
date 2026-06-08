import { AppLayoutShell } from '@/components/AppLayoutShell';
import { AppHeaderProvider } from '@/components/app-header-context';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppHeaderProvider>
      <AppLayoutShell>{children}</AppLayoutShell>
    </AppHeaderProvider>
  );
}
