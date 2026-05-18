import { APP } from '@/config/strings';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{APP.NAME}</h1>
          <p className="mt-1 text-sm text-slate-500">{APP.TAGLINE}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
