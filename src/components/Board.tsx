import { memo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import { AlignLeft, CalendarDays, CircleDashed, Plus } from 'lucide-react';
import type { Member, Project, Task, TaskDraft, Team } from '../types';
import { describeDue } from '../lib/date';
import { isDone, isOverdue } from '../lib/tasks';
import { Avatar, Checkbox, PriorityGlyph, ProjectDot } from './bits';

export interface BoardColumn {
  key: string;
  label: string;
  /** Shown before the label: a colored dot, avatar or glyph. */
  marker: ReactNode;
  /** Secondary text beside the label, e.g. the member's team. */
  meta?: string;
  tasks: Task[];
  /** Fields a task takes on when dropped into, or created in, this column. */
  patch: Partial<TaskDraft>;
}

export type MemberInfo = { member: Member; team: Team };

interface BoardProps {
  columns: BoardColumn[];
  projects: Map<string, Project>;
  members: Map<string, MemberInfo>;
  today: string;
  selectedId: string | null;
  /** Hide the status badge when columns already show status. */
  groupedByStatus: boolean;
  onMove: (task: Task, column: BoardColumn) => void;
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onAdd: (column: BoardColumn) => void;
  onSelect: (id: string) => void;
}

const DIRECTIONS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1],
};

/** Arrow keys jump a lifted card to the nearest column in that direction, side by side or stacked. */
const columnCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const dir = DIRECTIONS[event.code];
  const { collisionRect, droppableRects, droppableContainers } = context;
  if (!dir || !collisionRect) return undefined;
  event.preventDefault();

  const cx = collisionRect.left + collisionRect.width / 2;
  const cy = collisionRect.top + collisionRect.height / 2;
  const next = droppableContainers
    .getEnabled()
    .map((c) => droppableRects.get(c.id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({ r, dx: r.left + r.width / 2 - cx, dy: r.top + Math.min(r.height / 2, 89) - cy }))
    .filter(({ dx, dy }) => (dir[0] ? Math.sign(dx) === dir[0] && Math.abs(dx) > 21 : Math.sign(dy) === dir[1] && Math.abs(dy) > 21))
    .sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy))[0];

  if (!next) return undefined;
  return { x: next.r.left + (next.r.width - collisionRect.width) / 2, y: next.r.top + 55 };
};

