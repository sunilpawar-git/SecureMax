/**
 * Card primitive — surface container. Styling comes from CARD_STYLES (SSOT in
 * config/colors.ts); no raw color classes here. `variant` maps 1:1 to CARD_STYLES.
 */
import { CARD_STYLES } from '@/config/colors';
import { cx } from '@/lib/utils';

type CardVariant = keyof typeof CARD_STYLES;

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ variant = 'default', className, children, ...props }: CardProps) {
  return (
    <div className={cx(CARD_STYLES[variant], className)} {...props}>
      {children}
    </div>
  );
}
