import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Project, ProjectColor } from '../types';
import { PROJECT_COLORS } from '../lib/meta';
import { Modal } from './Modal';
import { Kbd } from './bits';

export interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function ConfirmDialog({ request, onClose }: { request: ConfirmRequest | null; onClose: () => void }) {
  const [shown, setShown] = useState(request);
  useEffect(() => {
    if (request) setShown(request);
  }, [request]);

  return (
    <Modal open={!!request} onClose={onClose} labelledBy="confirm-title" className="dialog dialog--confirm" initialFocus=".btn--danger">
      {shown && (
        <>
          <div className="dialog__icon dialog__icon--danger" aria-hidden>
            <AlertTriangle size={20} />
          </div>
          <h2 id="confirm-title" className="dialog__title">
            {shown.title}
          </h2>
          <p className="dialog__body">{shown.body}</p>
          <div className="dialog__actions">
            <button className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn--danger"
              onClick={() => {
                shown.onConfirm();
                onClose();
              }}
            >
              {shown.confirmLabel}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

export type ProjectDialogState = { mode: 'create'; suggestedColor: ProjectColor } | { mode: 'edit'; project: Project } | null;

export function ProjectDialog({
  state,
  existingNames,
  onClose,
  onSubmit,
}: {
  state: ProjectDialogState;
  existingNames: string[];
  onClose: () => void;
  onSubmit: (name: string, color: ProjectColor) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<ProjectColor>('iris');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!state) return;
    setEditing(state.mode === 'edit');
    setName(state.mode === 'edit' ? state.project.name : '');
    setColor(state.mode === 'edit' ? state.project.color : state.suggestedColor);
    setError(null);
  }, [state]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return setError('Give the project a name.');
    const current = state?.mode === 'edit' ? state.project.name.toLowerCase() : null;
    if (existingNames.some((n) => n.toLowerCase() === clean.toLowerCase() && n.toLowerCase() !== current)) {
      return setError('A project with this name already exists.');
    }
    onSubmit(clean, color);
  };

  return (
    <Modal open={!!state} onClose={onClose} labelledBy="project-title" className="dialog" initialFocus="#project-name">
      <form onSubmit={submit}>
        <h2 id="project-title" className="dialog__title">
          {editing ? 'Rename project' : 'New project'}
        </h2>
        <p className="dialog__body">Projects group related tasks so you can focus on one area at a time.</p>
        <label className="field-label" htmlFor="project-name">
          Name
        </label>
        <input
          id="project-name"
          className={`input${error ? ' has-error' : ''}`}
          value={name}
          maxLength={40}
          placeholder="e.g. Website redesign"
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? 'project-error' : undefined}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
        {error && (
          <p className="field-error" id="project-error" role="alert">
            {error}
          </p>
        )}
        <span className="field-label" id="project-color-label">
          Color
        </span>
        <div className="swatches" role="radiogroup" aria-labelledby="project-color-label">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              className={`swatch dot--${c}`}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            {editing ? 'Save' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const SHORTCUTS: { group: string; items: [string[], string][] }[] = [
  {
    group: 'Tasks',
    items: [
      [['N'], 'Add a task'],
      [['Shift', 'N'], 'New task with all details'],
      [['Enter'], 'Open selected task'],
      [['X'], 'Complete or reopen selected'],
      [['Del'], 'Delete selected task'],
      [['Ctrl', 'Enter'], 'Save in the task panel'],
    ],
  },
  {
    group: 'Navigate',
    items: [
      [['J'], 'Next task'],
      [['K'], 'Previous task'],
      [['1–5'], 'Switch view'],
      [['/'], 'Search'],
      [['B'], 'Switch list and board'],
      [['Esc'], 'Close or clear'],
    ],
  },
  {
    group: 'General',
    items: [
      [['P'], 'New project'],
      [['T'], 'Toggle light and dark'],
      [['?'], 'Show this list'],
    ],
  },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="shortcuts-title" className="dialog dialog--wide">
      <div className="dialog__head">
        <h2 id="shortcuts-title" className="dialog__title">
          Keyboard shortcuts
        </h2>
        <button className="btn btn--ghost btn--sm" onClick={onClose}>
          Done
        </button>
      </div>
      <div className="shortcuts">
        {SHORTCUTS.map((g) => (
          <section key={g.group}>
            <h3 className="shortcuts__group">{g.group}</h3>
            <ul>
              {g.items.map(([keys, label]) => (
                <li key={label}>
                  <span>{label}</span>
                  <span className="shortcuts__keys">
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
