import { useEffect, useState, type FormEvent } from 'react';
import { UserPlus, X } from 'lucide-react';
import type { Member, ProjectColor, Team } from '../types';
import { PROJECT_COLORS } from '../lib/meta';
import { uid } from '../lib/id';
import { Modal } from './Modal';
import { Avatar } from './bits';

export type TeamDialogState = { mode: 'create'; suggestedColor: ProjectColor } | { mode: 'edit'; team: Team } | null;

/** Create or edit a team: its name, color and members. */
export function TeamDialog({
  state,
  existingNames,
  assignedCounts,
  onClose,
  onSubmit,
}: {
  state: TeamDialogState;
  existingNames: string[];
  /** Open tasks per member id, so removing someone shows what gets unassigned. */
  assignedCounts: Record<string, number>;
  onClose: () => void;
  onSubmit: (name: string, color: ProjectColor, members: Member[]) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<ProjectColor>('iris');
  const [members, setMembers] = useState<Member[]>([]);
  const [newMember, setNewMember] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!state) return;
    setEditing(state.mode === 'edit');
    setName(state.mode === 'edit' ? state.team.name : '');
    setColor(state.mode === 'edit' ? state.team.color : state.suggestedColor);
    setMembers(state.mode === 'edit' ? state.team.members : []);
    setNewMember('');
    setError(null);
  }, [state]);

  const addMember = () => {
    const clean = newMember.trim();
    if (!clean) return;
    if (members.some((m) => m.name.toLowerCase() === clean.toLowerCase())) {
      setError(`${clean} is already on this team.`);
      return;
    }
    setMembers((ms) => [...ms, { id: uid(), name: clean }]);
    setNewMember('');
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return setError('Give the team a name.');
    const current = state?.mode === 'edit' ? state.team.name.toLowerCase() : null;
    if (existingNames.some((n) => n.toLowerCase() === clean.toLowerCase() && n.toLowerCase() !== current)) {
      return setError('A team with this name already exists.');
    }
    // A name typed but not yet added still counts.
    const pending = newMember.trim();
    const all = pending && !members.some((m) => m.name.toLowerCase() === pending.toLowerCase())
      ? [...members, { id: uid(), name: pending }]
      : members;
    onSubmit(clean, color, all);
  };

  return (
    <Modal open={!!state} onClose={onClose} labelledBy="team-title" className="dialog" initialFocus="#team-name">
      <form onSubmit={submit}>
        <h2 id="team-title" className="dialog__title">
          {editing ? 'Edit team' : 'New team'}
        </h2>
        <p className="dialog__body">Add the people you work with, then assign tasks to anyone on the team.</p>

        <label className="field-label" htmlFor="team-name">
          Team name
        </label>
        <input
          id="team-name"
          className={`input${error && !name.trim() ? ' has-error' : ''}`}
          value={name}
          maxLength={40}
          placeholder="e.g. Marketing"
          autoComplete="off"
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />

        <span className="field-label" id="team-color-label">
          Color
        </span>
        <div className="swatches" role="radiogroup" aria-labelledby="team-color-label">
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

        <label className="field-label" htmlFor="team-member">
          Members <span className="field-label__count">{members.length}</span>
        </label>
        <div className="member-add">
          <input
            id="team-member"
            className="input"
            value={newMember}
            maxLength={40}
            placeholder="Add a person by name"
            autoComplete="off"
            onChange={(e) => {
              setNewMember(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addMember();
              }
            }}
          />
          <button type="button" className="btn btn--secondary" onClick={addMember} disabled={!newMember.trim()}>
            <UserPlus size={15} />
            Add
          </button>
        </div>

        {members.length > 0 ? (
          <ul className="member-list">
            {members.map((m) => {
              const n = assignedCounts[m.id] ?? 0;
              return (
                <li key={m.id} className="member-list__item">
                  <Avatar member={m} />
                  <span className="member-list__name">{m.name}</span>
                  {n > 0 && (
                    <span className="member-list__meta">
                      {n} open {n === 1 ? 'task' : 'tasks'}
                    </span>
                  )}
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm icon-btn--danger"
                    aria-label={`Remove ${m.name}`}
                    title={n > 0 ? `Remove ${m.name}; their tasks become unassigned` : `Remove ${m.name}`}
                    onClick={() => setMembers((ms) => ms.filter((x) => x.id !== m.id))}
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="member-list__empty">No members yet. Add at least one person to start assigning tasks.</p>
        )}

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            {editing ? 'Save team' : 'Create team'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
