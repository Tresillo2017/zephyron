import { CheckFilled, CloseFilled } from '@mingcute/react/core-filled';
import { cn } from '../../../lib/cn';

/** 34x20 pill, 14px knob. `withIcon` shows an x / check glyph in the knob. */
export function Switch({ checked, onChange, label, disabled, withIcon, className }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; withIcon?: boolean; className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('ui-btn ui-switch', className)}
      data-glyph={withIcon ? '' : undefined}
    >
      <span className="ui-switch-knob">
        {withIcon && (checked ? <CheckFilled className="ui-switch-glyph" /> : <CloseFilled className="ui-switch-glyph" />)}
      </span>
    </button>
  );
}
