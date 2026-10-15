import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CloseFilled } from '@mingcute/react/core-filled';
import { cn } from '../../../lib/cn';
import { IconButton } from './IconButton';

interface ModalProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Small accent icon before the title. */
  icon?: ReactNode;
  /** Chrome-less: no panel, title or close button; children draw everything. */
  bare?: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Right-aligned action row (use FooterFill inside to split it). */
  footer?: ReactNode;
  width?: number;
  /** Hide the close button and ignore Escape/backdrop (e.g. while a request is in flight). */
  dismissable?: boolean;
  className?: string;
  /** Blur the page behind the scrim. */
  blur?: boolean;
}

const DEFAULT_CLOSE_MS = 350;
/** Open modals, newest last: only the top one reacts to Escape. */
const stack: symbol[] = [];

/**
 * bleh dialog: glass panel that rises 6px, scrim without blur, Escape / backdrop to close.
 * Mount it conditionally; it plays the exit before calling onClose.
 */
export function Modal({
  title, description, icon, bare, onClose, children, footer, width = 460, dismissable = true, className, blur,
}: ModalProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setOpen(true);
      if (!panel.current?.contains(document.activeElement)) panel.current?.focus({ preventScroll: true });
    });
    const returnTo = document.activeElement as HTMLElement | null;
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(timer.current);
      returnTo?.focus?.({ preventScroll: true });
    };
  }, []);

  const close = useCallback(() => {
    if (!dismissable || timer.current) return;
    setOpen(false);
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--modal-close-dur')) || DEFAULT_CLOSE_MS;
    timer.current = setTimeout(() => { timer.current = undefined; onClose(); }, ms);
  }, [onClose, dismissable]);

  useEffect(() => {
    const token = Symbol('modal');
    stack.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === token) close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(token), 1);
    };
  }, [close]);

  const state = open ? 'open' : 'closing';
  return createPortal(
    <div className="ui-modal-backdrop" data-state={state} data-blur={blur ? '' : undefined} onClick={close}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        data-state={state}
        data-bare={bare ? '' : undefined}
        onClick={e => e.stopPropagation()}
        className={cn('ui-modal outline-none', !bare && 'glass-dialog', className)}
        style={{ '--modal-width': `${width}px` } as CSSProperties}
      >
        {!bare && (title || description) && (
          <div className="ui-modal-title">
            {title && (
              <h2 id={titleId} className="ui-panelhead">
                {icon && <span className="ui-panelhead-icon">{icon}</span>}
                {title}
              </h2>
            )}
            {description && <p className="ui-modal-desc">{description}</p>}
          </div>
        )}
        {!bare && dismissable && (
          <IconButton size="sm" label={'Close'} onClick={close} className="ui-modal-close">
            <CloseFilled />
          </IconButton>
        )}
        {bare ? children : <div className="ui-modal-body">{children}</div>}
        {!bare && footer && <ModalFooter end>{footer}</ModalFooter>}
      </div>
    </div>,
    document.body
  );
}

/** Action row: space-between, 6px gap, wraps; stacks on mobile. `end` right-aligns. */
export function ModalFooter({ children, end, className }: { children: ReactNode; end?: boolean; className?: string }) {
  return <div className={cn('ui-modal-footer', className)} data-end={end ? '' : undefined}>{children}</div>;
}

/** Flexible spacer that pushes the following actions to the right. */
export function FooterFill() {
  return <div className="ui-footer-fill" />;
}
