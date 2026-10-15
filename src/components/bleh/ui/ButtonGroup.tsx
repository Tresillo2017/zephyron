import type { HTMLAttributes } from 'react';
import { cn } from '../../../lib/cn';

/** Wrapping row of buttons, 6px gap (15px with `extra`). */
export function ButtonGroup({ extra, className, ...props }: HTMLAttributes<HTMLDivElement> & { extra?: boolean }) {
  return <div className={cn('ui-btn-group', className)} data-extra={extra ? '' : undefined} {...props} />;
}

/** Joined buttons separated by 1x10px rules. */
export function ButtonCombo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="group" className={cn('ui-btn-combo', className)} {...props} />;
}
