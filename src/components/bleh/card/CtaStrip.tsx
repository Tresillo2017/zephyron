import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';
import { Interactive } from './Interactive';

export type CtaHue = 'neg' | 'pos' | 'fav' | 'warn' | 'orange' | 'sponsor' | 'new';

export interface CtaItem {
  icon: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  onClick?: () => void;
  to?: string;
  hue?: CtaHue;
}

/** Full-width strip of call-to-action buttons (round icon disc, title, sub text). */
export function CtaStrip({ items, className }: { items: CtaItem[]; className?: string }) {
  return (
    <div className={cn('cc-cta-strip', className)}>
      {items.map((item, i) => (
        <Interactive key={i} to={item.to} onClick={item.onClick} className={cn('cc-cta', item.hue && `hue-${item.hue}`)}>
          <span className="cc-cta-icon" aria-hidden="true">{item.icon}</span>
          <span className="cc-cta-text">
            <strong>{item.title}</strong>
            {item.body && <span>{item.body}</span>}
          </span>
        </Interactive>
      ))}
    </div>
  );
}
