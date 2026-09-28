import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Plus } from 'lucide-react';
import type { BoardGroup, Filters, LayoutMode, Member, Project, SortKey, Task, TaskDraft, Team, ThemePref, ViewKey } from './types';
import { useStore } from './store/AppStore';
import { useToast } from './store/Toasts';
import { useAuth } from './store/Auth';
import { addDays, daysBetween, greeting, parseISODate, todayISO } from './lib/date';
import { isDone, isOverdue, matchesFilters, matchesView, sortTasks, viewCounts } from './lib/tasks';
import { BOARD_GROUPS, PRIORITIES, PROJECT_COLORS, SORTS, STATUSES, VIEWS } from './lib/meta';
import { loadPref, savePref } from './lib/storage';
import { hasOpenLayer, isTyping } from './lib/layers';
import { Sidebar } from './components/Sidebar';
import { Dashboard, ProgressRing, type StatKey, type Stats } from './components/Dashboard';
import { Toolbar } from './components/Toolbar';
import { QuickAdd } from './components/QuickAdd';
import { TaskList, type TaskGroup } from './components/TaskList';
import { Board, type BoardColumn, type MemberInfo } from './components/Board';
import { EmptyState } from './components/EmptyState';
import { TaskPanel, type PanelState } from './components/TaskPanel';
import { ConfirmDialog, ProjectDialog, ShortcutsDialog, type ConfirmRequest, type ProjectDialogState } from './components/Dialogs';
import { TeamDialog, type TeamDialogState } from './components/TeamDialog';
import { Tour } from './components/Tour';
import { Avatar, AvatarStack, PriorityGlyph, ProjectDot } from './components/bits';

const NO_FILTERS: Filters = { project: null, priority: null, status: null, assignee: null, team: null };
const THEMES: ThemePref[] = ['light', 'dark', 'system'];

/** Splits a sorted list into readable sections. Date buckets apply when sorting by due date. */
function groupTasks(tasks: Task[], sort: SortKey, view: ViewKey, today: string): TaskGroup[] {
  const open = tasks.filter((t) => !isDone(t));
  const done = tasks.filter(isDone);
  const doneGroup: TaskGroup = { key: 'done', label: 'Completed', tone: 'done', tasks: done };

  if (view === 'today' || view === 'overdue' || view === 'completed') {
    return [{ key: 'all', label: VIEWS.find((v) => v.key === view)!.label, tasks }];
  }

  if (sort === 'due') {
    const buckets: TaskGroup[] = [
      { key: 'overdue', label: 'Overdue', tone: 'overdue', tasks: [] },
      { key: 'today', label: 'Today', tone: 'today', tasks: [] },
      { key: 'week', label: 'Next 7 days', tasks: [] },
      { key: 'later', label: 'Later', tasks: [] },
      { key: 'someday', label: 'No due date', tasks: [] },
    ];
    for (const t of open) {
      if (!t.dueDate) buckets[4].tasks.push(t);
      else if (isOverdue(t, today)) buckets[0].tasks.push(t);
      else if (t.dueDate === today) buckets[1].tasks.push(t);
      else if (daysBetween(today, t.dueDate) <= 7) buckets[2].tasks.push(t);
      else buckets[3].tasks.push(t);
    }
    return [...buckets, doneGroup].filter((g) => g.tasks.length > 0);
  }

  return [{ key: 'open', label: 'To do', tasks: open }, doneGroup].filter((g) => g.tasks.length > 0);
}

/** Builds board columns for the chosen grouping. Columns always show, even when empty, so there is somewhere to drop. */
function buildColumns(tasks: Task[], group: BoardGroup, people: MemberInfo[], showTeam: boolean): BoardColumn[] {
  if (group === 'status') {
    return STATUSES.map((s) => ({
      key: `status:${s.value}`,
      label: s.label,
      marker: <span className={`status-dot status-dot--${s.value}`} />,
      tasks: tasks.filter((t) => t.status === s.value),
      patch: { status: s.value },
    }));
  }
  if (group === 'priority') {
    return PRIORITIES.map((p) => ({
      key: `priority:${p.value}`,
      label: p.label,
      marker: <PriorityGlyph priority={p.value} />,
      tasks: tasks.filter((t) => t.priority === p.value),
      patch: { priority: p.value },
    }));
  }
  const ids = new Set(people.map((p) => p.member.id));
  return [
    {
      key: 'assignee:none',
      label: 'Unassigned',
      marker: <Avatar member={null} size="sm" />,
      // Tasks assigned outside the shown team also land here, so nothing disappears.
      tasks: tasks.filter((t) => !t.assigneeId || !ids.has(t.assigneeId)),
      patch: { assigneeId: null },
    },
    ...people.map(({ member, team }) => ({
      key: `assignee:${member.id}`,
      label: member.name,
      meta: showTeam ? team.name : undefined,
      marker: <Avatar member={member} size="sm" />,
      tasks: tasks.filter((t) => t.assigneeId === member.id),
      patch: { assigneeId: member.id },
    })),
  ];
}

