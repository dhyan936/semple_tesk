import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Popover } from './Popover';

export interface MenuOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Secondary text on the right, e.g. a member's team. */
  meta?: string;
}

interface SelectMenuProps<T extends string> {
  value: T;
  options: MenuOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name for the trigger and list, e.g. "Filter by priority". */
  label: string;
  heading?: string;
  trigger: ReactNode;
  triggerClassName?: string;
  align?: 'start' | 'end';
}

/** A keyboard-navigable single-select listbox behind a custom trigger. */
export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  label,
  heading,
  trigger,
  triggerClassName = 'chip',
  align = 'start',
}: SelectMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    requestAnimationFrame(() => listRef.current?.focus());
    // Only re-run when the menu opens.
  }, [open]);

  const choose = (v: T) => {
    onChange(v);
    close();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') setActive((i) => (i + 1) % options.length);
    else if (e.key === 'ArrowUp') setActive((i) => (i - 1 + options.length) % options.length);
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(options.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') choose(options[active].value);
    else if (e.key === 'Tab') setOpen(false);
    else return;
    if (e.key !== 'Tab') e.preventDefault();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        data-open={open || undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {trigger}
      </button>
      <Popover anchorRef={triggerRef} open={open} onClose={close} align={align} className="menu">
        {heading && <div className="menu__heading">{heading}</div>}
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onKeyDown}
          className="menu__list"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              className="menu__item"
              data-active={i === active || undefined}
              onPointerMove={() => setActive(i)}
              onClick={() => choose(o.value)}
            >
              {o.icon && <span className="menu__icon">{o.icon}</span>}
              <span className="menu__label">{o.label}</span>
              {o.meta && <span className="menu__meta">{o.meta}</span>}
              {o.value === value && <Check className="menu__check" size={14} strokeWidth={2.5} />}
            </li>
          ))}
        </ul>
      </Popover>
    </>
  );
}
