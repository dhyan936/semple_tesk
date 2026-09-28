import { Plus, SearchX } from 'lucide-react';
import type { ViewKey } from '../types';

const COPY: Record<ViewKey | 'project', { title: string; body: string }> = {
  all: { title: 'A clean slate', body: 'Capture your first task above. Give it a project, a priority and a due date when you are ready.' },
  today: { title: 'Nothing due today', body: 'Enjoy the space, or pull something forward by giving it today’s date.' },
  upcoming: { title: 'Nothing scheduled ahead', body: 'Tasks with a future due date show up here, soonest first.' },
  overdue: { title: 'You are all caught up', body: 'No task has slipped past its due date. Keep it that way.' },
  completed: { title: 'No finished tasks yet', body: 'Tick the circle next to a task to complete it. Finished work collects here.' },
  project: { title: 'This project is empty', body: 'Add the first task for this project using the field above.' },
};

export function EmptyState({
  view,
  filtered,
  onClear,
  onCreate,
}: {
  view: ViewKey | 'project';
  filtered: boolean;
  onClear: () => void;
  onCreate: () => void;
}) {
  if (filtered) {
    return (
      <div className="empty">
        <div className="empty__art empty__art--search" aria-hidden>
          <SearchX size={22} />
        </div>
        <h3 className="empty__title">No matching tasks</h3>
        <p className="empty__body">Nothing here matches your search or filters. Try a different word or clear them.</p>
        <button className="btn btn--secondary" onClick={onClear}>
          Clear search and filters
        </button>
      </div>
    );
  }

  const copy = COPY[view];
  return (
    <div className="empty">
      <div className={`empty__art empty__art--${view}`} aria-hidden>
        <svg viewBox="0 0 64 64">
          <rect className="empty__card empty__card--back" x="14" y="10" width="36" height="44" rx="8" />
          <rect className="empty__card" x="10" y="16" width="44" height="40" rx="9" />
          <circle className="empty__check" cx="22" cy="30" r="4.5" />
          <rect className="empty__line" x="31" y="28" width="15" height="4" rx="2" />
          <circle className="empty__check" cx="22" cy="43" r="4.5" />
          <rect className="empty__line empty__line--short" x="31" y="41" width="10" height="4" rx="2" />
        </svg>
      </div>
      <h3 className="empty__title">{copy.title}</h3>
      <p className="empty__body">{copy.body}</p>
      {view !== 'completed' && view !== 'overdue' && (
        <button className="btn btn--secondary" onClick={onCreate}>
          <Plus size={15} />
          New task
        </button>
      )}
    </div>
  );
}
