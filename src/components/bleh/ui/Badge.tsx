import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'error' | 'new' | 'beta' | 'sticker';

/** Tones that re-derive the palette from a hue override, so the badge keeps f4/20% + l3-c. */
const hue: Partial<Record<BadgeTone, string>> = {
  success: 'hue-pos',
  warning: 'hue-warn',
  error: 'hue-neg',
  new: 'hue-new',
  sticker: 'hue-new',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('ui-badge', hue[tone], className)} data-tone={tone}>
      {children}
    </span>
  );
}

/** Notification count pill, or a 10px dot that pops in. */
export function Counter({ count, dot, className }: { count?: number; dot?: boolean; className?: string }) {
  if (!dot && !(count && count > 0)) return null;
  return (
    <span className={cn('ui-counter', className)} data-dot={dot ? '' : undefined} aria-hidden={dot || undefined}>
      {dot ? null : count! > 99 ? '99+' : count}
    </span>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn('ui-kbd', className)}>{children}</kbd>;
}
