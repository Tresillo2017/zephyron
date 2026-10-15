import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';

export interface SectionProps {
  title?: ReactNode;
  icon?: ReactNode;
  display?: boolean;
  action?: ReactNode;
  subtle?: boolean;
  id?: string;
  className?: string;
  children?: ReactNode;
}

/** Flat column section: 16px heading (serif display or subtle variants), optional icon and action. */
export function Section({ title, icon, display, action, subtle, id, className, children }: SectionProps) {
  return (
    <section id={id} className={cn('cc-section', className)}>
      {(title || action) && (
        <div className="cc-section-head">
          <h2 className={cn('cc-section-title', display && 'cc-section-title--display setting-head', subtle && 'cc-section-title--subtle')}>
            {icon && <span className="cc-section-icon" aria-hidden="true">{icon}</span>}
            {title}
          </h2>
          {action && <div className="cc-section-action">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
