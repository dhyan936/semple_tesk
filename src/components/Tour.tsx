import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Columns3,
  Filter,
  FolderOpen,
  Keyboard,
  LayoutDashboard,
  ListChecks,
  MousePointerClick,
  PartyPopper,
  PenLine,
  Plus,
  Search,
  Sparkles,
  SunMoon,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useLayer } from '../lib/layers';
import { Kbd } from './bits';

interface Shortcut {
  keys: string[];
  label: string;
}

interface TourStep {
  id: string;
  icon: typeof Sparkles;
  title: string;
  body: ReactNode;
  shortcuts?: Shortcut[];
  /** Candidate selectors; the first one visible on screen is spotlighted. None means a centered card. */
  target?: string[];
  /** The target lives in the sidebar, which is a drawer on smaller screens. */
  inSidebar?: boolean;
}

/** Every shortcut in the app, shown together on the last step. */
const ALL_SHORTCUTS: Shortcut[] = [
  { keys: ['N'], label: 'Quick add a task' },
  { keys: ['Shift', 'N'], label: 'New task with details' },
  { keys: ['J', 'K'], label: 'Move down / up the list' },
  { keys: ['Enter'], label: 'Open selected task' },
  { keys: ['X'], label: 'Complete or reopen' },
  { keys: ['Del'], label: 'Delete selected task' },
  { keys: ['1–5'], label: 'Switch view' },
  { keys: ['/'], label: 'Search' },
  { keys: ['B'], label: 'List or board' },
  { keys: ['P'], label: 'New project' },
  { keys: ['T'], label: 'Light or dark' },
  { keys: ['Ctrl', 'Enter'], label: 'Save in the editor' },
  { keys: ['?'], label: 'All shortcuts' },
  { keys: ['Esc'], label: 'Close or clear' },
];

function buildSteps(firstName: string): TourStep[] {
  return [
    {
      id: 'welcome',
      icon: Sparkles,
      title: `Welcome, ${firstName}`,
      body: 'This quick tour shows you everything Cadence can do, one feature at a time. It takes about a minute.',
      shortcuts: [
        { keys: ['→'], label: 'Next step' },
        { keys: ['←'], label: 'Previous step' },
        { keys: ['Esc'], label: 'Skip the tour' },
      ],
    },
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      title: 'Your work at a glance',
      body: 'Five live counts: all tasks, due today, in progress, completed and overdue. Click any card to jump straight to those tasks.',
      target: ['.stats'],
    },
    {
      id: 'quick-add',
      icon: Plus,
      title: 'Capture in seconds',
      body: 'Type a title and press Enter. As you type, chips appear to set the priority, due date, project and assignee before you add it.',
      shortcuts: [
        { keys: ['N'], label: 'Jump here from anywhere' },
        { keys: ['Enter'], label: 'Add the task' },
      ],
      target: ['.quick-add', '.board'],
    },
    {
      id: 'new-task',
      icon: PenLine,
      title: 'Add every detail',
      body: 'Open the full editor for a description, status, priority, due date, project and assignee. On phones, use the round + button.',
      shortcuts: [
        { keys: ['Shift', 'N'], label: 'Open a new task' },
        { keys: ['Ctrl', 'Enter'], label: 'Save' },
      ],
      target: ['.page-head__aside .btn--primary', '.fab'],
    },
    {
      id: 'task',
      icon: ListChecks,
      title: 'Work through your tasks',
      body: 'Click a task to open and edit it. Tick the circle to complete it; the circle’s color shows its priority, and overdue tasks get a red edge.',
      shortcuts: [
        { keys: ['J', 'K'], label: 'Move through tasks' },
        { keys: ['Enter'], label: 'Open' },
        { keys: ['X'], label: 'Complete or reopen' },
        { keys: ['Del'], label: 'Delete (asks first)' },
      ],
      target: ['.task', '.board-card'],
    },
    {
      id: 'views',
      icon: MousePointerClick,
      title: 'Five smart views',
      body: 'All tasks, Today, Upcoming, Overdue and Completed. Each shows a live count so you always know what needs attention.',
      shortcuts: [{ keys: ['1–5'], label: 'Switch view' }],
      target: ['nav[aria-label="Views"]'],
      inSidebar: true,
    },
    {
      id: 'projects',
      icon: FolderOpen,
      title: 'Organize by project',
      body: 'Group related tasks into projects with their own color and task count. Use the ••• menu on a project to rename or delete it.',
      shortcuts: [{ keys: ['P'], label: 'New project' }],
      target: ['[aria-labelledby="projects-heading"]'],
      inSidebar: true,
    },
    {
      id: 'teams',
      icon: Users,
      title: 'Work with a team',
      body: 'Create teams, add the people you work with, and assign any task to anyone. Open a team to see its members and their work.',
      target: ['[aria-labelledby="teams-heading"]'],
      inSidebar: true,
    },
    {
      id: 'search',
      icon: Search,
      title: 'Find anything',
      body: 'Search matches task titles and descriptions as you type.',
      shortcuts: [
        { keys: ['/'], label: 'Search' },
        { keys: ['Esc'], label: 'Clear' },
      ],
      target: ['.search'],
    },
    {
      id: 'filters',
      icon: Filter,
      title: 'Filter and sort',
      body: 'Narrow the list by project, priority, status or assignee, and sort by due date, priority, created date or A to Z. Clear resets everything.',
      target: ['.toolbar__filters'],
    },
    {
      id: 'board',
      icon: Columns3,
      title: 'Board view',
      body: 'Switch to a board and drag cards between columns grouped by status, priority or assignee. With the keyboard, press Space to lift a card and the arrow keys to move it.',
      shortcuts: [
        { keys: ['B'], label: 'List or board' },
        { keys: ['Space'], label: 'Lift or drop a card' },
      ],
      target: ['.layout-switch'],
    },
    {
      id: 'theme',
      icon: SunMoon,
      title: 'Progress and themes',
      body: 'The ring shows how much of your work is done. Cadence follows your device’s light or dark setting, and you can switch any time.',
      shortcuts: [{ keys: ['T'], label: 'Light or dark' }],
      target: ['.page-head__aside .progress', '.topbar .progress'],
    },
    {
      id: 'shortcuts',
      icon: Keyboard,
      title: 'Shortcuts and this tour',
      body: 'Every keyboard shortcut is listed here. You can also replay this tour from Product tour whenever you like.',
      shortcuts: [{ keys: ['?'], label: 'Show all shortcuts' }],
      target: ['.sidebar__footer .shortcut-hint'],
      inSidebar: true,
    },
    {
      id: 'account',
      icon: UserRound,
      title: 'Your account',
      body: 'You stay signed in when you refresh. Sign out here. Your tasks, projects and teams are saved in this browser.',
      target: ['.account'],
      inSidebar: true,
    },
    {
      id: 'done',
      icon: PartyPopper,
      title: 'You’re all set',
      body: 'Here is every shortcut in one place. Press ? any time to see them again.',
    },
  ];
}

