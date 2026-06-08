/**
 * Button primitive — the single source for button styling across the app.
 * Variants/sizes/colors come from BUTTON_STYLES (SSOT in config/colors.ts);
 * this file holds no raw color classes. `loading` shows a spinner and disables
 * the button. No `'use client'`: it renders no hooks, so client parents can pass
 * handlers and server parents can render it statically.
 */
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { BUTTON_STYLES } from '@/config/colors';
import { cx } from '@/lib/utils';

type ButtonVariant = keyof typeof BUTTON_STYLES.variant;
type ButtonSize = keyof typeof BUTTON_STYLES.size;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        BUTTON_STYLES.base,
        BUTTON_STYLES.variant[variant],
        BUTTON_STYLES.size[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
