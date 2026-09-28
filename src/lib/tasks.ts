import type { Filters, SortKey, Task, ViewKey } from '../types';
import { PRIORITY_RANK } from './meta';

export const isDone = (t: Task) => t.status === 'completed';
export const isOverdue = (t: Task, today: string) => !isDone(t) && !!t.dueDate && t.dueDate < today;
export const isDueToday = (t: Task, today: string) => !isDone(t) && t.dueDate === today;

export function matchesView(t: Task, view: ViewKey, today: string) {
  switch (view) {
    case 'all':
      return true;
    case 'today':
      return isDueToday(t, today);
    case 'upcoming':
      return !isDone(t) && !!t.dueDate && t.dueDate > today;
    case 'overdue':
      return isOverdue(t, today);
    case 'completed':
      return isDone(t);
  }
}

/** `teamMembers` holds the member ids of the team in `f.team`, when one is set. */
export function matchesFilters(t: Task, f: Filters, query: string, teamMembers?: Set<string>) {
  if (f.project === 'none' ? t.projectId !== null : f.project && t.projectId !== f.project) return false;
  if (f.assignee === 'none' ? t.assigneeId !== null : f.assignee && t.assigneeId !== f.assignee) return false;
  if (f.team && !(t.assigneeId && teamMembers?.has(t.assigneeId))) return false;
  if (f.priority && t.priority !== f.priority) return false;
  if (f.status && t.status !== f.status) return false;
  const q = query.trim().toLowerCase();
  if (q && !t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
  return true;
}

const compareDue = (a: Task, b: Task) => {
  if (a.dueDate === b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate < b.dueDate ? -1 : 1;
};

const comparators: Record<SortKey, (a: Task, b: Task) => number> = {
  due: (a, b) => compareDue(a, b) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.createdAt - a.createdAt,
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || compareDue(a, b),
  created: (a, b) => b.createdAt - a.createdAt,
  alpha: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
};

/** Sorts by the chosen key, always keeping finished work below open work. */
export function sortTasks(tasks: Task[], sort: SortKey) {
  return [...tasks].sort((a, b) => Number(isDone(a)) - Number(isDone(b)) || comparators[sort](a, b));
}

export function viewCounts(tasks: Task[], today: string): Record<ViewKey, number> {
  const counts = { all: tasks.length, today: 0, upcoming: 0, overdue: 0, completed: 0 };
  for (const t of tasks) {
    if (matchesView(t, 'today', today)) counts.today++;
    if (matchesView(t, 'upcoming', today)) counts.upcoming++;
    if (matchesView(t, 'overdue', today)) counts.overdue++;
    if (matchesView(t, 'completed', today)) counts.completed++;
  }
  return counts;
}