const PAD = 8;
/** Phones dock the card at the bottom and scroll targets to just under the top bar. */
const PHONE = '(max-width: 610px)';
const PHONE_SCROLL_MARGIN = 76;
const GAP = 13;
const MARGIN = 13;

type Rect = { top: number; left: number; width: number; height: number };

function findTarget(selectors: string[] | undefined): HTMLElement | null {
  if (!selectors) return null;
  for (const sel of selectors) {
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && style.visibility !== 'hidden') return el;
    }
  }
  return null;
}

interface TourProps {
  open: boolean;
  userName: string;
  onFinish: (completed: boolean) => void;
  /** Opens or closes the sidebar drawer on smaller screens. */
  onSidebar: (open: boolean) => void;
}

/** A step-by-step spotlight tour of every feature and shortcut. */
export function Tour({ open, userName, onFinish, onSidebar }: TourProps) {
  const steps = useRef(buildSteps(userName.split(' ')[0])).current;
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pos, setPos] = useState<{ style: CSSProperties; dock: 'float' | 'top' | 'bottom' | 'center' }>({
    style: {},
    dock: 'center',
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  const finish = useCallback(
    (completed: boolean) => {
      onSidebar(false);
      onFinish(completed);
    },
    [onFinish, onSidebar],
  );

  useLayer(() => finish(false), open);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const measure = useCallback(() => {
    const el = targetRef.current;
    if (!el || !el.isConnected) return setRect(null);
    const r = el.getBoundingClientRect();
    let top = r.top - PAD;
    let height = r.height + PAD * 2;
    const card = cardRef.current;
    if (card && matchMedia(PHONE).matches) {
      // Dock the card on the side away from the target; targets pinned low (like the + button) get a top card.
      const cardSpace = card.offsetHeight + MARGIN + GAP;
      const dock = top + height > innerHeight - cardSpace && top > cardSpace ? 'top' : 'bottom';
      setPos({ style: {}, dock });
      // Trim a tall target so the spotlight never runs under the card.
      if (dock === 'bottom') height = Math.max(Math.min(height, innerHeight - cardSpace - top), 34);
      else {
        const bottom = top + height;
        top = Math.max(top, cardSpace);
        height = Math.max(bottom - top, 34);
      }
    }
    setRect({ top, left: r.left - PAD, width: r.width + PAD * 2, height });
  }, []);

  // Move to the step's target: open the drawer if needed, scroll it into view, then measure.
  useEffect(() => {
    if (!open) return;
    const small = matchMedia('(max-width: 987px)').matches;
    onSidebar(!!step.inSidebar && small);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers: number[] = [];
    timers.push(
      window.setTimeout(
        () => {
          const el = (targetRef.current = findTarget(step.target));
          if (el && matchMedia(PHONE).matches) {
            el.style.scrollMarginTop = `${PHONE_SCROLL_MARGIN}px`;
            el.scrollIntoView({ block: 'start', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
            timers.push(window.setTimeout(() => (el.style.scrollMarginTop = ''), 600));
          } else {
            el?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
          }
          measure();
          timers.push(window.setTimeout(measure, 380));
        },
        step.inSidebar && small ? 360 : 30,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [open, step, measure, onSidebar]);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const onChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [open, measure]);

  // Place the card next to the spotlight: beside it, below, above, or docked on small screens.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!open || !card) return;
    const vw = innerWidth;
    const vh = innerHeight;
    if (!rect) return setPos({ style: {}, dock: 'center' });
    if (matchMedia(PHONE).matches) return; // Docked by measure().
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const clampX = (x: number) => Math.max(MARGIN, Math.min(x, vw - w - MARGIN));
    const clampY = (y: number) => Math.max(MARGIN, Math.min(y, vh - h - MARGIN));
    const right = rect.left + rect.width + GAP;
    let style: CSSProperties;
    if (right + w <= vw - MARGIN && rect.width < vw * 0.382) {
      style = { left: right, top: clampY(rect.top) };
    } else if (rect.top + rect.height + GAP + h <= vh - MARGIN) {
      style = { left: clampX(rect.left), top: rect.top + rect.height + GAP };
    } else if (rect.top - GAP - h >= MARGIN) {
      style = { left: clampX(rect.left), top: rect.top - GAP - h };
    } else {
      style = { left: clampX(rect.left + rect.width / 2 - w / 2), top: clampY(vh - h - MARGIN) };
    }
    setPos({ style, dock: 'float' });
  }, [open, rect, index]);

  // Arrow keys step through; Escape is handled by the layer stack.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && !(e.target as HTMLElement).closest('button'))) {
        e.preventDefault();
        if (last) finish(true);
        else setIndex((i) => i + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, last, finish]);

  useEffect(() => {
    if (open) cardRef.current?.focus({ preventScroll: true });
  }, [open, index]);

  if (!open) return null;

  const Icon = step.icon;
  const spot: CSSProperties = rect
    ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    : { top: innerHeight / 2, left: innerWidth / 2, width: 0, height: 0 };

  return (
    <div className="tour" role="presentation">
      {/* Blocks clicks on the app while touring; the spotlight's shadow dims everything else. */}
      <div className="tour__blocker" />
      <div className={`tour__spot${rect ? '' : ' is-empty'}`} style={spot} aria-hidden />

      <div
        ref={cardRef}
        className={`tour__card tour__card--${pos.dock}${last ? ' tour__card--wide' : ''}`}
        style={pos.style}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
      >
        <div className="tour__progress" aria-hidden>
          <span style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="tour__content" key={step.id}>
          <div className="tour__head">
            <span className="tour__icon" aria-hidden>
              <Icon size={18} />
            </span>
            <span className="tour__count" aria-live="polite">
              Step {index + 1} of {steps.length}
            </span>
            <button className="icon-btn icon-btn--sm tour__close" onClick={() => finish(false)} aria-label="Skip the tour">
              <X size={15} />
            </button>
          </div>
          <h2 id="tour-title" className="tour__title">
            {step.title}
          </h2>
          <p id="tour-body" className="tour__body">
            {step.body}
          </p>

          {step.shortcuts && (
            <ul className="tour__keys">
              {step.shortcuts.map((s) => (
                <li key={s.label}>
                  <span className="tour__combo">
                    {s.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          )}

          {last && (
            <ul className="tour__all">
              {ALL_SHORTCUTS.map((s) => (
                <li key={s.label}>
                  <span className="tour__combo">
                    {s.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="tour__foot">
          <div className="tour__dots" aria-hidden>
            {steps.map((s, i) => (
              <span key={s.id} className={i === index ? 'is-current' : i < index ? 'is-done' : ''} />
            ))}
          </div>
          <div className="tour__nav">
            {index === 0 ? (
              <button className="btn btn--ghost btn--sm" onClick={() => finish(false)}>
                Skip
              </button>
            ) : (
              <button className="btn btn--ghost btn--sm" onClick={() => setIndex((i) => i - 1)}>
                <ArrowLeft size={14} />
                Back
              </button>
            )}
            <button
              className="btn btn--primary btn--sm tour__next"
              onClick={() => (last ? finish(true) : setIndex((i) => i + 1))}
            >
              {index === 0 ? 'Start tour' : last ? 'Start working' : 'Next'}
              {!last && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
