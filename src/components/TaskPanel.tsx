import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { CalendarDays, Check, CircleDot, Clock, Flag, Folder, RotateCcw, Trash2, UserRound, X } from 'lucide-react';
import type { Project, Task, TaskDraft } from '../types';
import { PRIORITIES, STATUSES } from '../lib/meta';
import { formatLongDate, formatTimestamp } from '../lib/date';
import { Modal } from './Modal';
import { SelectMenu } from './SelectMenu';
import { DuePicker } from './DuePicker';
import { Avatar, Kbd, PriorityGlyph, ProjectDot } from './bits';
import type { MemberInfo } from './Board';

export type PanelState = { mode: 'create'; defaults: TaskDraft } | { mode: 'edit'; task: Task } | null;

interface TaskPanelProps {
  state: PanelState;
  projects: Project[];
  members: MemberInfo[];
  today: string;
  onClose: () => void;
  onCreate: (draft: TaskDraft) => void;
  onSave: (id: string, draft: TaskDraft) => void;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const toDraft = (t: Task): TaskDraft => ({
  title: t.title,
  description: t.description,
  dueDate: t.dueDate,
  priority: t.priority,
  status: t.status,
  projectId: t.projectId,
  assigneeId: t.assigneeId,
});

/** Side sheet for viewing and editing a task, or creating one with every field. */
export function TaskPanel({ state, projects, members, today, onClose, onCreate, onSave, onToggle, onDelete }: TaskPanelProps) {
  // Keep the last state around so the panel can animate out with its content intact.
  const [shown, setShown] = useState(state);
  useEffect(() => {
    if (state) setShown(state);
  }, [state]);

  const task = shown?.mode === 'edit' ? shown.task : null;
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [error, setError] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const identity = state ? (state.mode === 'edit' ? state.task.id : 'new') : null;
  useEffect(() => {
    if (!state) return;
    setDraft(state.mode === 'edit' ? toDraft(state.task) : state.defaults);
    setError(false);
    // Reset only when a different task is opened, not on every store update.
  }, [identity]);

  // External changes (e.g. completing from the header button) flow into the open form.
  useEffect(() => {
    if (state?.mode === 'edit') setDraft((d) => (d ? { ...d, status: state.task.status } : d));
  }, [state?.mode === 'edit' ? state.task.status : null]);

  useLayoutEffect(() => {
    for (const el of [titleRef.current, descRef.current]) {
      if (!el) continue;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [draft?.title, draft?.description, identity]);

  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) {
      setError(true);
      titleRef.current?.focus();
      return;
    }
    const clean = { ...draft, title, description: draft.description.trim() };
    if (task) onSave(task.id, clean);
    else onCreate(clean);
  };

  const dirty = !!draft && (task ? JSON.stringify(toDraft(task)) !== JSON.stringify(draft) : draft.title.trim() !== '');
  const project = projects.find((p) => p.id === draft?.projectId) ?? null;
  const assignee = members.find((m) => m.member.id === draft?.assigneeId) ?? null;
  const headingId = 'task-panel-heading';

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      labelledBy={headingId}
      variant="sheet"
      className="panel"
      initialFocus={shown?.mode === 'create' ? '#task-title' : '.panel__close'}
    >
      {draft && (
        <form
          className="panel__form"
          onSubmit={submit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        >
          <header className="panel__header">
            <div className="panel__crumb" id={headingId}>
              {project ? <ProjectDot project={project} /> : <Folder size={14} />}
              <span>{project?.name ?? 'No project'}</span>
              <span className="panel__crumb-sep">/</span>
              <span className="panel__crumb-current">{task ? 'Task details' : 'New task'}</span>
            </div>
            <div className="panel__actions">
              {task && (
                <>
                  <button
                    type="button"
                    className={`btn btn--sm ${task.status === 'completed' ? 'btn--secondary' : 'btn--success'}`}
                    onClick={() => onToggle(task)}
                  >
                    {task.status === 'completed' ? <RotateCcw size={14} /> : <Check size={14} strokeWidth={2.5} />}
                    {task.status === 'completed' ? 'Reopen' : 'Complete'}
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label="Delete task"
                    title="Delete task"
                    onClick={() => onDelete(task)}
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
              <button type="button" className="icon-btn panel__close" aria-label="Close panel" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="panel__body">
            <textarea
              ref={titleRef}
              id="task-title"
              className={`panel__title${error ? ' has-error' : ''}`}
              placeholder="Task title"
              aria-label="Title"
              aria-invalid={error}
              aria-describedby={error ? 'title-error' : undefined}
              rows={1}
              maxLength={200}
              value={draft.title}
              onChange={(e) => {
                set('title', e.target.value.replace(/\n/g, ' '));
                if (error) setError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault();
                  descRef.current?.focus();
                }
              }}
            />
            {error && (
              <p className="field-error" id="title-error" role="alert">
                A task needs a title.
              </p>
            )}
            <textarea
              ref={descRef}
              className="panel__desc"
              placeholder="Add a description…"
              aria-label="Description"
              rows={2}
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
            />

            <dl className="props">
              <div className="props__row">
                <dt>
                  <CircleDot size={15} /> Status
                </dt>
                <dd>
                  <div className="segmented" role="radiogroup" aria-label="Status">
                    {STATUSES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        role="radio"
                        aria-checked={draft.status === s.value}
                        className={`segmented__option segmented__option--${s.value}`}
                        onClick={() => set('status', s.value)}
                      >
                        <span className={`status-dot status-dot--${s.value}`} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </dd>
              </div>
              <div className="props__row">
                <dt>
                  <Flag size={15} /> Priority
                </dt>
                <dd>
                  <div className="segmented" role="radiogroup" aria-label="Priority">
                    {[...PRIORITIES].reverse().map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        role="radio"
                        aria-checked={draft.priority === p.value}
                        className={`segmented__option segmented__option--${p.value}`}
                        onClick={() => set('priority', p.value)}
                      >
                        <PriorityGlyph priority={p.value} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </dd>
              </div>
              <div className="props__row">
                <dt>
                  <CalendarDays size={15} /> Due date
                </dt>
                <dd>
                  <DuePicker
                    value={draft.dueDate}
                    onChange={(v) => set('dueDate', v)}
                    today={today}
                    triggerClassName="prop-btn"
                    placeholder="No due date"
                  />
                  {draft.dueDate && <span className="props__aside">{formatLongDate(draft.dueDate)}</span>}
                </dd>
              </div>
              <div className="props__row">
                <dt>
                  <Folder size={15} /> Project
                </dt>
                <dd>
                  <SelectMenu
                    label="Project"
                    heading="Move to project"
                    value={draft.projectId ?? ''}
                    options={[
                      { value: '', label: 'No project', icon: <ProjectDot project={null} /> },
                      ...projects.map((p) => ({ value: p.id, label: p.name, icon: <ProjectDot project={p} /> })),
                    ]}
                    onChange={(v) => set('projectId', v || null)}
                    triggerClassName="prop-btn"
                    trigger={
                      <>
                        <ProjectDot project={project} />
                        <span>{project?.name ?? 'No project'}</span>
                      </>
                    }
                  />
                </dd>
              </div>
              <div className="props__row">
                <dt>
                  <UserRound size={15} /> Assignee
                </dt>
                <dd>
                  <SelectMenu
                    label="Assignee"
                    heading="Assign to"
                    value={draft.assigneeId ?? ''}
                    options={[
                      { value: '', label: 'Unassigned', icon: <Avatar member={null} size="sm" /> },
                      ...members.map(({ member, team }) => ({
                        value: member.id,
                        label: member.name,
                        meta: team.name,
                        icon: <Avatar member={member} size="sm" />,
                      })),
                    ]}
                    onChange={(v) => set('assigneeId', v || null)}
                    triggerClassName="prop-btn"
                    trigger={
                      <>
                        <Avatar member={assignee?.member ?? null} size="sm" />
                        <span>{assignee?.member.name ?? 'Unassigned'}</span>
                      </>
                    }
                  />
                  {assignee && <span className="props__aside">{assignee.team.name}</span>}
                  {members.length === 0 && <span className="props__aside">Create a team to assign tasks</span>}
                </dd>
              </div>
              {task && (
                <div className="props__row">
                  <dt>
                    <Clock size={15} /> Created
                  </dt>
                  <dd className="props__static">{formatTimestamp(task.createdAt)}</dd>
                </div>
              )}
            </dl>
          </div>

          <footer className="panel__footer">
            <span className="panel__hint">
              {dirty ? (
                <>
                  <span className="unsaved-dot" aria-hidden /> Unsaved changes
                </>
              ) : (
                <>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>Enter</Kbd> to save
                </>
              )}
            </span>
            <div className="panel__footer-actions">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={!!task && !dirty}>
                {task ? 'Save changes' : 'Create task'}
              </button>
            </div>
          </footer>
        </form>
      )}
    </Modal>
  );
}
