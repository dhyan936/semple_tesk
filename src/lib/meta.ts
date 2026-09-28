import type { Priority, ProjectColor, SortKey, Status, ViewKey } from '../types';

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export const STATUSES: { value: Status; label: string }[] = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

export const statusLabel = (s: Status) => STATUSES.find((x) => x.value === s)!.label;
export const priorityLabel = (p: Priority) => PRIORITIES.find((x) => x.value === p)!.label;

export const VIEWS: { key: ViewKey; label: string; hint: string }[] = [
  { key: 'all', label: 'All tasks', hint: 'Everything, in one place' },
  { key: 'today', label: 'Today', hint: 'What needs your attention now' },
  { key: 'upcoming', label: 'Upcoming', hint: 'Scheduled for the days ahead' },
  { key: 'overdue', label: 'Overdue', hint: 'Past their due date' },
  { key: 'completed', label: 'Completed', hint: 'Work you have finished' },
];

export const SORTS: { value: SortKey; label: string }[] = [
  { value: 'due', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Created date' },
  { value: 'alpha', label: 'A to Z' },
];

export const PROJECT_COLORS: ProjectColor[] = ['iris', 'teal', 'amber', 'rose', 'sky', 'lime', 'violet', 'orange'];

export const BOARD_GROUPS: { value: 'status' | 'priority' | 'assignee'; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
];

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : parts[0][1] ?? '';
  return (first + last).toUpperCase();
}

/** A stable color per member, so the same person always looks the same. */
export function memberColor(id: string): ProjectColor {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length];
}
