import { useEffect, useRef } from 'react';

/**
 * A stack of open layers (popovers, dialogs, the task panel). Escape closes only the
 * topmost one, and global shortcuts stay quiet while any layer is open.
 */
const stack: { current: () => void }[] = [];
let installed = false;

function install() {
  if (installed) return;
  installed = true;
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || stack.length === 0) return;
    e.preventDefault();
    stack[stack.length - 1].current();
  });
}

export const hasOpenLayer = () => stack.length > 0;

export function useLayer(onEscape: () => void, active = true) {
  const handler = useRef(onEscape);
  useEffect(() => {
    handler.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    install();
    const entry = handler;
    stack.push(entry);
    return () => {
      const i = stack.lastIndexOf(entry);
      if (i !== -1) stack.splice(i, 1);
    };
  }, [active]);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const focusableIn = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);

/** True when the keyboard is inside a text field, where single-key shortcuts must not fire. */
export function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}
