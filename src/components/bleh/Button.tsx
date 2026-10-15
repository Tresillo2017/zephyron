import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, MouseEventHandler, ReactNode, Ref } from 'react';
import { Link } from 'react-router';
import { cn } from '../../lib/cn';
import { Spinner } from './ui/Spinner';

export type ButtonAppearance =
  | 'default' | 'primary' | 'danger' | 'danger-primary' | 'ghost' | 'subtle' | 'accented' | 'sponsor';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  appearance?: ButtonAppearance;
  /** Accessible name (also the visible text). */
  label: string;
  htmlButtonType?: 'button' | 'submit';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  to?: string;
  href?: string;
  ref?: Ref<HTMLButtonElement>;
}

const hueClass: Partial<Record<ButtonAppearance, string>> = {
  danger: 'hue-neg',
  'danger-primary': 'hue-neg',
  sponsor: 'hue-sponsor',
};

/**
 * bleh button: 28px, 9px radius, b3 fill that darkens on hover (snapping on, easing out),
 * press scale .98. Primary = accent fill with black text. `to`/`href` render a link.
 */
export function Button({
  appearance = 'default', label, htmlButtonType, size = 'md', icon, iconRight, loading,
  to, href, className, children, ...props
}: ButtonProps) {
  const cls = cn('ui-btn', hueClass[appearance], className);
  const content = loading ? (
    <>
      <Spinner />
      {'Loading'}
    </>
  ) : (
    <>
      {children}
      {icon}
      {label}
      {iconRight}
    </>
  );

  if (to || href) {
    const { type: _type, disabled, onClick, ref, ...buttonRest } = props;
    const rest = buttonRest as unknown as AnchorHTMLAttributes<HTMLAnchorElement>;
    const inert = disabled || loading;
    const common = {
      ...rest,
      ref: ref as Ref<HTMLAnchorElement>,
      className: cls,
      'data-appearance': appearance,
      'data-size': size,
      'data-loading': loading ? 'true' : undefined,
      'aria-label': label,
      'aria-disabled': inert || undefined,
      tabIndex: inert ? -1 : rest.tabIndex,
      onClick: (e: MouseEvent<HTMLAnchorElement>) => {
        if (inert) { e.preventDefault(); return; }
        (onClick as MouseEventHandler<HTMLAnchorElement> | undefined)?.(e);
      },
    };
    if (to) return <Link {...common} to={to}>{content}</Link>;
    return <a {...common} href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{content}</a>;
  }

  const nativeType = htmlButtonType ?? (props.type as 'button' | 'submit' | undefined) ?? 'button';
  return (
    <button
      {...props}
      type={nativeType}
      className={cls}
      data-appearance={appearance}
      data-size={size}
      data-loading={loading ? 'true' : undefined}
      aria-busy={loading || undefined}
      aria-label={loading ? label : undefined}
    >
      {content}
    </button>
  );
}
