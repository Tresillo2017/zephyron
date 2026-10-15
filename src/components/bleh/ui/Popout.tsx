import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../lib/cn';
import { computePosition, type Align, type Side } from './position';
import { PopoutContext } from './popoutContext';
import { mergeRefs } from './presence';

export { usePopout } from './usePopout'; // compat for imports from './ui/Popout'

const OFFSET = 10;
const TYPEAHEAD_RESET_MS = 700;
const ITEMS = '[role^="menuitem"]:not(:disabled):not([aria-disabled="true"])';

interface PopoutProps {
  /** Trigger rect; nothing renders until it is known. */
  rect: DOMRect | null;
  menuRef: RefObject<HTMLDivElement | null>;
  width?: number;
  /** false plays the 200ms exit (keep it mounted until usePopout's `mounted` drops). */
  open?: boolean;
  onClose?: () => void;
  align?: Align;
  /** Gap to the trigger (default 10; a cursor-anchored menu uses a few px). */
  offset?: number;
  className?: string;
  children: ReactNode;
}

/**
 * bleh menu: glass, 14px radius, anchored 10px below its trigger (flips up when short on
 * room, shifts to stay 6px inside the viewport), solarium_menu in / 200ms fade out.
 */
export function Popout({ rect, menuRef, width = 230, open = true, onClose, align = 'start', offset = OFFSET, className, children }: PopoutProps) {
  const own = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number; side: Side } | null>(null);
  const typed = useRef({ text: '', at: 0 });

  useLayoutEffect(() => {
    const el = own.current;
    if (!el || !rect || !open) return;
    const next = computePosition(
      { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      { width: el.offsetWidth, height: el.offsetHeight },
      { side: 'bottom', align, offset, padding: 6 },
    );
    setPlace(prev => (prev && prev.left === next.left && prev.top === next.top && prev.side === next.side ? prev : next));
  }, [rect, open, align, offset, width, children]);

  const hasRect = rect !== null;
  useEffect(() => {
    if (!open || !hasRect) return;
    const el = own.current;
    const target = el?.querySelector<HTMLElement>(`${ITEMS}[aria-checked="true"]`) ?? el?.querySelector<HTMLElement>(ITEMS);
    target?.focus({ preventScroll: true });
  }, [open, hasRect]);

  if (!rect) return null;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>(ITEMS)];
    if (!items.length) return;
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key !== ' ' || typed.current.text)) {
      const now = Date.now();
      const text = (now - typed.current.at > TYPEAHEAD_RESET_MS ? '' : typed.current.text) + e.key.toLowerCase();
      typed.current = { text, at: now };
      const label = (el: HTMLElement) => (el.textContent ?? '').trim().toLowerCase();
      (items.find(el => label(el).startsWith(text)) ?? items.find(el => label(el).includes(text)))?.focus();
      e.preventDefault();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1
      : e.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
    items[next].focus();
  };

  const style: CSSProperties = { left: place?.left ?? -9999, top: place?.top ?? -9999, width, maxWidth: 'calc(100vw - 12px)' };
  return createPortal(
    <PopoutContext value={{ close: onClose ?? (() => {}) }}>
      <div
        ref={mergeRefs(menuRef, own)}
        role="menu"
        data-state={open ? 'open' : 'closed'}
        data-side={place?.side ?? 'bottom'}
        onKeyDown={onKeyDown}
        className={cn('ui-menu glass-menu', className)}
        style={style}
      >
        {children}
      </div>
    </PopoutContext>,
    document.body
  );
}
