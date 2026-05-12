import Link from 'next/link';
import { APP } from '@/config/strings';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/scraper', label: 'Scraper' },
  { href: '/admin/leads', label: 'Enterprise Leads' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/linkedin', label: 'LinkedIn' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-slate-900 text-white px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-8">
          <span className="font-bold text-sm">{APP.NAME} Admin</span>
          <div className="flex gap-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto p-6">{children}</main>
    </div>
  );
}
