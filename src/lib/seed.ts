import type { Project, Task, Team } from '../types';
import { addDays, todayISO } from './date';

export function createSeedTeams(now = Date.now()): Team[] {
  return [
    {
      id: 'team-product',
      name: 'Product',
      color: 'iris',
      createdAt: now - 80 * 3_600_000,
      members: [
        { id: 'm-maya', name: 'Maya Chen' },
        { id: 'm-arjun', name: 'Arjun Mehta' },
        { id: 'm-sofia', name: 'Sofia Rossi' },
      ],
    },
    {
      id: 'team-design',
      name: 'Design',
      color: 'rose',
      createdAt: now - 79 * 3_600_000,
      members: [
        { id: 'm-leo', name: 'Leo Martins' },
        { id: 'm-priya', name: 'Priya Nair' },
      ],
    },
  ];
}

/** Three projects, six tasks and two small teams, dated relative to today so every view has something in it. */
export function createSeed(): { projects: Project[]; tasks: Task[]; teams: Team[] } {
  const today = todayISO();
  const now = Date.now();
  const hour = 3_600_000;

  const projects: Project[] = [
    { id: 'p-launch', name: 'Product Launch', color: 'iris', createdAt: now - 72 * hour },
    { id: 'p-home', name: 'Home & Life', color: 'teal', createdAt: now - 71 * hour },
    { id: 'p-learning', name: 'Learning', color: 'amber', createdAt: now - 70 * hour },
  ];

  const task = (t: Partial<Task> & Pick<Task, 'id' | 'title'>, ageHours: number): Task => ({
    description: '',
    dueDate: null,
    priority: 'medium',
    status: 'todo',
    projectId: null,
    assigneeId: null,
    completedAt: null,
    createdAt: now - ageHours * hour,
    ...t,
  });

  const tasks: Task[] = [
    task(
      {
        id: 't-checklist',
        title: 'Finalize the launch checklist',
        description: 'Confirm owners for each launch step and flag anything still blocked.',
        dueDate: today,
        priority: 'high',
        status: 'in_progress',
        projectId: 'p-launch',
        assigneeId: 'm-maya',
      },
      30,
    ),
    task(
      {
        id: 't-investor',
        title: 'Send the monthly investor update',
        description: 'Metrics, highlights, and the two asks for this month.',
        dueDate: addDays(today, -1),
        priority: 'high',
        projectId: 'p-launch',
        assigneeId: 'm-arjun',
      },
      52,
    ),
    task(
      {
        id: 't-pricing',
        title: 'Review pricing page copy',
        dueDate: addDays(today, 2),
        priority: 'medium',
        projectId: 'p-launch',
        assigneeId: 'm-priya',
      },
      20,
    ),
    task(
      {
        id: 't-dentist',
        title: 'Book a dentist appointment',
        dueDate: addDays(today, -2),
        priority: 'low',
        status: 'completed',
        completedAt: now - 26 * hour,
        projectId: 'p-home',
      },
      60,
    ),
    task(
      {
        id: 't-groceries',
        title: 'Plan meals and groceries for the week',
        description: 'Check the pantry first.',
        dueDate: addDays(today, 4),
        priority: 'low',
        projectId: 'p-home',
      },
      8,
    ),
    task(
      {
        id: 't-course',
        title: 'Finish the TypeScript generics course',
        description: 'Two modules left: conditional types and mapped types.',
        dueDate: addDays(today, 7),
        priority: 'medium',
        status: 'in_progress',
        projectId: 'p-learning',
      },
      40,
    ),
  ];

  return { projects, tasks, teams: createSeedTeams(now) };
}
