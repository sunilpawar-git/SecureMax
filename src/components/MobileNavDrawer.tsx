'use client';

/**
 * MobileNavDrawer — purely presentational slide-in navigation panel.
 *
 * Owns ONLY open/close affordances: slide-in, backdrop, Escape-to-close,
 * focus-trap, and focus restore. It holds no auth or routing knowledge — each
 * caller (authed AppHeader, public LandingHeader in Phase 3) passes its own
 * `items` and optional `footer` (assertion #6).
 */
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { NAV_DRAWER } from '@/config/strings';
import { cx } from '@/lib/utils';

export interface NavDrawerItem {
  label: string;
  href?: string;
  onClick?: () => void;
  emphasis?: boolean;
}

interface MobileNavDrawerProps {
  items: NavDrawerItem[];
  open: boolean;
  onClose: () => void;
  footer?: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function MobileNavDrawer({ items, open, onClose, footer }: MobileNavDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    focusables()[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = focusables();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" data-testid="mobile-nav-drawer">
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-hidden="true"
        data-testid="mobile-nav-backdrop"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={NAV_DRAWER.ARIA_LABEL}
        className="absolute right-0 top-0 h-full w-72 max-w-[80%] bg-white p-4 shadow-xl dark:bg-slate-900"
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label={NAV_DRAWER.CLOSE}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="mt-2 flex flex-col gap-1">
          {items.map((item) => {
            const className = cx(
              'rounded-lg px-3 py-3 text-sm font-medium transition-colors',
              item.emphasis
                ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
            );
            return item.href ? (
              <Link key={item.label} href={item.href} onClick={onClose} className={className}>
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.onClick?.();
                  onClose();
                }}
                className={cx(className, 'text-left')}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {footer && (
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">{footer}</div>
        )}
      </div>
    </div>
  );
}
