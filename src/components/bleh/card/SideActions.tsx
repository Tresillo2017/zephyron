import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';
import { Interactive } from './Interactive';
import { Spinner } from './Spinner';

/** Glass list of icon rows for the sidebar. */
export function SideActions({ children, className }: { children: ReactNode; className?: string }) {
  return <nav className={cn('cc-side-actions', className)}>{children}</nav>;
}

export interface SideActionProps {
  icon: ReactNode;
  label: ReactNode;
  onClick?: () => void;
  to?: string;
  href?: string;
  on?: boolean;
  note?: ReactNode;
  pending?: boolean;
  trailing?: ReactNode;
  disabled?: boolean;
}

export function SideAction({ icon, label, onClick, to, href, on, note, pending, trailing, disabled }: SideActionProps) {
  return (
    <Interactive
      to={to}
      href={href}
      onClick={onClick}
      disabled={to || href ? undefined : disabled || pending}
      aria-busy={pending || undefined}
      data-on={on ? '' : undefined}
      className="cc-side-action"
    >
      <span className="cc-side-action-icon" aria-hidden="true">{icon}</span>
      <span className="cc-side-action-label">{label}</span>
      {note && <i className="cc-side-action-note">{note}</i>}
      {pending ? <Spinner className="cc-side-action-end" /> : trailing && <span className="cc-side-action-end">{trailing}</span>}
    </Interactive>
  );
}
