import { forwardRef, useEffect, useRef, useState, type FormEvent } from 'react';
import { CornerDownLeft, Folder, Plus } from 'lucide-react';
import type { MemberInfo } from './Board';
import type { Priority, Project, TaskDraft } from '../types';
import { PRIORITIES } from '../lib/meta';
import { SelectMenu } from './SelectMenu';
import { DuePicker } from './DuePicker';
import { Avatar, Kbd, PriorityGlyph, ProjectDot } from './bits';

interface QuickAddProps {
  projects: Project[];
  members: MemberInfo[];
  today: string;
  /** Context-aware defaults, e.g. the open project or today's date in the Today view. */
  defaults: Pick<TaskDraft, 'projectId' | 'dueDate' | 'priority' | 'assigneeId'>;
  onAdd: (draft: TaskDraft) => void;
}

/** Capture a task in seconds: type, optionally set details, press Enter. */
export const QuickAdd = forwardRef<HTMLInputElement, QuickAddProps>(function QuickAdd(
  { projects, members, today, defaults, onAdd },
  inputRef,
) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>(defaults.priority);
  const [dueDate, setDueDate] = useState<string | null>(defaults.dueDate);
  const [projectId, setProjectId] = useState<string | null>(defaults.projectId);
  const [assigneeId, setAssigneeId] = useState<string | null>(defaults.assigneeId);
  const [expanded, setExpanded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const pointerDown = useRef(false);

  useEffect(() => {
    const down = () => (pointerDown.current = true);
    const up = () => (pointerDown.current = false);
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointerup', up, true);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointerup', up, true);
    };
  }, []);

  // Collapsing mid-click would shift the list under the pointer, so wait for the click to land.
  const collapse = () => {
    if (!pointerDown.current) return setExpanded(false);
    window.addEventListener('pointerup', () => window.setTimeout(() => setExpanded(false)), { once: true });
  };

  // Follow the context whenever the user switches view or project.
  useEffect(() => {
    setPriority(defaults.priority);
    setDueDate(defaults.dueDate);
    setProjectId(defaults.projectId);
    setAssigneeId(defaults.assigneeId);
  }, [defaults.priority, defaults.dueDate, defaults.projectId, defaults.assigneeId]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    onAdd({ title: clean, description: '', priority, dueDate, projectId, assigneeId, status: 'todo' });
    setTitle('');
  };

  const project = projects.find((p) => p.id === projectId) ?? null;
  const assignee = members.find((m) => m.member.id === assigneeId)?.member ?? null;
  const showControls = expanded || title.length > 0;

  return (
    <form
      ref={formRef}
      className={`quick-add${showControls ? ' is-expanded' : ''}`}
      onSubmit={submit}
      onFocus={() => setExpanded(true)}
      onBlur={(e) => {
        // Stay open while focus moves between the form's own controls or its popovers.
        const next = e.relatedTarget as Node | null;
        if (next && (formRef.current?.contains(next) || (next as HTMLElement).closest?.('.popover'))) return;
        collapse();
      }}
    >
      <div className="quick-add__row">
        <span className="quick-add__plus" aria-hidden>
          <Plus size={16} strokeWidth={2.5} />
        </span>
        <input
          ref={inputRef}
          className="quick-add__input"
          placeholder="Add a task…"
          aria-label="New task title"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setTitle('');
              e.currentTarget.blur();
            }
          }}
        />
        {!showControls && (
          <span className="quick-add__hint" aria-hidden>
            <Kbd>N</Kbd>
          </span>
        )}
      </div>
      {showControls && (
        <div className="quick-add__controls">
          <SelectMenu
            label="Priority"
            heading="Priority"
            value={priority}
            options={PRIORITIES.map((p) => ({ ...p, icon: <PriorityGlyph priority={p.value} /> }))}
            onChange={setPriority}
            triggerClassName="chip chip--soft"
            trigger={
              <>
                <PriorityGlyph priority={priority} />
                <span>{PRIORITIES.find((p) => p.value === priority)!.label}</span>
              </>
            }
          />
          <DuePicker value={dueDate} onChange={setDueDate} today={today} triggerClassName="chip chip--soft" />
          <SelectMenu
            label="Project"
            heading="Project"
            value={projectId ?? ''}
            options={[
              { value: '', label: 'No project', icon: <ProjectDot project={null} /> },
              ...projects.map((p) => ({ value: p.id, label: p.name, icon: <ProjectDot project={p} /> })),
            ]}
            onChange={(v) => setProjectId(v || null)}
            triggerClassName="chip chip--soft"
            trigger={
              <>
                {project ? <ProjectDot project={project} /> : <Folder size={14} />}
                <span>{project?.name ?? 'No project'}</span>
              </>
            }
          />
          {members.length > 0 && (
            <SelectMenu
              label="Assignee"
              heading="Assign to"
              value={assigneeId ?? ''}
              options={[
                { value: '', label: 'Unassigned', icon: <Avatar member={null} size="sm" /> },
                ...members.map(({ member, team }) => ({
                  value: member.id,
                  label: member.name,
                  meta: team.name,
                  icon: <Avatar member={member} size="sm" />,
                })),
              ]}
              onChange={(v) => setAssigneeId(v || null)}
              triggerClassName="chip chip--soft"
              trigger={
                <>
                  <Avatar member={assignee} size="sm" />
                  <span>{assignee?.name ?? 'Assign'}</span>
                </>
              }
            />
          )}
          <span className="toolbar__spacer" />
          <button type="submit" className="btn btn--primary btn--sm" disabled={!title.trim()}>
            Add task
            <CornerDownLeft size={13} />
          </button>
        </div>
      )}
    </form>
  );
});