/** Kanban board: drag cards between columns with mouse, touch or keyboard (Space to lift, arrows to move). */
export function Board(props: BoardProps) {
  const { columns, onMove } = props;
  const [dragging, setDragging] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
      coordinateGetter: columnCoordinates,
    }),
  );

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current?.task as Task) ?? null);

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const task = e.active.data.current?.task as Task | undefined;
    const target = columns.find((c) => c.key === e.over?.id);
    const source = columns.find((c) => c.tasks.some((t) => t.id === task?.id));
    if (task && target && target !== source) onMove(task, target);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${(active.data.current?.task as Task)?.title}.`,
          onDragOver: ({ over }) => (over ? `Over ${columns.find((c) => c.key === over.id)?.label}.` : 'Not over a column.'),
          onDragEnd: ({ over }) => (over ? `Dropped in ${columns.find((c) => c.key === over.id)?.label}.` : 'Dropped.'),
          onDragCancel: () => 'Move cancelled.',
        },
        screenReaderInstructions: {
          draggable: 'Press Space to pick up the card, use the arrow keys to move it to another column, and press Space again to drop it. Press Enter to open it.',
        },
      }}
    >
      <div className="board" style={{ '--cols': columns.length } as CSSProperties}>
        {columns.map((c) => (
          <Column key={c.key} column={c} {...props} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {dragging ? <CardBody task={dragging} {...props} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ column, onAdd, ...props }: BoardProps & { column: BoardColumn }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  return (
    <section ref={setNodeRef} className={`board-col${isOver ? ' is-over' : ''}`} aria-labelledby={`col-${column.key}`}>
      <header className="board-col__head">
        {column.marker}
        <h3 id={`col-${column.key}`} className="board-col__title">
          {column.label}
        </h3>
        {column.meta && <span className="board-col__meta">{column.meta}</span>}
        <span className="board-col__count">{column.tasks.length}</span>
        <button className="icon-btn icon-btn--sm board-col__add" aria-label={`Add task to ${column.label}`} onClick={() => onAdd(column)}>
          <Plus size={15} />
        </button>
      </header>
      <ul className="board-col__list">
        {column.tasks.map((t) => (
          <Card key={t.id} task={t} onAdd={onAdd} {...props} />
        ))}
        {column.tasks.length === 0 && <li className="board-col__empty">Drop tasks here</li>}
      </ul>
      <button className="board-col__new" onClick={() => onAdd(column)}>
        <Plus size={14} />
        Add task
      </button>
    </section>
  );
}

const Card = memo(function Card(props: Omit<BoardProps, 'columns'> & { task: Task }) {
  const { task, onOpen, onSelect, selectedId } = props;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, data: { task } });

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-task-id={task.id}
      aria-label={task.title}
      className={`board-card${isDragging ? ' is-dragging' : ''}${task.id === selectedId ? ' is-selected' : ''}`}
      onClick={() => onOpen(task)}
      onFocus={(e) => e.target === e.currentTarget && onSelect(task.id)}
      onKeyDown={(e) => {
        // Keys pressed on the card's own controls (like the checkbox) must not start a drag.
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen(task);
          return;
        }
        listeners?.onKeyDown?.(e);
      }}
    >
      <CardBody {...props} />
    </li>
  );
});

function CardBody({
  task,
  projects,
  members,
  today,
  groupedByStatus,
  onToggle,
  overlay = false,
}: Omit<BoardProps, 'columns'> & { task: Task; overlay?: boolean }) {
  const done = isDone(task);
  const overdue = isOverdue(task, today);
  const due = task.dueDate ? describeDue(task.dueDate, today) : null;
  const project = task.projectId ? projects.get(task.projectId) ?? null : null;
  const assignee = task.assigneeId ? members.get(task.assigneeId)?.member ?? null : null;

  const body = (
    <>
      <div className="board-card__top">
        {project ? (
          <span className="board-card__project">
            <ProjectDot project={project} />
            {project.name}
          </span>
        ) : (
          <span className="board-card__project board-card__project--none">No project</span>
        )}
        <PriorityGlyph priority={task.priority} />
      </div>
      <div className="board-card__main">
        <Checkbox
          checked={done}
          priority={task.priority}
          label={done ? `Reopen “${task.title}”` : `Complete “${task.title}”`}
          onChange={() => onToggle(task)}
        />
        <span className="board-card__title">{task.title}</span>
      </div>
      {task.description && (
        <p className="board-card__desc">
          <AlignLeft size={12} aria-hidden />
          <span>{task.description}</span>
        </p>
      )}
      <div className="board-card__foot">
        {due && (
          <span className={`badge badge--due badge--${done ? 'muted' : due.tone}`}>
            <CalendarDays size={12} aria-hidden />
            {overdue ? `${due.label} · overdue` : due.label}
          </span>
        )}
        {!groupedByStatus && task.status === 'in_progress' && (
          <span className="badge badge--progress">
            <CircleDashed size={12} aria-hidden />
            In progress
          </span>
        )}
        <span className="board-card__assignee" title={assignee ? `Assigned to ${assignee.name}` : 'Unassigned'}>
          <Avatar member={assignee} size="sm" />
        </span>
      </div>
    </>
  );

  if (overlay) {
    return <div className={`board-card board-card--overlay${done ? ' is-done' : ''}${overdue ? ' is-overdue' : ''}`}>{body}</div>;
  }
  return <div className={`board-card__inner${done ? ' is-done' : ''}${overdue ? ' is-overdue' : ''}`}>{body}</div>;
}
