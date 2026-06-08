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
  // `null` opts out of a built-in color token so the caller can supply its own
  // (e.g. FindingCard passing severity colors from SEVERITY_STYLES) without two
  // conflicting background utilities landing on the same element.
  variant?: BadgeVariant | null;
}

export function Badge({ variant = 'slate', className, children, ...props }: BadgeProps) {
  return (
    <span className={cx(BADGE_BASE, variant ? BADGE_STYLES[variant] : '', className)} {...props}>
      {children}
    </span>
  );
}
