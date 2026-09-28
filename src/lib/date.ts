const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => toISODate(new Date());

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Whole calendar days from `from` to `to`. */
export const daysBetween = (from: string, to: string) =>
  Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000);

/** The coming Saturday, or today if it is already the weekend. */
export function thisWeekend(today: string) {
  const day = parseISODate(today).getDay();
  if (day === 6 || day === 0) return today;
  return addDays(today, 6 - day);
}

/** Monday of next week. */
export function nextWeek(today: string) {
  const day = parseISODate(today).getDay();
  return addDays(today, (8 - day) % 7 || 7);
}

export type DueTone = 'overdue' | 'today' | 'soon' | 'later';

export function describeDue(iso: string, today: string): { label: string; tone: DueTone } {
  const diff = daysBetween(today, iso);
  if (diff === 0) return { label: 'Today', tone: 'today' };
  if (diff === 1) return { label: 'Tomorrow', tone: 'soon' };
  if (diff === -1) return { label: 'Yesterday', tone: 'overdue' };
  const date = parseISODate(iso);
  if (diff > 1 && diff < 7) return { label: date.toLocaleDateString(undefined, { weekday: 'long' }), tone: 'soon' };
  const sameYear = date.getFullYear() === parseISODate(today).getFullYear();
  const label = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return { label, tone: diff < 0 ? 'overdue' : 'later' };
}

export const formatLongDate = (iso: string) =>
  parseISODate(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

export const formatTimestamp = (ms: number) =>
  new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
