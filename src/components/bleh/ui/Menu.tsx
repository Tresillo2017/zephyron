import { use, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../../../lib/cn';
import { CheckFilled, RightFilled } from '@mingcute/react/core-filled';
import { PopoutContext } from './popoutContext';

interface MenuItemProps {
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  to?: string;
  /** true/false makes it a radio-like item with a check; undefined = plain item. */
  selected?: boolean;
  tone?: 'default' | 'accent' | 'danger';
  trailing?: ReactNode;
  disabled?: boolean;
  /** Reserve the leading icon slot even without an icon (aligns select options). */
  indent?: boolean;
  /** Opens a nested menu: shows a chevron. */
  submenu?: boolean;
  /** Don't close the surrounding Popout after the click. */
  keepOpen?: boolean;
  className?: string;
}

/** bleh menu row: 28px, 10px radius, hover b4/40%. Selected shows a check and the accent tint. */
export function MenuItem({
  icon, label, description, onClick, to, selected, tone = 'default', trailing, disabled,
  indent, submenu, keepOpen, className,
}: MenuItemProps) {
  const popout = use(PopoutContext);
  const lead = selected ? <CheckFilled /> : icon;
  const body = (
    <>
      {(lead || indent) && <span className="ui-menu-lead">{lead}</span>}
      <span className="ui-menu-body">
        <span>{label}</span>
        {description && <span className="ui-menu-desc">{description}</span>}
      </span>
      {trailing && <span className="ui-menu-trailing">{trailing}</span>}
      {submenu && <RightFilled className="ui-menu-trailing" style={{ width: 12, height: 12, padding: 0 }} />}
    </>
  );
  const handle = (e: MouseEvent<HTMLElement>) => {
    if (disabled) { e.preventDefault(); return; }
    onClick?.(e);
    if (!keepOpen) popout?.close();
  };
  const common = {
    className: cn('ui-btn ui-menu-item', tone === 'danger' && 'hue-neg', className),
    'data-tone': tone,
    role: selected === undefined ? 'menuitem' : 'menuitemradio',
    'aria-checked': selected,
    onClick: handle,
  };
  if (to && !disabled) return <Link {...common} to={to}>{body}</Link>;
  return <button type="button" {...common} disabled={disabled}>{body}</button>;
}

export function MenuSeparator() {
  return <div role="separator" className="ui-menu-sep" />;
}

export function MenuHeader({ children }: { children: ReactNode }) {
  return <div className="ui-menu-header">{children}</div>;
}
