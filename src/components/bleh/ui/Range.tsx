import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { cn } from '../../../lib/cn';
import { throttle } from './presence';

const THROTTLE_MS = 20;

interface RangeProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Throttled to one call per 20ms (with a trailing call) while dragging. */
  onChange: (v: number) => void;
  /** Fires on release / keyboard commit. */
  onCommit?: (v: number) => void;
  label: string;
  /** Readout text; default is the number trimmed to the step's precision. */
  format?: (v: number) => string;
  variant?: 'default' | 'hue';
  disabled?: boolean;
  className?: string;
}

const decimals = (step: number) => (String(step).split('.')[1] ?? '').length;

/** bleh slider: 6px track, h3 fill, vertical-pill nub (hollow glass while dragging) and a value readout. */
export function Range({ value, min, max, step = 1, onChange, onCommit, label, format, variant = 'default', disabled, className }: RangeProps) {
  const [local, setLocal] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) { setSeen(value); setLocal(value); }

  const latest = useRef({ onChange, onCommit });
  useEffect(() => { latest.current = { onChange, onCommit }; });
  const emit = useMemo(() => throttle((v: number) => latest.current.onChange(v), THROTTLE_MS), []);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = input.current;
    if (!el) return;
    const commit = () => { emit.flush(); latest.current.onCommit?.(Number(el.value)); };
    el.addEventListener('change', commit);
    return () => { el.removeEventListener('change', commit); emit.cancel(); };
  }, [emit]);

  const span = max - min;
  const p = span > 0 ? Math.min(1, Math.max(0, (local - min) / span)) : 0;
  const text = format ? format(local) : String(Number(local.toFixed(decimals(step))));

  return (
    <div
      className={cn('ui-range', className)}
      style={{ '--p': p } as CSSProperties}
      data-variant={variant}
      data-disabled={disabled ? '' : undefined}
    >
      <input
        ref={input}
        type="range"
        className="ui-range-input"
        aria-label={label}
        aria-valuetext={text}
        min={min}
        max={max}
        step={step}
        value={local}
        disabled={disabled}
        onChange={e => { const v = Number(e.target.value); setLocal(v); emit(v); }}
      />
      <div className="ui-range-track" aria-hidden>
        <div className="ui-range-fill" />
        <span className="ui-range-nub" />
      </div>
      <output className="ui-range-value">{text}</output>
    </div>
  );
}
