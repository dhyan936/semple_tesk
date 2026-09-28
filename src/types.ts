export type Priority = 'low' | 'medium' | 'high';
export type Status = 'todo' | 'in_progress' | 'completed';
export type ViewKey = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
export type SortKey = 'due' | 'priority' | 'created' | 'alpha';
export type ThemePref = 'light' | 'dark' | 'system';
export type LayoutMode = 'list' | 'board';
export type BoardGroup = 'status' | 'priority' | 'assignee';

export type ProjectColor = 'iris' | 'teal' | 'amber' | 'rose' | 'sky' | 'lime' | 'violet' | 'orange';

export interface Project {
  id: string;
  name: string;
  color: ProjectColor;
  createdAt: number;
}

export interface Member {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  color: ProjectColor;
  members: Member[];
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  /** Local calendar date, `YYYY-MM-DD`. */
  dueDate: string | null;
  priority: Priority;
  status: Status;
  projectId: string | null;
  /** A team member's id, or null when unassigned. */
  assigneeId: string | null;
  createdAt: number;
  completedAt: number | null;
}

/** Project and assignee filters accept an id, `'none'` for unset, or null for any. */
export interface Filters {
  project: string | null;
  priority: Priority | null;
  status: Status | null;
  assignee: string | null;
  team: string | null;
}

export type TaskDraft = Omit<Task, 'id' | 'createdAt' | 'completedAt'>;
