import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../../lib/cn';

/** bleh ".sour" card: b5 surface, hairline ring + soft drop shadow, 12px radius. */
export function Card({ className, padded = true, children, ...props }: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div
      className={cn('relative bg-surface rounded-card shadow-1 overflow-hidden', padded && 'p-5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-[15px] flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-[16px] leading-5 font-medium text-heading">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] leading-[17px] text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
