import type { Project, Task, Team } from '../types';
import { createSeed, createSeedTeams } from './seed';

/** Data saved before accounts existed; handed to the first account that registers. */
const LEGACY_KEY = 'cadence:data:v1';
const dataKey = (userId: string) => `${LEGACY_KEY}:${userId}`;

export interface PersistedData {
  projects: Project[];
  tasks: Task[];
  teams: Team[];
}

export function loadData(userId: string): PersistedData {
  try {
    const raw = localStorage.getItem(dataKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.projects) && Array.isArray(parsed?.tasks)) {
        // Data saved before teams existed gets the sample teams and unassigned tasks.
        return {
          projects: parsed.projects,
          tasks: parsed.tasks.map((t: Task) => ({ ...t, assigneeId: t.assigneeId ?? null })),
          teams: Array.isArray(parsed.teams) ? parsed.teams : createSeedTeams(),
        };
      }
    }
  } catch {
    // Corrupt or unavailable storage falls through to the seed data.
  }
  return createSeed();
}

export function claimLegacyData(userId: string) {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy && !localStorage.getItem(dataKey(userId))) localStorage.setItem(dataKey(userId), legacy);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Nothing to claim.
  }
}

export function saveData(userId: string, data: PersistedData) {
  try {
    localStorage.setItem(dataKey(userId), JSON.stringify(data));
  } catch {
    // Storage full or blocked (private mode); the app keeps working in memory.
  }
}

export function loadPref<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const v = localStorage.getItem(`cadence:${key}`) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function savePref(key: string, value: string) {
  try {
    localStorage.setItem(`cadence:${key}`, value);
  } catch {
    // Ignore; preferences are a convenience.
  }
}
