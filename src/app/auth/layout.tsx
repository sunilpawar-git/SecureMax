import { APP } from '@/config/strings';
import { AUTH_LAYOUT_STYLES } from '@/config/colors';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={AUTH_LAYOUT_STYLES.shell}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className={AUTH_LAYOUT_STYLES.title}>{APP.NAME}</h1>
          <p className={AUTH_LAYOUT_STYLES.tagline}>{APP.TAGLINE}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
