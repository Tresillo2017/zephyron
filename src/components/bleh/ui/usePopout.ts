import { useCallback, useEffect, useRef, useState } from 'react';
import { usePresence } from './presence';

export const POPOUT_EXIT_MS = 200;

/**
 * Open/close state for a trigger + menu pair. Keeps the menu mounted for the 200ms exit
 * (`mounted`), tracks the trigger rect while open and exposes the trigger's aria props.
 *
 *   {mounted && <Popout {...popoutProps}>...</Popout>}
 */
export function usePopout() {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { mounted } = usePresence(open, POPOUT_EXIT_MS);

  const toggle = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    setOpen(v => !v);
  };
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const track = () => { if (btnRef.current) setRect(btnRef.current.getBoundingClientRect()); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation(); // keep an enclosing Modal open
      setOpen(false);
      btnRef.current?.focus();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', track, true);
    window.addEventListener('resize', track);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', track, true);
      window.removeEventListener('resize', track);
    };
  }, [open]);

  return {
    open, mounted, rect, btnRef, menuRef, toggle, close,
    triggerProps: { 'aria-expanded': open, 'aria-haspopup': 'menu' as const, onClick: toggle },
    popoutProps: { rect, menuRef, open, onClose: close },
  };
}
