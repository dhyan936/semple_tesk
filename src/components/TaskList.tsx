import { memo } from 'react';
import { AlignLeft, CalendarDays, CircleDashed } from 'lucide-react';
import type { Member, Project, Task } from '../types';
import { describeDue } from '../lib/date';
import { isDone, isOverdue } from '../lib/tasks';
import { priorityLabel } from '../lib/meta';
import { Avatar, Checkbox, PriorityGlyph, ProjectDot } from './bits';
import type { MemberInfo } from './Board';

export interface TaskGroup {
  key: string;
  label: string;
  tone?: 'overdue' | 'today' | 'done';
  tasks: Task[];
}

interface TaskListProps {
  groups: TaskGroup[];
  projects: Map<string, Project>;
  members: Map<string, MemberInfo>;
  today: string;
  selectedId: string | null;
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
  onSelect: (id: string) => void;
}

export function TaskList({ groups, projects, members, today, selectedId, onToggle, onOpen, onSelect }: TaskListProps) {
  const showHeaders = groups.length > 1 || groups[0]?.key !== 'all';
  return (
    <div className="task-groups">
      {groups.map((g) => (
        <section key={g.key} className="task-group" aria-labelledby={showHeaders ? `group-${g.key}` : undefined}>
          {showHeaders && (
            <h3 id={`group-${g.key}`} className={`group-label${g.tone ? ` group-label--${g.tone}` : ''}`}>
              {g.label}
              <span className="group-label__count">{g.tasks.length}</span>
            </h3>
          )}
          <ul className="task-list" aria-label={g.label}>
            {g.tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                project={t.projectId ? projects.get(t.projectId) ?? null : null}
                assignee={t.assigneeId ? members.get(t.assigneeId)?.member ?? null : null}
                today={today}
                selected={t.id === selectedId}
                onToggle={onToggle}
                onOpen={onOpen}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const TaskRow = memo(function TaskRow({
  task,
  project,
  assignee,
  today,
  selected,
  onToggle,
  onOpen,
  onSelect,
}: {
  task: Task;
  project: Project | null;
  assignee: Member | null;
  today: string;
  selected: boolean;
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
  onSelect: (id: string) => void;
}) {
  const done = isDone(task);
  const overdue = isOverdue(task, today);
  const due = task.dueDate ? describeDue(task.dueDate, today) : null;

  return (
    <li
      className={`task${done ? ' is-done' : ''}${overdue ? ' is-overdue' : ''}${selected ? ' is-selected' : ''}`}
      data-task-id={task.id}
      onFocus={() => onSelect(task.id)}
    >
      <Checkbox
        checked={done}
        priority={task.priority}
        label={done ? `Reopen “${task.title}”` : `Complete “${task.title}”`}
        onChange={() => onToggle(task)}
      />
      <button className="task__open" onClick={() => onOpen(task)} aria-describedby={`meta-${task.id}`}>
        <span className="task__title">{task.title}</span>
      </button>
      {task.description && (
        <p className="task__desc">
          <AlignLeft size={12} aria-hidden />
          <span>{task.description}</span>
        </p>
      )}
      <div className="task__meta" id={`meta-${task.id}`}>
        {task.status === 'in_progress' && (
          <span className="badge badge--progress">
            <CircleDashed size={12} aria-hidden />
            In progress
          </span>
        )}
        {due && (
          <span className={`badge badge--due badge--${done ? 'muted' : due.tone}`}>
            <CalendarDays size={12} aria-hidden />
            {overdue ? `${due.label} · overdue` : due.label}
          </span>
        )}
        {project && (
          <span className="badge badge--project">
            <ProjectDot project={project} />
            {project.name}
          </span>
        )}
        <span className={`badge badge--prio badge--prio-${task.priority}`} title={`${priorityLabel(task.priority)} priority`}>
          <PriorityGlyph priority={task.priority} size={12} />
          <span className="badge__prio-label">{priorityLabel(task.priority)}</span>
        </span>
        {assignee && (
          <span className="task__assignee" title={`Assigned to ${assignee.name}`}>
            <Avatar member={assignee} size="sm" />
            <span className="badge__prio-label">Assigned to {assignee.name}</span>
          </span>
        )}
      </div>
    </li>
  );
});
