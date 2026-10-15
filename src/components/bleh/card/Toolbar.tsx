import type { ReactNode } from 'react';
import { cn } from '../../../lib/cn';
import { Interactive } from './Interactive';

/** Generic 48px toolbar row (filters etc.); first child of the card. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('cc-toolbar', className)}>{children}</div>;
}

export interface ToolbarPillProps {
  icon?: ReactNode;
  label: ReactNode;
  count?: number;
  selected?: boolean;
  onClick?: () => void;
  to?: string;
  href?: string;
  role?: 'tab';
}

/** One toolbar pill; also usable standalone in a toolbar or as the `trailing` slot. */
export function ToolbarPill({ icon, label, count, selected, onClick, to, href, role }: ToolbarPillProps) {
  return (
    <Interactive
      to={to}
      href={href}
      onClick={onClick}
      role={role}
      aria-selected={role ? !!selected : undefined}
      aria-current={!role && selected ? 'page' : undefined}
      data-selected={selected ? '' : undefined}
      className="cc-pill"
    >
      {icon && <span className="cc-pill-icon" aria-hidden="true">{icon}</span>}
      <span>{label}</span>
      {count != null && count > 0 && <span className="cc-pill-count">{count}</span>}
    </Interactive>
  );
}

export interface ToolbarTabsProps<T extends string> {
  tabs: { key: T; label: string; icon?: ReactNode; count?: number }[];
  active: T | null;
  onChange?: (key: T) => void;
  hrefFor?: (key: T) => string;
  trailing?: ReactNode;
}

/** Toolbar pill tabs: role=tablist buttons, or nav links when `hrefFor` is given. */
export function ToolbarTabs<T extends string>({ tabs, active, onChange, hrefFor, trailing }: ToolbarTabsProps<T>) {
  const asLinks = !!hrefFor;
  const items = tabs.map(tab => (
    <ToolbarPill
      key={tab.key}
      icon={tab.icon}
      label={tab.label}
      count={tab.count}
      selected={tab.key === active}
      to={hrefFor?.(tab.key)}
      onClick={asLinks ? undefined : () => onChange?.(tab.key)}
      role={asLinks ? undefined : 'tab'}
    />
  ));
  return (
    <Toolbar>
      {asLinks
        ? <nav className="cc-toolbar-list" aria-label={'Sections'}>{items}</nav>
        : <div className="cc-toolbar-list" role="tablist" aria-label={'Sections'}>{items}</div>}
      {trailing && <><div className="cc-toolbar-fill" />{trailing}</>}
    </Toolbar>
  );
}
