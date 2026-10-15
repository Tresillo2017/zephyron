import { CheckFilled } from '@mingcute/react/core-filled';
import { cn } from '../../../lib/cn';

interface RowProps {
  checked: boolean;
  label?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** 16px box; the check draws in from the bottom-left. The whole row is the hit target. */
export function Checkbox({ checked, onChange, label, disabled, className, 'aria-label': ariaLabel }: RowProps & { onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('ui-check-row', className)}
    >
      <span className="ui-check-box"><CheckFilled className="ui-check-glyph" /></span>
      {label}
    </button>
  );
}

/** 16px circle; checked shows a 4px accent ring. */
export function Radio({ checked, onChange, label, disabled, className, 'aria-label': ariaLabel }: RowProps & { onChange?: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      disabled={disabled}
      onClick={() => { if (!checked) onChange?.(); }}
      className={cn('ui-check-row', className)}
    >
      <span className="ui-check-box" />
      {label}
    </button>
  );
}
