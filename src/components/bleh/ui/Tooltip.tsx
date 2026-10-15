import {
  cloneElement, isValidElement, useCallback, useId, useLayoutEffect, useRef, useState,
  type FocusEvent, type PointerEvent, type ReactElement, type ReactNode, type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../lib/cn';
import { computePosition, boxOf, type Side } from './position';
import { mergeRefs, usePresence } from './presence';

const EXIT_MS = 200;

type TriggerProps = {
  ref?: Ref<HTMLElement>;
  'aria-describedby'?: string;
  onPointerEnter?: (e: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (e: PointerEvent<HTMLElement>) => void;
  onPointerDown?: (e: PointerEvent<HTMLElement>) => void;
  onFocus?: (e: FocusEvent<HTMLElement>) => void;
  onBlur?: (e: FocusEvent<HTMLElement>) => void;
};

interface TooltipProps {
  content: ReactNode;
  /** Second, muted line (12px c3). */
  sub?: ReactNode;
  placement?: Side;
  disabled?: boolean;
  className?: string;
  children: ReactElement;
}

/**
 * bleh glass tooltip: portal, top by default (flips/shifts), 2px offset, no arrow,
 * 200ms fade + 2px slide in both directions. Shows on hover and keyboard focus.
 */
export function Tooltip({ content, sub, placement = 'top', disabled, className, children }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; side: Side } | null>(null);
  const active = open && !disabled && content != null && content !== '';
  const { mounted, visible } = usePresence(active, EXIT_MS);

  useLayoutEffect(() => {
    if (!mounted) return;
    const update = () => {
      const a = anchorRef.current, t = tipRef.current;
      if (!a || !t || !a.isConnected) return;
      setPos(computePosition(boxOf(a), { width: t.offsetWidth, height: t.offsetHeight }, { side: placement, offset: 2, padding: 6 }));
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [mounted, placement, content, sub]);

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  if (!isValidElement<TriggerProps>(children)) return children;
  const p = children.props;
  const trigger = cloneElement(children, {
    ref: mergeRefs(p.ref, (n: HTMLElement | null) => { anchorRef.current = n; }),
    'aria-describedby': active ? cn(p['aria-describedby'], id) : p['aria-describedby'],
    onPointerEnter: e => { p.onPointerEnter?.(e); if (e.pointerType !== 'touch') show(); },
    onPointerLeave: e => { p.onPointerLeave?.(e); hide(); },
    onPointerDown: e => { p.onPointerDown?.(e); hide(); },
    onFocus: e => { p.onFocus?.(e); if (e.currentTarget.matches(':focus-visible')) show(); },
    onBlur: e => { p.onBlur?.(e); hide(); },
  });

  return (
    <>
      {trigger}
      {mounted && createPortal(
        <div
          ref={tipRef}
          id={id}
          role="tooltip"
          data-state={visible ? 'open' : 'closed'}
          data-side={pos?.side ?? placement}
          className={cn('ui-tooltip glass-tooltip', className)}
          style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
        >
          {content}
          {sub != null && <span className="ui-tooltip-sub">{sub}</span>}
        </div>,
        document.body
      )}
    </>
  );
}
