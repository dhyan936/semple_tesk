import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { focusableIn, useLayer } from '../lib/layers';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  variant?: 'dialog' | 'sheet';
  className?: string;
  /** Selector for the element to focus on open; defaults to the first focusable. */
  initialFocus?: string;
  children: ReactNode;
}

const EXIT_MS = 180;

/** Accessible modal surface: centered dialog or side sheet, with focus trap and exit animation. */
export function Modal({ open, onClose, labelledBy, variant = 'dialog', className = '', initialFocus, children }: ModalProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement;
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = window.setTimeout(() => {
        setMounted(false);
        setClosing(false);
        returnFocus.current?.focus?.();
      }, EXIT_MS);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;
    const panel = panelRef.current;
    if (!panel) return;
    const target = (initialFocus && panel.querySelector<HTMLElement>(initialFocus)) || focusableIn(panel)[0] || panel;
    target.focus({ preventScroll: true });
  }, [open, mounted, initialFocus]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  useLayer(onClose, open);

  if (!mounted) return null;

  const trapTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = focusableIn(panelRef.current);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className={`modal-root modal-root--${variant}${closing ? ' is-closing' : ''}`}>
      <div className="modal-backdrop" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`modal modal--${variant} ${className}`}
        onKeyDown={trapTab}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
