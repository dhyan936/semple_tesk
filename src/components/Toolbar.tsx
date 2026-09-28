import { forwardRef } from 'react';
import { ArrowDownUp, ChevronDown, CircleDot, Columns3, Folder, List, Rows3, Search, Users, X } from 'lucide-react';
import type { BoardGroup, Filters, LayoutMode, Priority, Project, SortKey, Status } from '../types';
import { BOARD_GROUPS, PRIORITIES, SORTS, STATUSES } from '../lib/meta';
import { SelectMenu, type MenuOption } from './SelectMenu';
import { Avatar, Kbd, PriorityGlyph, ProjectDot } from './bits';
import type { MemberInfo } from './Board';

interface ToolbarProps {
  query: string;
  onQuery: (q: string) => void;
  filters: Filters;
  onFilters: (f: Filters) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  projects: Project[];
  /** Members offered in the assignee filter, in display order. */
  members: MemberInfo[];
  layout: LayoutMode;
  onLayout: (l: LayoutMode) => void;
  boardGroup: BoardGroup;
  onBoardGroup: (g: BoardGroup) => void;
}

const ANY = '' as const;

export const Toolbar = forwardRef<HTMLInputElement, ToolbarProps>(function Toolbar(
  { query, onQuery, filters, onFilters, sort, onSort, projects, members, layout, onLayout, boardGroup, onBoardGroup },
  searchRef,
) {
  const projectOptions: MenuOption<string>[] = [
    { value: ANY, label: 'All projects', icon: <Folder size={14} /> },
    ...projects.map((p) => ({ value: p.id, label: p.name, icon: <ProjectDot project={p} /> })),
    { value: 'none', label: 'No project', icon: <ProjectDot project={null} /> },
  ];
  const priorityOptions: MenuOption<Priority | ''>[] = [
    { value: ANY, label: 'Any priority' },
    ...PRIORITIES.map((p) => ({ ...p, icon: <PriorityGlyph priority={p.value} /> })),
  ];
  const statusOptions: MenuOption<Status | ''>[] = [
    { value: ANY, label: 'Any status' },
    ...STATUSES.map((s) => ({ ...s, icon: <span className={`status-dot status-dot--${s.value}`} /> })),
  ];

  const assigneeOptions: MenuOption<string>[] = [
    { value: ANY, label: 'Anyone', icon: <Users size={14} /> },
    { value: 'none', label: 'Unassigned', icon: <Avatar member={null} size="sm" /> },
    ...members.map(({ member, team }) => ({
      value: member.id,
      label: member.name,
      meta: team.name,
      icon: <Avatar member={member} size="sm" />,
    })),
  ];
  const assignee = members.find((m) => m.member.id === filters.assignee)?.member ?? null;

  const projectName =
    filters.project === 'none' ? 'No project' : projects.find((p) => p.id === filters.project)?.name ?? null;
  const active = !!(filters.project || filters.priority || filters.status || filters.assignee || query);

  return (
    <div className="toolbar">
      <div className="search">
        <Search className="search__icon" size={16} aria-hidden />
        <input
          ref={searchRef}
          type="search"
          className="search__input"
          placeholder="Search tasks…"
          aria-label="Search tasks"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              if (query) onQuery('');
              else e.currentTarget.blur();
            }
          }}
        />
        {query ? (
          <button className="search__clear" aria-label="Clear search" onClick={() => onQuery('')}>
            <X size={14} />
          </button>
        ) : (
          <span className="search__kbd" aria-hidden>
            <Kbd>/</Kbd>
          </span>
        )}
      </div>

      <div className="layout-switch" role="radiogroup" aria-label="Layout">
        <button
          role="radio"
          aria-checked={layout === 'list'}
          className="layout-switch__option"
          onClick={() => onLayout('list')}
          title="List (B to switch)"
        >
          <List size={15} />
          <span>List</span>
        </button>
        <button
          role="radio"
          aria-checked={layout === 'board'}
          className="layout-switch__option"
          onClick={() => onLayout('board')}
          title="Board (B to switch)"
        >
          <Columns3 size={15} />
          <span>Board</span>
        </button>
      </div>
      <div className="toolbar__filters">
        <SelectMenu
          label="Filter by project"
          heading="Project"
          value={filters.project ?? ANY}
          options={projectOptions}
          onChange={(v) => onFilters({ ...filters, project: v || null })}
          triggerClassName={`chip${filters.project ? ' is-set' : ''}`}
          trigger={
            <>
              {filters.project ? (
                <ProjectDot project={projects.find((p) => p.id === filters.project) ?? null} />
              ) : (
                <Folder size={14} />
              )}
              <span>{projectName ?? 'Project'}</span>
              <ChevronDown className="chip__caret" size={13} />
            </>
          }
        />
        <SelectMenu
          label="Filter by priority"
          heading="Priority"
          value={filters.priority ?? ANY}
          options={priorityOptions}
          onChange={(v) => onFilters({ ...filters, priority: v || null })}
          triggerClassName={`chip${filters.priority ? ' is-set' : ''}`}
          trigger={
            <>
              <PriorityGlyph priority={filters.priority ?? 'high'} />
              <span>{filters.priority ? PRIORITIES.find((p) => p.value === filters.priority)!.label : 'Priority'}</span>
              <ChevronDown className="chip__caret" size={13} />
            </>
          }
        />
        <SelectMenu
          label="Filter by status"
          heading="Status"
          value={filters.status ?? ANY}
          options={statusOptions}
          onChange={(v) => onFilters({ ...filters, status: v || null })}
          triggerClassName={`chip${filters.status ? ' is-set' : ''}`}
          trigger={
            <>
              {filters.status ? (
                <span className={`status-dot status-dot--${filters.status}`} />
              ) : (
                <CircleDot size={14} />
              )}
              <span>{filters.status ? STATUSES.find((s) => s.value === filters.status)!.label : 'Status'}</span>
              <ChevronDown className="chip__caret" size={13} />
            </>
          }
        />
        <SelectMenu
          label="Filter by assignee"
          heading="Assignee"
          value={filters.assignee ?? ANY}
          options={assigneeOptions}
          onChange={(v) => onFilters({ ...filters, assignee: v || null })}
          triggerClassName={`chip${filters.assignee ? ' is-set' : ''}`}
          trigger={
            <>
              {filters.assignee ? <Avatar member={assignee} size="sm" /> : <Users size={14} />}
              <span>{filters.assignee === 'none' ? 'Unassigned' : assignee?.name ?? 'Assignee'}</span>
              <ChevronDown className="chip__caret" size={13} />
            </>
          }
        />
        {active && (
          <button
            className="chip chip--ghost"
            onClick={() => {
              onFilters({ project: null, priority: null, status: null, assignee: null, team: filters.team });
              onQuery('');
            }}
          >
            <X size={13} />
            <span>Clear</span>
          </button>
        )}
        <span className="toolbar__spacer" />
        {layout === 'board' && (
          <SelectMenu
            label="Group board by"
            heading="Group by"
            value={boardGroup}
            options={BOARD_GROUPS}
            onChange={onBoardGroup}
            align="end"
            triggerClassName="chip chip--plain"
            trigger={
              <>
                <Rows3 size={14} />
                <span className="chip__prefix">Group:</span>
                <span>{BOARD_GROUPS.find((g) => g.value === boardGroup)!.label}</span>
              </>
            }
          />
        )}
        <SelectMenu
          label="Sort tasks"
          heading="Sort by"
          value={sort}
          options={SORTS}
          onChange={onSort}
          align="end"
          triggerClassName="chip chip--plain"
          trigger={
            <>
              <ArrowDownUp size={14} />
              <span className="chip__prefix">Sort:</span>
              <span>{SORTS.find((s) => s.value === sort)!.label}</span>
            </>
          }
        />
      </div>
    </div>
  );
});
