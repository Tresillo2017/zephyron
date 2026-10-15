import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Link } from 'react-router';

export type InteractiveProps = Omit<ComponentPropsWithoutRef<'button'>, 'type' | 'children'> & {
  to?: string;
  href?: string;
  children?: ReactNode;
};

/** Renders a router Link when `to`, an anchor when `href`, otherwise a button. */
export function Interactive({ to, href, children, ...rest }: InteractiveProps) {
  if (to) return <Link to={to} {...(rest as ComponentPropsWithoutRef<'a'>)}>{children}</Link>;
  if (href) return <a href={href} {...(rest as ComponentPropsWithoutRef<'a'>)}>{children}</a>;
  return <button type="button" {...rest}>{children}</button>;
}
