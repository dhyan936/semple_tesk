import { AlertCircle, CheckCircle2, CircleDashed, Layers, Sun } from 'lucide-react';

export type StatKey = 'all' | 'today' | 'in_progress' | 'completed' | 'overdue';

export interface Stats {
  all: number;
  today: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

const CARDS: { key: StatKey; label: string; icon: typeof Layers }[] = [
  { key: 'all', label: 'All tasks', icon: Layers },
  { key: 'today', label: 'Due today', icon: Sun },
  { key: 'in_progress', label: 'In progress', icon: CircleDashed },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
  { key: 'overdue', label: 'Overdue', icon: AlertCircle },
];

/** Five at-a-glance counts; each card doubles as a shortcut to its view. */
export function Dashboard({
  stats,
  active,
  onSelect,
}: {
  stats: Stats;
  active: StatKey | null;
  onSelect: (key: StatKey) => void;
}) {
  return (
    <section className="stats" aria-label="Summary">
      {CARDS.map(({ key, label, icon: Icon }) => {
        const value = stats[key];
        const alert = key === 'overdue' && value > 0;
        return (
          <button
            key={key}
            className={`stat stat--${key}${active === key ? ' is-active' : ''}${alert ? ' is-alert' : ''}`}
            aria-pressed={active === key}
            onClick={() => onSelect(key)}
          >
            <span className="stat__top">
              <span className="stat__label">{label}</span>
              <span className="stat__icon" aria-hidden>
                <Icon size={15} />
              </span>
            </span>
            <span className="stat__value">{value}</span>
          </button>
        );
      })}
    </section>
  );
}

/** A thin ring showing the share of tasks completed. */
export function ProgressRing({ done, total, compact = false }: { done: number; total: number; compact?: boolean }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <div className={`progress${compact ? ' progress--compact' : ''}`} title={`${done} of ${total} tasks completed`}>
      <svg viewBox="0 0 36 36" aria-hidden>
        <circle className="progress__track" cx="18" cy="18" r={r} />
        <circle
          className="progress__bar"
          cx="18"
          cy="18"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      {compact ? (
        <span className="progress__pct">{pct}%</span>
      ) : (
        <div className="progress__text">
          <strong>{pct}%</strong>
          <span>
            {done} of {total} done
          </span>
        </div>
      )}
    </div>
  );
}