export default function App() {
  const store = useStore();
  const toast = useToast();
  const { user, logout } = useAuth();
  const { tasks, projects, teams } = store;

  const [today, setToday] = useState(todayISO);
  const [view, setView] = useState<ViewKey>('all');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>(() => loadPref('sort', 'due', SORTS.map((s) => s.value)));
  const [theme, setTheme] = useState<ThemePref>(() => loadPref('theme', 'system', THEMES));
  const [layout, setLayout] = useState<LayoutMode>(() => loadPref('layout', 'list', ['list', 'board']));
  const [boardGroup, setBoardGroup] = useState<BoardGroup>(() =>
    loadPref('boardGroup', 'status', BOARD_GROUPS.map((g) => g.value)),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ mode: 'create'; defaults: TaskDraft } | { mode: 'edit'; id: string } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [projectDialog, setProjectDialog] = useState<ProjectDialogState>(null);
  const [teamDialog, setTeamDialog] = useState<TeamDialogState>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);

  // Roll "today" over at midnight or when the tab wakes up.
  useEffect(() => {
    const tick = () => setToday(todayISO());
    const id = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  useEffect(() => {
    savePref('theme', theme);
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  // First visit for this account: start the tour once the page has settled in.
  const tourKey = `tour:${user!.id}`;
  useEffect(() => {
    if (loadPref(tourKey, '', ['done']) === 'done') return;
    const t = window.setTimeout(() => setTourOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [tourKey]);

  const startTour = () => {
    setPanel(null);
    setNavOpen(false);
    setTourOpen(true);
  };

  const finishTour = useCallback(
    (completed: boolean) => {
      setTourOpen(false);
      savePref(tourKey, 'done');
      toast(completed ? 'You’re all set. Press ? any time for shortcuts.' : 'Tour skipped. Replay it any time from Product tour.', {
        tone: 'info',
      });
    },
    [tourKey, toast],
  );

  useEffect(() => savePref('sort', sort), [sort]);
  useEffect(() => savePref('layout', layout), [layout]);
  useEffect(() => savePref('boardGroup', boardGroup), [boardGroup]);

  // ── Derived data ────────────────────────────────────────────────
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const people: MemberInfo[] = useMemo(() => teams.flatMap((team) => team.members.map((member) => ({ member, team }))), [teams]);
  const memberMap = useMemo(() => new Map(people.map((p) => [p.member.id, p])), [people]);
  const counts = useMemo(() => viewCounts(tasks, today), [tasks, today]);

  const projectCounts = useMemo(() => {
    const out: Record<string, { total: number; open: number }> = {};
    for (const t of tasks) {
      if (!t.projectId) continue;
      out[t.projectId] ??= { total: 0, open: 0 };
      out[t.projectId].total++;
      if (!isDone(t)) out[t.projectId].open++;
    }
    return out;
  }, [tasks]);

  /** Open tasks per member, and per team. */
  const { memberOpen, teamOpen } = useMemo(() => {
    const memberOpen: Record<string, number> = {};
    const teamOpen: Record<string, number> = {};
    for (const t of tasks) {
      if (isDone(t) || !t.assigneeId) continue;
      const info = memberMap.get(t.assigneeId);
      if (!info) continue;
      memberOpen[info.member.id] = (memberOpen[info.member.id] ?? 0) + 1;
      teamOpen[info.team.id] = (teamOpen[info.team.id] ?? 0) + 1;
    }
    return { memberOpen, teamOpen };
  }, [tasks, memberMap]);

  const stats: Stats = useMemo(
    () => ({
      all: counts.all,
      today: counts.today,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: counts.completed,
      overdue: counts.overdue,
    }),
    [counts, tasks],
  );

  const activeTeam = view === 'all' && filters.team ? teams.find((t) => t.id === filters.team) ?? null : null;
  const teamMemberIds = useMemo(
    () => new Set(teams.find((t) => t.id === filters.team)?.members.map((m) => m.id) ?? []),
    [teams, filters.team],
  );

  const visible = useMemo(
    () =>
      sortTasks(
        tasks.filter((t) => matchesView(t, view, today) && matchesFilters(t, filters, query, teamMemberIds)),
        sort,
      ),
    [tasks, view, today, filters, query, sort, teamMemberIds],
  );
  const groups = useMemo(() => groupTasks(visible, sort, view, today), [visible, sort, view, today]);

  const boardPeople = useMemo(
    () => (activeTeam ? people.filter((p) => p.team.id === activeTeam.id) : people),
    [people, activeTeam],
  );
  // A team's assignee board also offers unassigned tasks, so they can be dragged onto a teammate.
  const boardTasks = useMemo(() => {
    if (!activeTeam || boardGroup !== 'assignee') return visible;
    const withoutTeam = { ...filters, team: null };
    return sortTasks(
      tasks.filter(
        (t) =>
          matchesView(t, view, today) &&
          matchesFilters(t, withoutTeam, query) &&
          (!t.assigneeId || teamMemberIds.has(t.assigneeId)),
      ),
      sort,
    );
  }, [activeTeam, boardGroup, visible, filters, tasks, view, today, query, teamMemberIds, sort]);

  const columns = useMemo(
    () => buildColumns(boardTasks, boardGroup, boardPeople, !activeTeam),
    [boardTasks, boardGroup, boardPeople, activeTeam],
  );
  const order = useMemo(
    () => (layout === 'board' ? columns.flatMap((c) => c.tasks) : groups.flatMap((g) => g.tasks)),
    [layout, columns, groups],
  );

  const activeProject =
    view === 'all' && !activeTeam && filters.project && filters.project !== 'none' ? projectMap.get(filters.project) ?? null : null;
  const isFiltered = !!(
    query.trim() ||
    filters.priority ||
    filters.status ||
    filters.assignee ||
    (filters.project && !activeProject)
  );

  const activeStat: StatKey | null = (() => {
    if (query || filters.project || filters.priority || filters.assignee || filters.team) return null;
    if (filters.status === 'in_progress' && view === 'all') return 'in_progress';
    if (filters.status) return null;
    return view === 'upcoming' ? null : view;
  })();

  const defaults: TaskDraft = {
    title: '',
    description: '',
    projectId: filters.project && filters.project !== 'none' ? filters.project : null,
    assigneeId: filters.assignee && filters.assignee !== 'none' ? filters.assignee : null,
    dueDate: view === 'today' ? today : view === 'upcoming' ? addDays(today, 1) : null,
    priority: filters.priority ?? 'medium',
    status: filters.status === 'in_progress' ? 'in_progress' : 'todo',
  };

  const panelState: PanelState = useMemo(() => {
    if (!panel) return null;
    if (panel.mode === 'create') return panel;
    const task = tasks.find((t) => t.id === panel.id);
    return task ? { mode: 'edit', task } : null;
  }, [panel, tasks]);

  // ── Navigation ──────────────────────────────────────────────────
  const selectView = useCallback((v: ViewKey) => {
    setView(v);
    setFilters(NO_FILTERS);
    setSelectedId(null);
    setNavOpen(false);
  }, []);

  const selectProject = (id: string) => {
    setView('all');
    setFilters({ ...NO_FILTERS, project: id });
    setSelectedId(null);
    setNavOpen(false);
  };

  const selectTeam = (id: string) => {
    setView('all');
    setFilters({ ...NO_FILTERS, team: id });
    setSelectedId(null);
    setNavOpen(false);
  };

  const selectStat = (key: StatKey) => {
    setQuery('');
    if (key === 'in_progress') {
      setView('all');
      setFilters({ ...NO_FILTERS, status: 'in_progress' });
    } else selectView(key);
  };

  const clearFilters = () => {
    setQuery('');
    setFilters({ ...NO_FILTERS, project: activeProject?.id ?? null, team: activeTeam?.id ?? null });
  };

  // ── Task actions ────────────────────────────────────────────────
  const showEverything = () => {
    setView('all');
    setFilters(NO_FILTERS);
    setQuery('');
  };

  const createTask = (draft: TaskDraft) => {
    const task = store.addTask(draft);
    const project = task.projectId ? projectMap.get(task.projectId) : null;
    const assignee = task.assigneeId ? memberMap.get(task.assigneeId)?.member : null;
    const shown = matchesView(task, view, today) && matchesFilters(task, filters, query, teamMemberIds);
    const where = project ? ` to ${project.name}` : '';
    const who = assignee ? `, assigned to ${assignee.name}` : '';
    toast(`Task added${where}${who}`, {
      action: shown ? undefined : { label: 'Show', onClick: showEverything },
    });
    setSelectedId(task.id);
    return task;
  };

  const { updateTask } = store;
  const toggleTask = useCallback(
    (task: Task) => {
      if (isDone(task)) {
        updateTask(task.id, { status: 'todo' });
        toast('Task reopened', { tone: 'info' });
      } else {
        const previous = task.status;
        updateTask(task.id, { status: 'completed' });
        toast('Task completed', { action: { label: 'Undo', onClick: () => updateTask(task.id, { status: previous }) } });
      }
    },
    [updateTask, toast],
  );

  const moveTask = useCallback(
    (task: Task, column: BoardColumn) => {
      const previous = Object.fromEntries(Object.keys(column.patch).map((k) => [k, task[k as keyof TaskDraft]]));
      updateTask(task.id, column.patch);
      const message =
        'assigneeId' in column.patch
          ? column.patch.assigneeId
            ? `Assigned to ${column.label}`
            : 'Task unassigned'
          : 'priority' in column.patch
            ? `Priority set to ${column.label}`
            : `Moved to ${column.label}`;
      toast(message, { action: { label: 'Undo', onClick: () => updateTask(task.id, previous) } });
    },
    [updateTask, toast],
  );

  const openTask = useCallback((task: Task) => {
    setSelectedId(task.id);
    setPanel({ mode: 'edit', id: task.id });
  }, []);

  const openCreate = () => setPanel({ mode: 'create', defaults });
  const addInColumn = (column: BoardColumn) => setPanel({ mode: 'create', defaults: { ...defaults, ...column.patch } });

  const requestDelete = (task: Task) =>
    setConfirm({
      title: 'Delete this task?',
      body: `“${task.title}” will be permanently removed.`,
      confirmLabel: 'Delete task',
      onConfirm: () => {
        store.deleteTask(task.id);
        setPanel((p) => (p?.mode === 'edit' && p.id === task.id ? null : p));
        toast('Task deleted', { tone: 'danger', action: { label: 'Undo', onClick: () => store.restoreTask(task) } });
      },
    });

  // ── Project actions ─────────────────────────────────────────────
  const submitProject = (name: string, color: Project['color']) => {
    if (projectDialog?.mode === 'edit') {
      store.updateProject(projectDialog.project.id, { name, color });
      toast('Project updated');
    } else {
      const p = store.addProject(name, color);
      selectProject(p.id);
      toast(`Project “${name}” created`);
    }
    setProjectDialog(null);
  };

  const newProject = () =>
    setProjectDialog({ mode: 'create', suggestedColor: PROJECT_COLORS[projects.length % PROJECT_COLORS.length] });

  const requestDeleteProject = (project: Project) => {
    const n = projectCounts[project.id]?.total ?? 0;
    setConfirm({
      title: `Delete “${project.name}”?`,
      body:
        n > 0
          ? `The project is removed. Its ${n} ${n === 1 ? 'task is' : 'tasks are'} kept and moved to No project.`
          : 'The project is removed. This cannot be undone.',
      confirmLabel: 'Delete project',
      onConfirm: () => {
        store.deleteProject(project.id);
        if (filters.project === project.id) setFilters(NO_FILTERS);
        toast('Project deleted', { tone: 'danger' });
      },
    });
  };

  // ── Team actions ────────────────────────────────────────────────
  const submitTeam = (name: string, color: Team['color'], members: Member[]) => {
    if (teamDialog?.mode === 'edit') {
      store.updateTeam(teamDialog.team.id, { name, color, members });
      // Drop an assignee filter that points at someone who was just removed.
      const removed = teamDialog.team.members.filter((m) => !members.some((x) => x.id === m.id));
      if (removed.some((m) => m.id === filters.assignee)) setFilters((f) => ({ ...f, assignee: null }));
      toast('Team updated');
    } else {
      const team = store.addTeam(name, color, members);
      selectTeam(team.id);
      toast(`Team “${name}” created`);
    }
    setTeamDialog(null);
  };

  const newTeam = () =>
    setTeamDialog({ mode: 'create', suggestedColor: PROJECT_COLORS[(teams.length + 3) % PROJECT_COLORS.length] });

  const requestDeleteTeam = (team: Team) => {
    const ids = new Set(team.members.map((m) => m.id));
    const n = tasks.filter((t) => t.assigneeId && ids.has(t.assigneeId)).length;
    setConfirm({
      title: `Delete “${team.name}”?`,
      body:
        n > 0
          ? `The team and its members are removed. ${n} assigned ${n === 1 ? 'task is' : 'tasks are'} kept and become unassigned.`
          : 'The team and its members are removed. No tasks are affected.',
      confirmLabel: 'Delete team',
      onConfirm: () => {
        store.deleteTeam(team.id);
        if (filters.team === team.id || (filters.assignee && ids.has(filters.assignee))) setFilters(NO_FILTERS);
        toast('Team deleted', { tone: 'danger' });
      },
    });
  };

  // ── Keyboard ────────────────────────────────────────────────────
  const focusRow = (id: string) => {
    setSelectedId(id);
    const row = document.querySelector<HTMLElement>(`[data-task-id="${CSS.escape(id)}"]`);
    const target = row?.classList.contains('board-card') ? row : row?.querySelector<HTMLElement>('.task__open');
    target?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  };

  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null;

  // The listener is attached once; it reads the latest state and actions through this ref.
  const keyContext = { order, selectedTask, theme, layout, openCreate, toggleTask, requestDelete, newProject };
  const keyRef = useRef(keyContext);
  useEffect(() => {
    keyRef.current = keyContext;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || hasOpenLayer() || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const { order, selectedTask: selected, theme, layout, ...act } = keyRef.current;
      const index = order.findIndex((t) => t.id === selected?.id);
      const move = (delta: number) => {
        if (order.length === 0) return;
        const next = index === -1 ? (delta > 0 ? 0 : order.length - 1) : Math.min(order.length - 1, Math.max(0, index + delta));
        focusRow(order[next].id);
      };

      const handlers: Record<string, () => void> = {
        n: () => (layout === 'board' ? act.openCreate() : quickAddRef.current?.focus()),
        N: act.openCreate,
        '/': () => searchRef.current?.focus(),
        '?': () => setShortcutsOpen(true),
        j: () => move(1),
        k: () => move(-1),
        ArrowDown: () => move(1),
        ArrowUp: () => move(-1),
        x: () => selected && act.toggleTask(selected),
        Delete: () => selected && act.requestDelete(selected),
        Backspace: () => selected && act.requestDelete(selected),
        b: () => setLayout((l) => (l === 'list' ? 'board' : 'list')),
        t: () => {
          const dark = document.documentElement.dataset.theme === 'dark';
          setTheme(theme === 'system' ? (dark ? 'light' : 'dark') : dark ? 'light' : 'dark');
        },
        p: act.newProject,
        Escape: () => {
          setSelectedId(null);
          setNavOpen(false);
          (document.activeElement as HTMLElement | null)?.blur();
        },
      };
      VIEWS.forEach((v, i) => (handlers[String(i + 1)] = () => selectView(v.key)));

      const handler = handlers[e.key];
      if (!handler) return;
      e.preventDefault();
      handler();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectView]);

  // ── Render ──────────────────────────────────────────────────────
  const viewMeta = VIEWS.find((v) => v.key === view)!;
  const title = activeProject?.name ?? activeTeam?.name ?? viewMeta.label;
  const subtitle = activeProject
    ? `${projectCounts[activeProject.id]?.open ?? 0} open · ${projectCounts[activeProject.id]?.total ?? 0} total`
    : activeTeam
      ? `${activeTeam.members.length} ${activeTeam.members.length === 1 ? 'member' : 'members'} · ${teamOpen[activeTeam.id] ?? 0} open tasks assigned`
      : viewMeta.hint;
  const dateLine = parseISODate(today).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to tasks
      </a>
      <Sidebar
        view={view}
        activeProject={activeProject?.id ?? null}
        activeTeam={activeTeam?.id ?? null}
        viewCounts={counts}
        projects={projects}
        projectCounts={projectCounts}
        teams={teams}
        teamCounts={teamOpen}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        onSelectView={selectView}
        onSelectProject={selectProject}
        onNewProject={newProject}
        onEditProject={(project) => setProjectDialog({ mode: 'edit', project })}
        onDeleteProject={requestDeleteProject}
        onSelectTeam={selectTeam}
        onNewTeam={newTeam}
        onEditTeam={(team) => setTeamDialog({ mode: 'edit', team })}
        onDeleteTeam={requestDeleteTeam}
        onShowShortcuts={() => setShortcutsOpen(true)}
        onStartTour={startTour}
        user={user!}
        onLogout={() => {
          logout();
          toast('Signed out', { tone: 'info' });
        }}
      />

      <main className={`main${layout === 'board' ? ' main--board' : ''}`} id="main">
        <div className="topbar">
          <button className="icon-btn" aria-label="Open menu" onClick={() => setNavOpen(true)}>
            <Menu size={20} />
          </button>
          <span className="topbar__brand">
            <span className="brand-mark brand-mark--sm" aria-hidden>
              <svg viewBox="0 0 20 20">
                <path d="M5.5 10.4l3 3 6-6.6" />
              </svg>
            </span>
            Cadence
          </span>
          <ProgressRing done={stats.completed} total={stats.all} compact />
        </div>

        <div className="main__inner">
          <header className="page-head">
            <div className="page-head__text">
              <p className="eyebrow">
                {greeting()}, {user!.name.split(' ')[0]} <span aria-hidden>·</span> {dateLine}
              </p>
              <h1 className="page-title">
                {activeProject && <ProjectDot project={activeProject} />}
                {activeTeam && <ProjectDot project={activeTeam} />}
                {title}
              </h1>
              <p className="page-sub">
                {activeTeam && activeTeam.members.length > 0 && <AvatarStack members={activeTeam.members} max={5} />}
                {subtitle}
              </p>
            </div>
            <div className="page-head__aside">
              <ProgressRing done={stats.completed} total={stats.all} />
              <button className="btn btn--primary" onClick={openCreate}>
                <Plus size={16} strokeWidth={2.5} />
                New task
              </button>
            </div>
          </header>

          <Dashboard stats={stats} active={activeStat} onSelect={selectStat} />

          <Toolbar
            ref={searchRef}
            query={query}
            onQuery={setQuery}
            filters={filters}
            onFilters={setFilters}
            sort={sort}
            onSort={setSort}
            projects={projects}
            members={boardPeople}
            layout={layout}
            onLayout={setLayout}
            boardGroup={boardGroup}
            onBoardGroup={setBoardGroup}
          />

          {layout === 'board' ? (
            <Board
              columns={columns}
              projects={projectMap}
              members={memberMap}
              today={today}
              selectedId={selectedId}
              groupedByStatus={boardGroup === 'status'}
              onMove={moveTask}
              onOpen={openTask}
              onToggle={toggleTask}
              onAdd={addInColumn}
              onSelect={setSelectedId}
            />
          ) : (
            <div className="list-card">
              {view !== 'completed' && (
                <QuickAdd
                  ref={quickAddRef}
                  projects={projects}
                  members={people}
                  today={today}
                  defaults={defaults}
                  onAdd={createTask}
                />
              )}
              {order.length > 0 ? (
                <TaskList
                  groups={groups}
                  projects={projectMap}
                  members={memberMap}
                  today={today}
                  selectedId={selectedId}
                  onToggle={toggleTask}
                  onOpen={openTask}
                  onSelect={setSelectedId}
                />
              ) : (
                <EmptyState
                  view={activeProject ? 'project' : view}
                  filtered={isFiltered || !!activeTeam}
                  onClear={clearFilters}
                  onCreate={() => (view === 'completed' ? openCreate() : quickAddRef.current?.focus())}
                />
              )}
            </div>
          )}
          <p className="footnote">Your tasks are saved in this browser only.</p>
        </div>
      </main>

      <button className="fab" aria-label="New task" onClick={openCreate}>
        <Plus size={22} strokeWidth={2.5} />
      </button>

      <TaskPanel
        state={panelState}
        projects={projects}
        members={people}
        today={today}
        onClose={() => setPanel(null)}
        onCreate={(draft) => {
          createTask(draft);
          setPanel(null);
        }}
        onSave={(id, draft) => {
          updateTask(id, draft);
          setPanel(null);
          toast('Changes saved');
        }}
        onToggle={toggleTask}
        onDelete={requestDelete}
      />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
      <ProjectDialog
        state={projectDialog}
        existingNames={projects.map((p) => p.name)}
        onClose={() => setProjectDialog(null)}
        onSubmit={submitProject}
      />
      <TeamDialog
        state={teamDialog}
        existingNames={teams.map((t) => t.name)}
        assignedCounts={memberOpen}
        onClose={() => setTeamDialog(null)}
        onSubmit={submitTeam}
      />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <Tour open={tourOpen} userName={user!.name} onFinish={finishTour} onSidebar={setNavOpen} />
    </div>
  );
}
