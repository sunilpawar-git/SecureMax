/**
 * Badge primitive — small status pill. Color tokens come from BADGE_STYLES
 * (SSOT in config/colors.ts); the only inline classes here are color-free
 * layout (shape/spacing/typography), so the no-raw-color contract holds.
 */
import { BADGE_STYLES } from '@/config/colors';
import { cx } from '@/lib/utils';

const BADGE_BASE = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';

type BadgeVariant = keyof typeof BADGE_STYLES;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'slate', className, children, ...props }: BadgeProps) {
  return (
    <span className={cx(BADGE_BASE, BADGE_STYLES[variant], className)} {...props}>
      {children}
    </span>
  );
}
