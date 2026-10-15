import type { ButtonHTMLAttributes, Ref } from 'react';
import { cn } from '../../../lib/cn';
import { Tooltip } from './Tooltip';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: 'sm' | 'md';
  /** subtle = transparent (default), filled = the default b3 button. */
  variant?: 'subtle' | 'filled';
  /** Show the label as a glass tooltip (replaces the native title). */
  tooltip?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

/* sm = 28px chibi, md = 32px. aria-label carries the name; the tooltip is visual only. */
export function IconButton({ label, size = 'md', variant = 'subtle', tooltip = true, className, type = 'button', ...props }: Props) {
  const button = (
    <button
      type={type}
      aria-label={label}
      className={cn('ui-btn', className)}
      data-icon=""
      data-size={size === 'sm' ? undefined : 'lg'}
      data-appearance={variant === 'filled' ? 'default' : 'subtle'}
      {...props}
    />
  );
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
}
