import type { ReactNode } from 'react';
import { UserRound } from 'lucide-react';
import type { Member, Priority, Project } from '../types';
import { initials, memberColor } from '../lib/meta';

export function Checkbox({
  checked,
  priority,
  label,
  onChange,
}: {
  checked: boolean;
  priority: Priority;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={`check check--${priority}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
    >
      <svg viewBox="0 0 16 16" aria-hidden>
        <path d="M4.2 8.4l2.6 2.6 5-5.4" />
      </svg>
    </button>
  );
}

/** Three ascending bars; the number filled encodes the priority. */
export function PriorityGlyph({ priority, size = 14 }: { priority: Priority; size?: number }) {
  const level = priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
  return (
    <svg className={`prio prio--${priority}`} width={size} height={size} viewBox="0 0 14 14" aria-hidden>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={1.5 + i * 4} y={9 - i * 3.5} width="3" height={3.5 + i * 3.5} rx="1" data-on={i < level || undefined} />
      ))}
    </svg>
  );
}

export const ProjectDot = ({ project }: { project: Pick<Project, 'color'> | null }) => (
  <span className={`dot dot--${project?.color ?? 'none'}`} aria-hidden />
);

export const Kbd = ({ children }: { children: ReactNode }) => <kbd className="kbd">{children}</kbd>;

export function Avatar({ member, size = 'md' }: { member: Pick<Member, 'id' | 'name'> | null; size?: 'sm' | 'md' | 'lg' }) {
  if (!member) {
    return (
      <span className={`avatar avatar--${size} avatar--empty`} aria-hidden>
        <UserRound size={size === 'sm' ? 11 : 13} />
      </span>
    );
  }
  return (
    <span className={`avatar avatar--${size} dot--${memberColor(member.id)}`} title={member.name} aria-hidden>
      {initials(member.name)}
    </span>
  );
}

export function AvatarStack({ members, max = 3 }: { members: Member[]; max?: number }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <span className="avatar-stack" aria-hidden>
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size="sm" />
      ))}
      {extra > 0 && <span className="avatar avatar--sm avatar--more">+{extra}</span>}
    </span>
  );
}
