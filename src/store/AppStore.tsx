import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { Member, Project, ProjectColor, Task, TaskDraft, Team } from '../types';
import { uid } from '../lib/id';
import { loadData, saveData, type PersistedData } from '../lib/storage';

type Action =
  | { type: 'task/add'; task: Task }
  | { type: 'task/update'; id: string; patch: Partial<TaskDraft> }
  | { type: 'task/delete'; id: string }
  | { type: 'task/restore'; task: Task }
  | { type: 'project/add'; project: Project }
  | { type: 'project/update'; id: string; patch: Partial<Pick<Project, 'name' | 'color'>> }
  | { type: 'project/delete'; id: string }
  | { type: 'team/add'; team: Team }
  | { type: 'team/update'; id: string; patch: Pick<Team, 'name' | 'color' | 'members'> }
  | { type: 'team/delete'; id: string };

/** Clears assignments that point at members who no longer exist. */
function unassignMissing(tasks: Task[], teams: Team[]) {
  const ids = new Set(teams.flatMap((t) => t.members.map((m) => m.id)));
  return tasks.map((t) => (t.assigneeId && !ids.has(t.assigneeId) ? { ...t, assigneeId: null } : t));
}

/** Keeps `completedAt` in step with the status field. */
function applyPatch(task: Task, patch: Partial<TaskDraft>): Task {
  const next = { ...task, ...patch };
  if (patch.status && patch.status !== task.status) {
    next.completedAt = patch.status === 'completed' ? Date.now() : null;
  }
  return next;
}

function reducer(state: PersistedData, action: Action): PersistedData {
  switch (action.type) {
    case 'task/add':
      return { ...state, tasks: [action.task, ...state.tasks] };
    case 'task/update':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? applyPatch(t, action.patch) : t)) };
    case 'task/delete':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'task/restore':
      return { ...state, tasks: [action.task, ...state.tasks.filter((t) => t.id !== action.task.id)] };
    case 'project/add':
      return { ...state, projects: [...state.projects, action.project] };
    case 'project/update':
      return {
        ...state,
        projects: state.projects.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
      };
    case 'project/delete':
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
        tasks: state.tasks.map((t) => (t.projectId === action.id ? { ...t, projectId: null } : t)),
      };
    case 'team/add':
      return { ...state, teams: [...state.teams, action.team] };
    case 'team/update': {
      const teams = state.teams.map((t) => (t.id === action.id ? { ...t, ...action.patch } : t));
      return { ...state, teams, tasks: unassignMissing(state.tasks, teams) };
    }
    case 'team/delete': {
      const teams = state.teams.filter((t) => t.id !== action.id);
      return { ...state, teams, tasks: unassignMissing(state.tasks, teams) };
    }
  }
}

function useStoreValue(userId: string) {
  const [state, dispatch] = useReducer(reducer, userId, loadData);

  useEffect(() => saveData(userId, state), [userId, state]);

  const actions = useMemo(
    () => ({
      addTask(draft: TaskDraft) {
        const task: Task = {
          ...draft,
          id: uid(),
          createdAt: Date.now(),
          completedAt: draft.status === 'completed' ? Date.now() : null,
        };
        dispatch({ type: 'task/add', task });
        return task;
      },
      updateTask: (id: string, patch: Partial<TaskDraft>) => dispatch({ type: 'task/update', id, patch }),
      deleteTask: (id: string) => dispatch({ type: 'task/delete', id }),
      restoreTask: (task: Task) => dispatch({ type: 'task/restore', task }),
      addProject(name: string, color: ProjectColor) {
        const project: Project = { id: uid(), name, color, createdAt: Date.now() };
        dispatch({ type: 'project/add', project });
        return project;
      },
      updateProject: (id: string, patch: Partial<Pick<Project, 'name' | 'color'>>) =>
        dispatch({ type: 'project/update', id, patch }),
      deleteProject: (id: string) => dispatch({ type: 'project/delete', id }),
      addTeam(name: string, color: ProjectColor, members: Member[]) {
        const team: Team = { id: uid(), name, color, members, createdAt: Date.now() };
        dispatch({ type: 'team/add', team });
        return team;
      },
      updateTeam: (id: string, patch: Pick<Team, 'name' | 'color' | 'members'>) =>
        dispatch({ type: 'team/update', id, patch }),
      deleteTeam: (id: string) => dispatch({ type: 'team/delete', id }),
    }),
    [],
  );

  return { ...state, ...actions };
}

type Store = ReturnType<typeof useStoreValue>;

const StoreContext = createContext<Store | null>(null);

/** Holds one user's tasks, projects and teams. Remount it (via `key`) when the user changes. */
export function AppStoreProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const store = useStoreValue(userId);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside AppStoreProvider');
  return store;
}
