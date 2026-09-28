import { useRef, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Compass,
  Inbox,
  Keyboard,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import type { Project, Team, ViewKey } from '../types';
import type { User } from '../lib/auth';
import { VIEWS } from '../lib/meta';
import { Popover } from './Popover';
import { Avatar, AvatarStack, Kbd, ProjectDot } from './bits';

const viewIcons: Record<ViewKey, typeof Inbox> = {
  all: Inbox,
  today: Sun,
  upcoming: CalendarClock,
  overdue: AlertCircle,
  completed: CheckCircle2,
};

interface SidebarProps {
  view: ViewKey;
  activeProject: string | null;
  activeTeam: string | null;
  viewCounts: Record<ViewKey, number>;
  projects: Project[];
  projectCounts: Record<string, { total: number; open: number }>;
  teams: Team[];
  /** Open tasks assigned to each team's members. */
  teamCounts: Record<string, number>;
  open: boolean;
  onClose: () => void;
  onSelectView: (view: ViewKey) => void;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onSelectTeam: (id: string) => void;
  onNewTeam: () => void;
  onEditTeam: (team: Team) => void;
  onDeleteTeam: (team: Team) => void;
  onShowShortcuts: () => void;
  onStartTour: () => void;
  user: User;
  onLogout: () => void;
}

export function Sidebar(props: SidebarProps) {
  const { view, activeProject, activeTeam, viewCounts, projects, projectCounts, teams, teamCounts, open } = props;

  return (
    <>
      <div className={`sidebar-scrim${open ? ' is-open' : ''}`} onClick={props.onClose} aria-hidden />
      <aside className={`sidebar${open ? ' is-open' : ''}`} aria-label="Navigation">
        <div className="sidebar__brand">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 20 20">
              <path d="M5.5 10.4l3 3 6-6.6" />
            </svg>
          </span>
          <span className="brand-name">Cadence</span>
          <button className="icon-btn sidebar__close" onClick={props.onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__section" aria-label="Views">
          <ul className="nav-list">
            {VIEWS.map((v, i) => {
              const Icon = viewIcons[v.key];
              const active = view === v.key && !activeProject && !activeTeam;
              const count = viewCounts[v.key];
              return (
                <li key={v.key}>
                  <button
                    className={`nav-item${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => props.onSelectView(v.key)}
                    title={`${v.label} (${i + 1})`}
                  >
                    <Icon className={`nav-item__icon nav-item__icon--${v.key}`} size={16} />
                    <span className="nav-item__label">{v.label}</span>
                    {count > 0 && (
                      <span className={`nav-count${v.key === 'overdue' ? ' nav-count--alert' : ''}`}>{count}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="sidebar__section" aria-labelledby="projects-heading">
          <div className="sidebar__heading">
            <h2 id="projects-heading">Projects</h2>
            <button className="icon-btn icon-btn--sm" onClick={props.onNewProject} aria-label="New project" title="New project (P)">
              <Plus size={15} />
            </button>
          </div>
          {projects.length === 0 ? (
            <button className="sidebar__empty" onClick={props.onNewProject}>
              <Plus size={14} /> Create your first project
            </button>
          ) : (
            <ul className="nav-list">
              {projects.map((p) => (
                <EntityItem
                  key={p.id}
                  name={p.name}
                  icon={<ProjectDot project={p} />}
                  count={projectCounts[p.id]?.total ?? 0}
                  title={`${projectCounts[p.id]?.total ?? 0} tasks, ${projectCounts[p.id]?.open ?? 0} open`}
                  active={activeProject === p.id}
                  editLabel="Rename project"
                  deleteLabel="Delete project"
                  onSelect={() => props.onSelectProject(p.id)}
                  onEdit={() => props.onEditProject(p)}
                  onDelete={() => props.onDeleteProject(p)}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="sidebar__section sidebar__section--grow" aria-labelledby="teams-heading">
          <div className="sidebar__heading">
            <h2 id="teams-heading">Teams</h2>
            <button className="icon-btn icon-btn--sm" onClick={props.onNewTeam} aria-label="New team" title="New team">
              <Plus size={15} />
            </button>
          </div>
          {teams.length === 0 ? (
            <button className="sidebar__empty" onClick={props.onNewTeam}>
              <Plus size={14} /> Create a team
            </button>
          ) : (
            <ul className="nav-list">
              {teams.map((t) => (
                <EntityItem
                  key={t.id}
                  name={t.name}
                  icon={<ProjectDot project={t} />}
                  extra={<AvatarStack members={t.members} />}
                  count={teamCounts[t.id] ?? 0}
                  title={`${t.members.length} ${t.members.length === 1 ? 'member' : 'members'}, ${teamCounts[t.id] ?? 0} open tasks`}
                  active={activeTeam === t.id}
                  editLabel="Edit team"
                  deleteLabel="Delete team"
                  onSelect={() => props.onSelectTeam(t.id)}
                  onEdit={() => props.onEditTeam(t)}
                  onDelete={() => props.onDeleteTeam(t)}
                />
              ))}
            </ul>
          )}
        </section>

        <div className="sidebar__footer">
          <button className="shortcut-hint" onClick={props.onStartTour}>
            <Compass size={15} />
            <span>Product tour</span>
          </button>
          <button className="shortcut-hint" onClick={props.onShowShortcuts}>
            <Keyboard size={15} />
            <span>Keyboard shortcuts</span>
            <Kbd>?</Kbd>
          </button>
          <div className="account">
            <Avatar member={props.user} size="md" />
            <div className="account__text">
              <span className="account__name">{props.user.name}</span>
              <span className="account__email">{props.user.email}</span>
            </div>
            <button className="icon-btn icon-btn--sm account__logout" onClick={props.onLogout} aria-label="Sign out" title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/** A sidebar row for a project or team, with a menu to edit or delete it. */
function EntityItem({
  name,
  icon,
  extra,
  count,
  title,
  active,
  editLabel,
  deleteLabel,
  onSelect,
  onEdit,
  onDelete,
}: {
  name: string;
  icon: ReactNode;
  extra?: ReactNode;
  count: number;
  title: string;
  active: boolean;
  editLabel: string;
  deleteLabel: string;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const close = () => setMenu(false);

  return (
    <li className="project-item" data-menu={menu || undefined}>
      <button
        className={`nav-item${active ? ' is-active' : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={onSelect}
        title={title}
      >
        <span className="nav-item__icon nav-item__icon--dot">{icon}</span>
        <span className="nav-item__label">{name}</span>
        {extra}
        <span className="nav-count" aria-label={title}>
          {count}
        </span>
      </button>
      <button
        ref={moreRef}
        className="icon-btn icon-btn--sm project-item__more"
        aria-label={`Options for ${name}`}
        aria-haspopup="menu"
        aria-expanded={menu}
        onClick={() => setMenu((m) => !m)}
      >
        <MoreHorizontal size={15} />
      </button>
      <Popover anchorRef={moreRef} open={menu} onClose={close} align="end" className="menu">
        <div className="menu__list" role="menu">
          <button
            role="menuitem"
            className="menu__item"
            autoFocus
            onClick={() => {
              close();
              onEdit();
            }}
          >
            <span className="menu__icon">
              <Pencil size={14} />
            </span>
            <span className="menu__label">{editLabel}</span>
          </button>
          <button
            role="menuitem"
            className="menu__item menu__item--danger"
            onClick={() => {
              close();
              onDelete();
            }}
          >
            <span className="menu__icon">
              <Trash2 size={14} />
            </span>
            <span className="menu__label">{deleteLabel}</span>
          </button>
        </div>
      </Popover>
    </li>
  );
}
