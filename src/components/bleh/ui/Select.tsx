import {
  Fragment, useId, useLayoutEffect, type ReactElement, type ReactNode, type SelectHTMLAttributes,
} from 'react';
import { DownSmallFilled } from '@mingcute/react/core-filled';
import { cn } from '../../../lib/cn';
import { MenuHeader, MenuItem } from './Menu';
import { Popout } from './Popout';
import { usePopout } from './usePopout';

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
  /** Options with the same group are listed under a header, in first-seen order. */
  group?: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  label: string;
  variant?: 'default' | 'settings';
  /** Shown while no option matches `value`. */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  width?: number;
}

type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options?: undefined };

const MORE_THAN = 15;

function MenuSelect({ value, options, onChange, label, variant = 'default', placeholder, disabled, className, width = 230 }: SelectProps) {
  const popout = usePopout();
  const current = options.find(o => o.value === value);

  useLayoutEffect(() => {
    if (popout.open && options.length > MORE_THAN) {
      popout.menuRef.current?.querySelector('[aria-checked="true"]')?.scrollIntoView({ block: 'center' });
    }
  }, [popout.open, popout.menuRef, options.length]);

  const groups: (string | undefined)[] = [];
  for (const o of options) if (!groups.includes(o.group)) groups.push(o.group);
  const reserve = options.some(o => o.icon);

  return (
    <>
      <button
        ref={popout.btnRef}
        type="button"
        aria-label={label}
        disabled={disabled}
        className={cn('ui-btn ui-select', className)}
        data-variant={variant}
        {...popout.triggerProps}
        aria-haspopup="menu"
      >
        {current?.icon}
        <span className="ui-select-label">{current?.label ?? placeholder ?? ''}</span>
        <DownSmallFilled className="ui-select-chevron" />
      </button>
      {popout.mounted && (
        <Popout {...popout.popoutProps} width={width}>
          {groups.map(g => (
            <Fragment key={g ?? ''}>
              {g && <MenuHeader>{g}</MenuHeader>}
              {options.filter(o => o.group === g).map(o => (
                <MenuItem
                  key={o.value}
                  label={o.label}
                  icon={o.icon}
                  indent={reserve}
                  selected={o.value === value}
                  onClick={() => onChange(o.value)}
                />
              ))}
            </Fragment>
          ))}
        </Popout>
      )}
    </>
  );
}

/** Legacy native <select> (children as <option>), kept for forms that still pass them. */
function NativeSelect({ label, className, id, children, ...props }: NativeSelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && <label htmlFor={selectId} className="ui-field-label">{label}</label>}
      <select id={selectId} className={cn('ui-input ui-select-native', className)} {...props}>{children}</select>
    </div>
  );
}

/** bleh select button + glass menu (checked item scrolls into view past 15 options). */
export function Select(props: SelectProps): ReactElement;
export function Select(props: NativeSelectProps): ReactElement;
export function Select(props: SelectProps | NativeSelectProps) {
  return props.options ? <MenuSelect {...props} /> : <NativeSelect {...(props as NativeSelectProps)} />;
}
