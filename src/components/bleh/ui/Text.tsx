import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router';
import {
  CheckFilled, CloseFilled, DownloadFilled, InformationFilled, RightFilled, ArrowRightUpFilled, WarningFilled,
} from '@mingcute/react/core-filled';
import { cn } from '../../../lib/cn';

interface SeeMoreProps {
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  to?: string;
  href?: string;
  external?: boolean;
  /** Icon placed before the label (replaces the trailing chevron). */
  iconLeft?: ReactNode;
  className?: string;
}

/** Accent text link with a trailing 12px chevron: "View all alerts ›". */
export function SeeMore({ children, onClick, to, href, external, iconLeft, className }: SeeMoreProps) {
  const body = (
    <>
      {iconLeft}
      {children}
      {!iconLeft && (external ? <ArrowRightUpFilled /> : <RightFilled />)}
    </>
  );
  const common = { className: cn('ui-seemore', className), 'data-left': iconLeft ? '' : undefined, 'data-external': external ? '' : undefined, onClick };
  if (to) return <Link {...common} to={to}>{body}</Link>;
  if (href) {
    return <a {...common} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>{body}</a>;
  }
  return <button type="button" {...common}>{body}</button>;
}

export function SeeMoreGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-seemore-group', className)} {...props} />;
}

/** Section header: 16/20 medium c1 with a 14px accent icon. `small` = 14px/16px icon. */
export function PanelHead({ icon, children, small, action, className }: {
  icon?: ReactNode; children: ReactNode; small?: boolean; action?: ReactNode; className?: string;
}) {
  return (
    <h4 className={cn('ui-panelhead', className)} data-small={small ? '' : undefined}>
      {icon && <span className="ui-panelhead-icon">{icon}</span>}
      {children}
      {action && <span className="ui-panelhead-action">{action}</span>}
    </h4>
  );
}

/** Muted 14px line; wrap the emphasised part in <strong>. */
export function SubText({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-subtext', className)} {...props} />;
}

/** 13px muted note under a group. */
export function CardTip({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('ui-cardtip', className)} {...props} />;
}

type AlertTone = 'default' | 'info' | 'warning' | 'error' | 'success' | 'update';

const alertDefaults: Record<AlertTone, { icon: ReactNode; hue?: string }> = {
  default: { icon: <InformationFilled /> },
  info: { icon: <InformationFilled /> },
  warning: { icon: <WarningFilled />, hue: 'hue-warn' },
  error: { icon: <CloseFilled />, hue: 'hue-neg' },
  success: { icon: <CheckFilled />, hue: 'hue-pos' },
  update: { icon: <DownloadFilled />, hue: 'hue-pos' },
};

/** Inline chip alert: k4/15% wash, 13px medium text. */
export function InlineAlert({ tone = 'default', icon, children, className }: {
  tone?: AlertTone; icon?: ReactNode; children: ReactNode; className?: string;
}) {
  const d = alertDefaults[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('ui-alert', d.hue, className)} data-tone={tone}>
      {icon ?? d.icon}
      <span>{children}</span>
    </div>
  );
}
