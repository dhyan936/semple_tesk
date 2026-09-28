import { useCallback, useRef, useState } from 'react';
import { CalendarDays, CalendarX2, Sofa, Sun, Sunrise, ArrowRight } from 'lucide-react';
import { Popover } from './Popover';
import { addDays, describeDue, nextWeek, parseISODate, thisWeekend } from '../lib/date';

interface DuePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  today: string;
  triggerClassName?: string;
  /** Show "Due date" instead of nothing when empty. */
  placeholder?: string;
}

export function DuePicker({ value, onChange, today, triggerClassName = 'chip', placeholder = 'Due date' }: DuePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const due = value ? describeDue(value, today) : null;

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const pick = (v: string | null) => {
    onChange(v);
    close();
  };

  const presets = [
    { label: 'Today', icon: Sun, value: today },
    { label: 'Tomorrow', icon: Sunrise, value: addDays(today, 1) },
    { label: 'This weekend', icon: Sofa, value: thisWeekend(today) },
    { label: 'Next week', icon: ArrowRight, value: nextWeek(today) },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        data-tone={due?.tone}
        data-open={open || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={due ? `Due ${due.label}. Change due date` : 'Set due date'}
        onClick={() => setOpen((o) => !o)}
      >
        <CalendarDays size={14} />
        <span>{due ? due.label : placeholder}</span>
      </button>
      <Popover anchorRef={triggerRef} open={open} onClose={close} className="menu due-menu">
        <div className="menu__heading">Due date</div>
        <div className="menu__list" role="group" aria-label="Quick dates">
          {presets.map((p) => {
            const Icon = p.icon;
            return (
              <button key={p.label} type="button" className="menu__item" onClick={() => pick(p.value)} autoFocus={p.label === 'Today'}>
                <span className="menu__icon">
                  <Icon size={14} />
                </span>
                <span className="menu__label">{p.label}</span>
                <span className="menu__meta">{parseISODate(p.value).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</span>
              </button>
            );
          })}
        </div>
        <div className="due-menu__custom">
          <label className="due-menu__label" htmlFor="due-custom">
            Pick a date
          </label>
          <input
            id="due-custom"
            type="date"
            className="input input--sm"
            value={value ?? ''}
            onChange={(e) => e.target.value && onChange(e.target.value)}
          />
        </div>
        {value && (
          <button type="button" className="menu__item menu__item--danger" onClick={() => pick(null)}>
            <span className="menu__icon">
              <CalendarX2 size={14} />
            </span>
            <span className="menu__label">Remove date</span>
          </button>
        )}
      </Popover>
    </>
  );
}
