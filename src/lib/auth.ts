import { uid } from './id';

/**
 * Browser-only accounts. There is no server, so this keeps each person's data separate on a
 * shared device; it is not a security boundary. Passwords are never stored, only a salted
 * PBKDF2 hash.
 */

interface Account {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

interface Session {
  userId: string;
  createdAt: number;
}

const ACCOUNTS_KEY = 'cadence:accounts';
const SESSION_KEY = 'cadence:session';
const ITERATIONS = 210_000;

export class AuthError extends Error {
  constructor(
    message: string,
    public field: 'name' | 'email' | 'password' | 'form' = 'form',
  ) {
    super(message);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD = 8;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const toUser = (a: Account): User => ({ id: a.id, name: a.name, email: a.email });

function readAccounts(): Account[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));

async function derive(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

/** Compares without exiting early, so timing does not reveal how much of the hash matched. */
function sameHash(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function startSession(userId: string, remember: boolean) {
  const session: Session = { userId, createdAt: Date.now() };
  // "Keep me signed in" survives closing the browser; otherwise the session lasts for this tab.
  (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
  (remember ? sessionStorage : localStorage).removeItem(SESSION_KEY);
}

export async function register(name: string, email: string, password: string, remember: boolean): Promise<{ user: User; first: boolean }> {
  const cleanName = name.trim();
  const cleanEmail = normalizeEmail(email);
  if (!cleanName) throw new AuthError('Enter your name.', 'name');
  if (!EMAIL_RE.test(cleanEmail)) throw new AuthError('Enter a valid email address.', 'email');
  if (password.length < MIN_PASSWORD) throw new AuthError(`Use at least ${MIN_PASSWORD} characters.`, 'password');

  const accounts = readAccounts();
  if (accounts.some((a) => a.email === cleanEmail)) {
    throw new AuthError('An account with this email already exists. Sign in instead.', 'email');
  }

  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const account: Account = {
    id: uid(),
    name: cleanName,
    email: cleanEmail,
    salt,
    hash: await derive(password, salt),
    createdAt: Date.now(),
  };
  writeAccounts([...accounts, account]);
  startSession(account.id, remember);
  return { user: toUser(account), first: accounts.length === 0 };
}

export async function login(email: string, password: string, remember: boolean): Promise<User> {
  const cleanEmail = normalizeEmail(email);
  if (!EMAIL_RE.test(cleanEmail)) throw new AuthError('Enter a valid email address.', 'email');
  if (!password) throw new AuthError('Enter your password.', 'password');

  const account = readAccounts().find((a) => a.email === cleanEmail);
  // Hash even when the account is missing, so both failures take the same time.
  const hash = await derive(password, account?.salt ?? '00'.repeat(16));
  if (!account || !sameHash(hash, account.hash)) {
    throw new AuthError('That email and password do not match.', 'form');
  }
  startSession(account.id, remember);
  return toUser(account);
}

/** The signed-in user from a saved session, or null. Runs synchronously so a refresh never flashes the sign-in page. */
export function restoreSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    const account = readAccounts().find((a) => a.id === session.userId);
    return account ? toUser(account) : null;
  } catch {
    return null;
  }
}

export function endSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}
